/**
 * Inline template for BYOT (Bring Your Own Template)
 * Allows users to pass template content directly (e.g., from SharePoint)
 */
export interface InlineTemplate {
    content: string;  // Base64-encoded DOCX content
    filename: string; // Original filename for content-type detection
}

/**
 * Universal payload for document generation
 * Supports three modes (provide exactly one):
 * 1. Server-stored template: use `template_id`
 * 2. BYOT (Bring Your Own Template): use `template` object with base64 content
 * 3. Remote template: use `template_url` to fetch from SharePoint/OneDrive/S3/etc.
 */
export interface UniversalPayload {
    template_id?: string;          // Reference to server-stored template
    template?: InlineTemplate;     // Inline template content (BYOT)
    template_url?: string;         // URL to fetch template from (SharePoint, OneDrive, S3, etc.)
    output_format: "pdf" | "docx" | "html";
    data: Record<string, any>;     // The user's JSON data
    options?: {
        header_text?: string;
        watermark?: boolean;
        metadata?: Record<string, string>;
    };
}

/**
 * Template validation request
 */
export interface ValidateTemplateRequest {
    content: string;   // Base64-encoded DOCX content
    data?: Record<string, any>; // Optional: validate against sample data
}

/**
 * Template validation response
 */
export interface ValidateTemplateResponse {
    valid: boolean;
    fields: string[];           // Extracted placeholder fields
    errors?: string[];          // Validation errors if any
    warnings?: string[];        // Non-fatal warnings
}

export interface TemplateDefinition {
    id: string;
    name: string;
    engine: "word" | "html";
    source: string;
    schema_map?: Record<string, {
        type: "image" | "text" | "table";
        width?: number;
        height?: number;
    }>;
}
