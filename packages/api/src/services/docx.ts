/**
 * DocxService - Template rendering using docx-templates
 * 
 * Renders DOCX templates with JSON data using Handlebars-style syntax
 */

import * as docxTemplates from "docx-templates";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DocxService {
    private templatesDir: string;
    private createReport: any;

    constructor(templatesDir?: string) {
        // Use Node-compatible path resolution
        this.templatesDir = templatesDir || resolve(__dirname, "../../templates");

        // Handle CJS/ESM interop for docx-templates
        // The library may export as default.default, default.createReport, or createReport
        const mod = docxTemplates as any;
        if (typeof mod.default === 'function') {
            this.createReport = mod.default;
        } else if (mod.default && typeof mod.default.default === 'function') {
            this.createReport = mod.default.default;
        } else if (mod.default && typeof mod.default.createReport === 'function') {
            this.createReport = mod.default.createReport;
        } else if (typeof mod.createReport === 'function') {
            this.createReport = mod.createReport;
        } else {
            // Fallback - try to use the module itself
            this.createReport = mod;
        }
    }

    /**
     * Recursive function to detect Base64 image strings and convert them
     * to docx-templates compatible Image objects.
     */
    private processDataForImages(data: any): any {
        if (!data) return data;

        // specific check for base64 data URI
        if (typeof data === "string") {
            // Regex matches: data:image/png;base64,.....
            const match = data.match(/^data:image\/(png|jpg|jpeg);base64,(.*)$/);
            if (match) {
                const extension = `.${match[1]}`;
                const base64Data = match[2];
                return {
                    width: 6, // Default to 6cm, can be adjusted or made configurable later
                    height: 6,
                    data: base64Data,
                    extension: extension,
                };
            }
            return data;
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.processDataForImages(item));
        }

        // Fix for Issue #3: Preserve Date and Buffer objects
        if (data instanceof Date || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
            return data;
        }

        if (typeof data === "object") {
            const newData: any = {};
            for (const key in data) {
                newData[key] = this.processDataForImages(data[key]);
            }
            return newData;
        }

        return data;
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

        // Pre-process data to handle images
        const processedData = this.processDataForImages(data);

        // Render the template with data
        const result = await this.createReport({
            template,
            data: processedData,
            cmdDelimiter: ["{{", "}}"],
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
        // Pre-process data to handle images
        const processedData = this.processDataForImages(data);

        const result = await this.createReport({
            template: templateBuffer,
            data: processedData,
            cmdDelimiter: ["{{", "}}"],
            failFast: false,
        });

        return Buffer.from(result);
    }
}

// Export singleton for convenience
export const docxService = new DocxService();
