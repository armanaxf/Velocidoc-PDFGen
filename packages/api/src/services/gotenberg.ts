/**
 * GotenbergService - HTTP wrapper for Gotenberg PDF conversion
 * 
 * Uses the LibreOffice convert endpoint to transform DOCX to PDF
 */

const GOTENBERG_URL = process.env.GOTENBERG_URL || "http://gotenberg:3000";

export class GotenbergService {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || GOTENBERG_URL;
    }

    /**
     * Convert a document buffer to PDF using Gotenberg's LibreOffice engine
     * @param buffer - The source document (DOCX) as a Buffer
     * @param filename - Original filename (used for form-data)
     * @returns Promise<Buffer> - The converted PDF as a Buffer
     */
    async convert(buffer: Buffer, filename: string = "document.docx"): Promise<Buffer> {
        const formData = new FormData();

        // Gotenberg expects a file in the 'files' field
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
        formData.append("files", blob, filename);

        const response = await fetch(`${this.baseUrl}/forms/libreoffice/convert`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gotenberg conversion failed: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Health check for Gotenberg service
     */
    async isHealthy(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Export singleton for convenience
export const gotenbergService = new GotenbergService();
