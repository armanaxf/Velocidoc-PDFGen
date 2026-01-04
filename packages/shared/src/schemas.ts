export interface UniversalPayload {
    template_id: string;
    output_format: "pdf" | "docx" | "html";
    data: Record<string, any>; // The user's JSON data
    options?: {
        header_text?: string;
        watermark?: boolean;
        metadata?: Record<string, string>;
    };
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
