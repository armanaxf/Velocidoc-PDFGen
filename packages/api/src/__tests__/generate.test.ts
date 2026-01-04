import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { buildServer } from "../server.ts";
import type { FastifyInstance } from "fastify";

describe("API Routes", () => {
    let server: FastifyInstance;

    beforeAll(async () => {
        server = await buildServer();
    });

    afterAll(async () => {
        await server.close();
    });

    describe("GET /health", () => {
        it("returns ok status", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/health",
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.status).toBe("ok");
            expect(body.timestamp).toBeDefined();
        });
    });

    describe("POST /v1/generate", () => {
        it("returns 400 when template_id is missing", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    // Missing template_id
                    output_format: "pdf",
                    data: {},
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when output_format is invalid", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_id: "test.docx",
                    output_format: "invalid",
                    data: {},
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when data is missing", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_id: "test.docx",
                    output_format: "pdf",
                    // Missing data
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 404 when template does not exist", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_id: "nonexistent.docx",
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(404);
            const body = response.json();
            expect(body.error).toBe("Template not found");
        });
    });

    describe("GET /v1/templates", () => {
        it("returns empty array", async () => {
            const response = await server.inject({
                method: "GET",
                url: "/v1/templates",
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual([]);
        });
    });
});
