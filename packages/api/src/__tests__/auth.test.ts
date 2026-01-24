import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import { registerAuth } from "../middleware/auth.ts";

// Test auth middleware in isolation
describe("API Key Authentication", () => {
    describe("when auth is enabled", () => {
        let server: ReturnType<typeof Fastify>;

        beforeAll(async () => {
            // Set up env before creating server
            process.env.AUTH_ENABLED = 'true';
            process.env.API_KEYS = 'test-key-123,test-key-456';

            server = Fastify({ logger: false });
            await registerAuth(server);

            // Add test routes
            server.get('/health', async () => ({ status: 'ok' }));
            server.get('/api/test', async () => ({ message: 'success' }));

            await server.ready();
        });

        afterAll(async () => {
            await server.close();
        });

        it("returns 401 when no API key provided", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/api/test",
            });

            expect(response.statusCode).toBe(401);
            const body = response.json();
            expect(body.error).toBe("Unauthorized");
            expect(body.message).toContain("Missing");
        });

        it("returns 401 when invalid API key provided", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/api/test",
                headers: {
                    "X-API-Key": "invalid-key",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = response.json();
            expect(body.error).toBe("Unauthorized");
            expect(body.message).toContain("Invalid");
        });

        it("allows request with valid API key", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/api/test",
                headers: {
                    "X-API-Key": "test-key-123",
                },
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.message).toBe("success");
        });

        it("allows health check without API key", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/health",
            });

            expect(response.statusCode).toBe(200);
        });

        it("allows OPTIONS requests without API key (CORS preflight)", async () => {
            const response = await server.inject({
                method: "OPTIONS",
                url: "/api/test",
            });

            // OPTIONS should not return 401
            expect(response.statusCode).not.toBe(401);
        });
    });

    describe("when auth is disabled", () => {
        let server: ReturnType<typeof Fastify>;

        beforeAll(async () => {
            process.env.AUTH_ENABLED = 'false';

            server = Fastify({ logger: false });
            await registerAuth(server);

            server.get('/api/test', async () => ({ message: 'success' }));

            await server.ready();
        });

        afterAll(async () => {
            await server.close();
        });

        it("allows requests without API key", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/api/test",
            });

            expect(response.statusCode).toBe(200);
        });
    });
});
