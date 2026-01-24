import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { buildServer } from "../server.ts";
import type { FastifyInstance } from "fastify";

// Disable auth for tests
process.env.AUTH_ENABLED = 'false';

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

    describe("POST /v1/generate - BYOT mode", () => {
        it("returns 400 when neither template_id nor template provided", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when both template_id and template provided", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_id: "test.docx",
                    template: {
                        content: "dGVzdA==",  // "test" in base64
                        filename: "test.docx",
                    },
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when template content is invalid (not a DOCX)", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template: {
                        content: "dGVzdA==",  // "test" in base64 - not a valid DOCX
                        filename: "test.docx",
                    },
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
            const body = response.json();
            expect(body.error).toBe("Invalid template file");
        });

        it("returns 400 when template.filename is missing", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template: {
                        content: "dGVzdA==",
                    },
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("POST /v1/templates/validate", () => {
        it("returns invalid for non-DOCX content", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/templates/validate",
                payload: {
                    content: "dGVzdA==",  // "test" in base64 - not a valid DOCX
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.valid).toBe(false);
            expect(body.errors).toBeDefined();
            expect(body.errors.length).toBeGreaterThan(0);
        });

        it("returns 400 when content is missing", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/templates/validate",
                payload: {},
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("POST /v1/generate - template_url mode", () => {
        it("returns 400 when template_url is invalid URL format", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_url: "not-a-valid-url",
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when multiple template sources provided (template_id + template_url)", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_id: "test.docx",
                    template_url: "https://example.com/template.docx",
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 400 when multiple template sources provided (template + template_url)", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template: {
                        content: "dGVzdA==",
                        filename: "test.docx",
                    },
                    template_url: "https://example.com/template.docx",
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            expect(response.statusCode).toBe(400);
        });

        it("returns 502 when template_url fetch fails (unreachable URL)", async () => {
            const response = await server.inject({
                method: "POST",
                url: "/v1/generate",
                payload: {
                    template_url: "https://nonexistent-domain-12345.invalid/template.docx",
                    output_format: "pdf",
                    data: { name: "Test" },
                },
                headers: { "Content-Type": "application/json" },
            });

            // Should fail with 502 (Bad Gateway) for fetch failures
            expect(response.statusCode).toBe(502);
            const body = response.json();
            expect(body.error).toContain("fetch");
        });
    });
});
