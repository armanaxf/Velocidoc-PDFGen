/**
 * TemplateStorage - Abstract interface for template storage backends
 * 
 * Supports multiple backends for self-hosted and SaaS deployments:
 * - Local: File system storage for self-hosted/air-gapped environments
 * - Supabase: Supabase Storage for SaaS multi-tenant deployments
 * - S3: AWS S3 or compatible (R2, MinIO) for enterprise deployments
 */

export interface Template {
    id: string;
    name: string;
    engine: 'word' | 'web';
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TemplateStorage {
    /**
     * List all templates for an organization
     */
    list(orgId: string): Promise<Template[]>;

    /**
     * Get template file buffer
     */
    get(orgId: string, templateId: string): Promise<Buffer>;

    /**
     * Upload a new template
     */
    put(orgId: string, templateId: string, file: Buffer, metadata?: Partial<Template>): Promise<Template>;

    /**
     * Delete a template
     */
    delete(orgId: string, templateId: string): Promise<void>;

    /**
     * Check if a template exists
     */
    exists(orgId: string, templateId: string): Promise<boolean>;
}

export type StorageBackend = 'local' | 'supabase' | 's3' | 'azure';
