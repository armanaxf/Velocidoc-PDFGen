import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { docxService } from "../services/docx.ts";
import { gotenbergService } from "../services/gotenberg.ts";
import { validateDocx, extractFields } from "../services/template-validator.ts";

// Inline template schema for BYOT (Bring Your Own Template)
const InlineTemplateSchema = z.object({
    content: z.string().min(1, "Template content is required"),
    filename: z.string().min(1, "Filename is required"),
});

// Zod schema matching UniversalPayload interface
// Supports three modes: template_id (server-stored), template (BYOT), or template_url (remote)
const UniversalPayloadSchema = z.object({
    template_id: z.string().optional(),
    template: InlineTemplateSchema.optional(),
    template_url: z.string().url("Invalid URL format").optional(),
    output_format: z.enum(["pdf", "docx", "html"]),
    data: z.record(z.any()),
    options: z.object({
        header_text: z.string().optional(),
        watermark: z.boolean().optional(),
        metadata: z.record(z.string()).optional(),
    }).optional(),
}).refine(
    (data) => data.template_id || data.template || data.template_url,
    { message: "One of template_id, template, or template_url must be provided" }
).refine(
    (data) => {
        const count = [data.template_id, data.template, data.template_url].filter(Boolean).length;
        return count === 1;
    },
    { message: "Provide exactly one of: template_id, template, or template_url" }
);

