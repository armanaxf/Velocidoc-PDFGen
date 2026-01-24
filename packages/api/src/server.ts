import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { generateRoutes } from "./routes/generate.ts";

export const buildServer = async () => {
    const server = Fastify({
        logger: true,
    }).withTypeProvider<ZodTypeProvider>();

    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);

    // Security headers (OWASP recommended)
    await server.register(helmet, {
        contentSecurityPolicy: false, // Disable CSP for API (no HTML responses)
    });

    // CORS configuration
    await server.register(cors, {
        origin: process.env.CORS_ORIGIN?.split(',') || true, // Allow all origins by default, or specify via env
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    });

    // Rate limiting
    await server.register(rateLimit, {
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
        errorResponseBuilder: (request, context) => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. You have made ${context.max} requests in ${context.after}. Please try again later.`,
            retryAfter: context.after,
        }),
    });

    // Register routes
    await server.register(generateRoutes, { prefix: "/v1" });

    server.get("/health", async () => {
        return { status: "ok", timestamp: new Date().toISOString() };
    });

    return server;
};
