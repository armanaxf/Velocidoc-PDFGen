/**
 * Template Validator Service
 *
 * Validates DOCX templates and extracts placeholder fields.
 * Used for:
 * - Pre-flight validation before generation
 * - Field discovery for data mapping UI
 * - Syntax error detection
 */

import JSZip from "jszip";

interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

/**
 * Validates that a buffer contains a valid DOCX file.
 * DOCX files are ZIP archives containing specific XML files.
 */
export async function validateDocx(buffer: Buffer): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check ZIP magic bytes (PK = 0x50 0x4B)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        return {
            valid: false,
            errors: ["File is not a valid ZIP archive (missing PK signature)"],
        };
    }

    try {
        const zip = await JSZip.loadAsync(buffer);

        // Check for required DOCX components
        const requiredFiles = [
            "[Content_Types].xml",
            "word/document.xml",
        ];

        for (const file of requiredFiles) {
            if (!zip.file(file)) {
                errors.push(`Missing required file: ${file}`);
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };

    } catch (error) {
        return {
            valid: false,
            errors: [`Failed to parse ZIP archive: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

/**
 * Extracts placeholder fields from a DOCX template.
 * Looks for patterns like {{fieldName}}, {{FOR items}}, {{IMAGE photo}}, etc.
 */
export async function extractFields(buffer: Buffer): Promise<string[]> {
    const fields = new Set<string>();

    try {
        const zip = await JSZip.loadAsync(buffer);

        // Read all XML files that might contain placeholders
        const xmlFiles = [
            "word/document.xml",
            "word/header1.xml",
            "word/header2.xml",
            "word/header3.xml",
            "word/footer1.xml",
            "word/footer2.xml",
            "word/footer3.xml",
        ];

        for (const xmlPath of xmlFiles) {
            const file = zip.file(xmlPath);
            if (file) {
                const content = await file.async("text");
                extractFieldsFromXml(content, fields);
            }
        }

        return Array.from(fields).sort();

    } catch (error) {
        console.error("Failed to extract fields:", error);
        return [];
    }
}

/**
 * Extract fields from XML content using regex patterns.
 * Handles docx-templates syntax: {{field}}, {{FOR x}}, {{IMAGE x}}, etc.
 */
function extractFieldsFromXml(xml: string, fields: Set<string>): void {
    // Remove XML tags to get just the text content
    // This handles cases where placeholders are split across XML elements
    const textContent = xml
        .replace(/<[^>]+>/g, "")  // Remove XML tags
        .replace(/&lt;/g, "<")     // Decode entities
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

    // Pattern for simple field references: {{fieldName}} or {{object.property}}
    const simpleFieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;
    let match;
    while ((match = simpleFieldRegex.exec(textContent)) !== null) {
        const field = match[1];
        // Skip control keywords
        if (!isControlKeyword(field)) {
            fields.add(field);
        }
    }

    // Pattern for FOR loops: {{FOR item}} or {{FOR item IN collection}}
    const forLoopRegex = /\{\{FOR\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+IN\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*))?\}\}/gi;
    while ((match = forLoopRegex.exec(textContent)) !== null) {
        if (match[2]) {
            // FOR item IN collection - collection is the field
            fields.add(match[2]);
        } else {
            // FOR items - items is the field (implicit)
            fields.add(match[1]);
        }
    }

    // Pattern for IMAGE: {{IMAGE fieldName}}
    const imageRegex = /\{\{IMAGE\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/gi;
    while ((match = imageRegex.exec(textContent)) !== null) {
        fields.add(match[1]);
    }

    // Pattern for IF conditionals: {{IF condition}}
    const ifRegex = /\{\{IF\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/gi;
    while ((match = ifRegex.exec(textContent)) !== null) {
        fields.add(match[1]);
    }

    // Also check the raw XML for placeholders that might be split
    // across multiple XML elements (Word sometimes does this)
    const rawFieldRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;
    while ((match = rawFieldRegex.exec(xml)) !== null) {
        const field = match[1].trim();
        if (!isControlKeyword(field)) {
            fields.add(field);
        }
    }
}

/**
 * Check if a string is a control keyword (not a data field)
 */
function isControlKeyword(str: string): boolean {
    const keywords = [
        "END-FOR", "END-IF", "ENDFOR", "ENDIF",
        "FOR", "IF", "ELSE", "IMAGE", "LINK", "HTML",
        "this", "$idx", "$index"
    ];
    return keywords.includes(str.toUpperCase()) || keywords.includes(str);
}
