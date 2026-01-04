/**
 * DocxService - Template rendering using docx-templates
 * 
 * Renders DOCX templates with JSON data using Handlebars-style syntax
 */

import createReport from "docx-templates";
import { readFile } from "fs/promises";
import { resolve } from "path";

export class DocxService {
    private templatesDir: string;

    constructor(templatesDir?: string) {
        // Use import.meta.dir for Bun to get the directory of this file
        // Then navigate to templates folder relative to src/services/
        this.templatesDir = templatesDir || resolve(import.meta.dir, "../../templates");
    }

    /**
     * Render a DOCX template with the provided data
     * @param templatePath - Path to the template file (relative to templates dir or absolute)
     * @param data - JSON data to inject into the template
     * @returns Promise<Buffer> - The rendered DOCX as a Buffer
     */
    async render(templatePath: string, data: Record<string, any>): Promise<Buffer> {
        // Resolve template path
        const fullPath = templatePath.startsWith("/") || templatePath.includes(":")
            ? templatePath
            : resolve(this.templatesDir, templatePath);

        // Read template file
        const template = await readFile(fullPath);

        // Render the template with data
        const result = await createReport({
            template,
            data,
            cmdDelimiter: ["{{", "}}"],
            noSandbox: true,
            failFast: false,
        });

        return Buffer.from(result);
    }

    /**
     * Render from a template buffer directly (useful when template is uploaded)
     * @param templateBuffer - The template file as a Buffer
     * @param data - JSON data to inject
     * @returns Promise<Buffer> - The rendered DOCX as a Buffer
     */
    async renderFromBuffer(templateBuffer: Buffer, data: Record<string, any>): Promise<Buffer> {
        const result = await createReport({
            template: templateBuffer,
            data,
            cmdDelimiter: ["{{", "}}"],
            noSandbox: true,
            failFast: false,
        });

        return Buffer.from(result);
    }
}

// Export singleton for convenience
export const docxService = new DocxService();
