import { describe, it, expect } from "bun:test";
import { validateDocx, extractFields } from "../services/template-validator.ts";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Template Validator", () => {
    describe("validateDocx", () => {
        it("rejects non-ZIP files", async () => {
            const buffer = Buffer.from("This is not a DOCX file");
            const result = await validateDocx(buffer);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors![0]).toContain("not a valid ZIP");
        });

        it("rejects empty buffer", async () => {
            const buffer = Buffer.alloc(0);
            const result = await validateDocx(buffer);

            expect(result.valid).toBe(false);
        });

        it("accepts valid DOCX file", async () => {
            // Read the actual invoice template
            const templatePath = resolve(__dirname, "../../templates/invoice.docx");
            const buffer = await readFile(templatePath);
            const result = await validateDocx(buffer);

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it("rejects ZIP without required DOCX structure", async () => {
            // Create a minimal ZIP that isn't a DOCX
            // PK header but missing required files
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            zip.file("random.txt", "hello");
            const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));

            const result = await validateDocx(buffer);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.some(e => e.includes("[Content_Types].xml"))).toBe(true);
        });
    });

    describe("extractFields", () => {
        it("extracts fields from valid DOCX", async () => {
            // Read the actual invoice template
            const templatePath = resolve(__dirname, "../../templates/invoice.docx");
            const buffer = await readFile(templatePath);
            const fields = await extractFields(buffer);

            expect(Array.isArray(fields)).toBe(true);
            // The invoice template should have some fields
            expect(fields.length).toBeGreaterThan(0);
        });

        it("returns empty array for invalid file", async () => {
            const buffer = Buffer.from("not a docx");
            const fields = await extractFields(buffer);

            expect(Array.isArray(fields)).toBe(true);
            expect(fields.length).toBe(0);
        });

        it("extracts simple field references", async () => {
            // Create a simple DOCX with known fields
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();

            // Minimal DOCX structure
            zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                    <Default Extension="xml" ContentType="application/xml"/>
                    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                </Types>`);

            zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:body>
                        <w:p><w:r><w:t>Hello {{customer_name}}</w:t></w:r></w:p>
                        <w:p><w:r><w:t>{{FOR items}}</w:t></w:r></w:p>
                        <w:p><w:r><w:t>- {{this.description}}: {{this.price}}</w:t></w:r></w:p>
                        <w:p><w:r><w:t>{{END-FOR}}</w:t></w:r></w:p>
                        <w:p><w:r><w:t>{{IMAGE signature}}</w:t></w:r></w:p>
                    </w:body>
                </w:document>`);

            const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
            const fields = await extractFields(buffer);

            expect(fields).toContain("customer_name");
            expect(fields).toContain("items");
            expect(fields).toContain("signature");
            // Control keywords should not be included
            expect(fields).not.toContain("FOR");
            expect(fields).not.toContain("END-FOR");
        });

        it("extracts nested field references", async () => {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();

            zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                    <Default Extension="xml" ContentType="application/xml"/>
                    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                </Types>`);

            zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:body>
                        <w:p><w:r><w:t>{{company.name}}</w:t></w:r></w:p>
                        <w:p><w:r><w:t>{{company.address.city}}</w:t></w:r></w:p>
                    </w:body>
                </w:document>`);

            const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
            const fields = await extractFields(buffer);

            expect(fields).toContain("company.name");
            expect(fields).toContain("company.address.city");
        });
    });
});