// Schema for template validation endpoint
const ValidateTemplateSchema = z.object({
    content: z.string().min(1, "Template content is required"),
    data: z.record(z.any()).optional(),
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

        // Determine template mode and name
        const mode = payload.template ? 'BYOT' : payload.template_url ? 'URL' : 'stored';
        const templateName = payload.template?.filename
            || (payload.template_url ? extractFilenameFromUrl(payload.template_url) : payload.template_id!);

        request.log.info({
            template: templateName,
            mode,
            ...(payload.template_url && { url: payload.template_url })
        }, "Received generation request");

        try {
            let renderedDocx: Buffer;
            let templateBuffer: Buffer;

            if (payload.template) {
                // BYOT Mode: Decode base64
                templateBuffer = Buffer.from(payload.template.content, 'base64');
            } else if (payload.template_url) {
                // URL Mode: Fetch template from remote URL
                templateBuffer = await fetchTemplateFromUrl(payload.template_url, request.log);
            } else {
                // Stored template mode: Render from file directly
                renderedDocx = await docxService.render(payload.template_id!, payload.data);
            }

            // For BYOT and URL modes, validate and render from buffer
            if (payload.template || payload.template_url) {
                // Validate it's a valid DOCX before processing
                const validation = await validateDocx(templateBuffer!);
                if (!validation.valid) {
                    return reply.status(400).send({
                        error: "Invalid template file",
                        details: validation.errors?.join(', ') || "Not a valid DOCX file",
                    });
                }

                renderedDocx = await docxService.renderFromBuffer(templateBuffer!, payload.data);
            }

            request.log.info("Template rendered successfully");

            // If output is DOCX, return it directly
            if (payload.output_format === "docx") {
                const outputFilename = templateName.replace(/\.docx$/i, '').replace(/\//g, "_");
                return reply
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    .header("Content-Disposition", `attachment; filename="${outputFilename}.docx"`)
                    .send(renderedDocx);
            }

            // Convert to PDF via Gotenberg
            const pdfBuffer = await gotenbergService.convert(renderedDocx, `${templateName}.docx`);
            request.log.info("PDF conversion completed");

            // Return PDF
            const outputFilename = templateName.replace(/\.docx$/i, '').replace(/\//g, "_");
            return reply
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", `attachment; filename="${outputFilename}.pdf"`)
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
                // Handle invalid base64 or corrupt files
                if (error.message.includes("base64") || error.message.includes("Invalid")) {
                    return reply.status(400).send({
                        error: "Invalid template content",
                        details: error.message,
                    });
                }
                // Handle URL fetch errors
                if (error.message.includes("Failed to fetch template") || error.message.includes("fetch")) {
                    return reply.status(502).send({
                        error: "Failed to fetch template from URL",
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

    /**
     * POST /v1/templates/validate
     *
     * Validates a DOCX template and extracts placeholder fields.
     * Useful for:
     * - Verifying template is valid before using
     * - Discovering required fields for data mapping
     * - Checking for syntax errors in placeholders
     */
    f.post("/templates/validate", {
        schema: {
            body: ValidateTemplateSchema,
        },
    }, async (request, reply) => {
        const { content, data } = request.body;

        try {
            const templateBuffer = Buffer.from(content, 'base64');

            // Validate DOCX structure
            const validation = await validateDocx(templateBuffer);

            if (!validation.valid) {
                return reply.status(200).send({
                    valid: false,
                    fields: [],
                    errors: validation.errors,
                });
            }

            // Extract placeholder fields from template
            const fields = await extractFields(templateBuffer);

            // If sample data provided, check for missing fields
            const warnings: string[] = [];
            if (data) {
                const dataKeys = flattenKeys(data);
                const missingInData = fields.filter(f => !dataKeys.includes(f) && !f.includes('.'));
                if (missingInData.length > 0) {
                    warnings.push(`Template fields not found in sample data: ${missingInData.join(', ')}`);
                }
            }

            return reply.status(200).send({
                valid: true,
                fields,
                warnings: warnings.length > 0 ? warnings : undefined,
            });

        } catch (error) {
            request.log.error({ error }, "Template validation failed");
            return reply.status(200).send({
                valid: false,
                fields: [],
                errors: [error instanceof Error ? error.message : "Unknown validation error"],
            });
        }
    });

    f.get("/templates", async (request, reply) => {
        // TODO: Extract orgId from auth header (X-API-Key -> lookup)
        // For now, use 'default' for self-hosted single-tenant mode
        const orgId = 'default';

        try {
            const { getStorage } = await import('../storage/index.ts');
            const storage = getStorage();
            const templates = await storage.list(orgId);

            return reply.status(200).send(templates.map(t => ({
                id: t.id,
                name: t.name,
                required_fields: [] // TODO: Parse template to extract fields
            })));
        } catch (error) {
            request.log.error({ error }, "Failed to list templates");
            return reply.status(500).send({ error: "Failed to list templates" });
        }
    });
};

/**
 * Flatten object keys for field comparison
 * { a: { b: 1 }, c: [{ d: 2 }] } => ['a', 'a.b', 'c', 'c.d']
 */
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...flattenKeys(value, fullKey));
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            keys.push(...flattenKeys(value[0], fullKey));
        }
    }
    return keys;
}

/**
 * Extract filename from URL, handling various URL formats
 * - SharePoint: .../Documents/invoice.docx?share=...
 * - OneDrive: .../download.aspx?file=invoice.docx
 * - S3: .../bucket/path/invoice.docx?X-Amz-...
 * - Direct: .../invoice.docx
 */
function extractFilenameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Try to extract filename from pathname
        const pathParts = pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];

        // Check if last part looks like a filename
        if (lastPart && lastPart.includes('.')) {
            // Decode URI component and remove any query-like suffixes
            return decodeURIComponent(lastPart.split('?')[0]);
        }

        // Check query params for file parameter (OneDrive style)
        const fileParam = urlObj.searchParams.get('file') || urlObj.searchParams.get('filename');
        if (fileParam) {
            return decodeURIComponent(fileParam);
        }

        // Fallback to generic name
        return 'template.docx';
    } catch {
        return 'template.docx';
    }
}

/**
 * Fetch template from a remote URL
 * Supports: SharePoint sharing links, OneDrive, S3 pre-signed URLs, public URLs
 */
async function fetchTemplateFromUrl(url: string, log: any): Promise<Buffer> {
    const TIMEOUT_MS = 30000; // 30 second timeout
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB max template size

    log.info({ url }, "Fetching template from URL");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/octet-stream, */*',
                'User-Agent': 'Velocidoc-PDFGen/1.0',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch template: HTTP ${response.status} ${response.statusText}`);
        }

        // Check content length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            throw new Error(`Template file too large: ${contentLength} bytes (max ${MAX_SIZE})`);
        }

        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength > MAX_SIZE) {
            throw new Error(`Template file too large: ${arrayBuffer.byteLength} bytes (max ${MAX_SIZE})`);
        }

        log.info({ size: arrayBuffer.byteLength }, "Template fetched successfully");

        return Buffer.from(arrayBuffer);

    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error(`Failed to fetch template: Request timed out after ${TIMEOUT_MS}ms`);
            }
            throw new Error(`Failed to fetch template from URL: ${error.message}`);
        }
        throw new Error(`Failed to fetch template from URL: ${String(error)}`);
    }
}
