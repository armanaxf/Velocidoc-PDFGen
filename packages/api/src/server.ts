import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { generateRoutes } from "./routes/generate.ts";

export const buildServer = async () => {
    const server = Fastify({
        logger: true,
    }).withTypeProvider<ZodTypeProvider>();

    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);

    // Register routes
    await server.register(generateRoutes, { prefix: "/v1" });

    server.get("/health", async () => {
        return { status: "ok", timestamp: new Date().toISOString() };
    });

    return server;
};
