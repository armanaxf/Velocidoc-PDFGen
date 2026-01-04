import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { docxService } from "../services/docx.ts";
import { gotenbergService } from "../services/gotenberg.ts";

// Zod schema matching UniversalPayload interface
const UniversalPayloadSchema = z.object({
    template_id: z.string(),
    output_format: z.enum(["pdf", "docx", "html"]),
    data: z.record(z.any()),
    options: z.object({
        header_text: z.string().optional(),
        watermark: z.boolean().optional(),
        metadata: z.record(z.string()).optional(),
    }).optional(),
});

export const generateRoutes = async (fastify: FastifyInstance) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    /**
     * POST /v1/generate
     * 
     * Flow: 
     * 1. Receive payload with template_id and data
     * 2. Render DOCX template with data using DocxService
     * 3. Convert rendered DOCX to PDF using GotenbergService
     * 4. Return PDF binary stream
     */
    f.post("/generate", {
        schema: {
            body: UniversalPayloadSchema,
        },
    }, async (request, reply) => {
        const payload = request.body;

        request.log.info({ template_id: payload.template_id }, "Received generation request");

        try {
            // Step 1: Render the DOCX template with user data
            const renderedDocx = await docxService.render(payload.template_id, payload.data);
            request.log.info("Template rendered successfully");

            // Step 2: If output is DOCX, return it directly
            if (payload.output_format === "docx") {
                return reply
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    .header("Content-Disposition", `attachment; filename="${payload.template_id.replace(/\//g, "_")}.docx"`)
                    .send(renderedDocx);
            }

            // Step 3: Convert to PDF via Gotenberg
            const pdfBuffer = await gotenbergService.convert(renderedDocx, `${payload.template_id}.docx`);
            request.log.info("PDF conversion completed");

            // Step 4: Return PDF
            return reply
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", `attachment; filename="${payload.template_id.replace(/\//g, "_")}.pdf"`)
                .send(pdfBuffer);

        } catch (error) {
            request.log.error({ error }, "Generation failed");

            if (error instanceof Error) {
                // Check for common errors
                if (error.message.includes("ENOENT") || error.message.includes("no such file")) {
                    return reply.status(404).send({
                        error: "Template not found",
                        template_id: payload.template_id,
                    });
                }
                if (error.message.includes("Gotenberg")) {
                    return reply.status(502).send({
                        error: "PDF conversion service unavailable",
                        details: error.message,
                    });
                }
            }

            return reply.status(500).send({
                error: "Internal server error during document generation",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });

    f.post("/templates", async (request, reply) => {
        return reply.status(501).send({ message: "Not implemented" });
    });

    f.get("/templates", async (request, reply) => {
        return reply.status(200).send([]);
    });
};
