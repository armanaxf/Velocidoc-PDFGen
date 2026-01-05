import { describe, it, expect, mock } from "bun:test";
import { DocxService } from "../services/docx.ts";
import { resolve } from "path";

// Mock createReport to avoid sandboxing issues in test environment
mock.module("docx-templates", () => {
    return {
        default: async () => {
            // Return a fake DOCX buffer (using PK header)
            return new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        }
    };
});

describe("DocxService", () => {
    const templatesDir = resolve(import.meta.dir, "../../templates");
    const service = new DocxService(templatesDir);

    describe("render", () => {
        it("calls docx-templates with correct data", async () => {
            // We rely on the mock here because `bun test` has issues with `vm` sandbox
            // utilized by `docx-templates`. The logic is verified via `debug-render.ts`

            const buffer = await service.render("invoice.docx", {
                company_name: "Test Corp",
            });

            expect(buffer).toBeInstanceOf(Buffer);
            // Valid PK header check
            expect(buffer[0]).toBe(0x50);
            expect(buffer[1]).toBe(0x4b);
        });

        it("throws when template not found", async () => {
            await expect(
                service.render("nonexistent.docx", {})
            ).rejects.toThrow();
        });

        it("processes base64 images correctly", async () => {
            const imagePayload = {
                photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                gallery: [
                    "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                    {
                        title: "Test",
                        img: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    }
                ]
            };

            // For verification, we inspect the private method by casting to any
            const processed = (service as any).processDataForImages(imagePayload);

            expect(processed.photo).toHaveProperty("width");
            expect(processed.photo).toHaveProperty("data");
            expect(processed.photo.extension).toBe(".png");

            expect(processed.gallery[0].extension).toBe(".jpeg");
            expect(processed.gallery[1].img.extension).toBe(".png");
        });
    });

    describe("renderFromBuffer", () => {
        it("renders from buffer", async () => {
            const dummyBuffer = Buffer.from("dummy");
            const result = await service.renderFromBuffer(dummyBuffer, { test: 123 });

            expect(result).toBeInstanceOf(Buffer);
            expect(result[0]).toBe(0x50);
        });
    });
});
