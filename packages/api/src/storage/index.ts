/**
 * Storage Factory - Creates the appropriate storage backend based on configuration
 */

import { TemplateStorage, StorageBackend } from './types';
import { LocalFileStorage } from './local';

// Re-export types
export * from './types';
export { LocalFileStorage } from './local';

interface StorageConfig {
    backend: StorageBackend;
    // Local storage options
    templatesDir?: string;
    multiTenant?: boolean;
    // Supabase options (for future implementation)
    supabaseUrl?: string;
    supabaseKey?: string;
    // S3 options (for future implementation)
    s3Bucket?: string;
    s3Region?: string;
}

/**
 * Create a storage instance based on environment configuration
 */
export function createStorage(config?: Partial<StorageConfig>): TemplateStorage {
    const backend = config?.backend || (process.env.STORAGE_BACKEND as StorageBackend) || 'local';

    switch (backend) {
        case 'local':
            const templatesDir = config?.templatesDir || process.env.TEMPLATES_DIR || './templates';
            const multiTenant = config?.multiTenant || process.env.MULTI_TENANT === 'true';
            return new LocalFileStorage(templatesDir, multiTenant);

        case 'supabase':
            // TODO: Implement SupabaseStorage
            throw new Error('Supabase storage not yet implemented. Use STORAGE_BACKEND=local for now.');

        case 's3':
            // TODO: Implement S3Storage
            throw new Error('S3 storage not yet implemented. Use STORAGE_BACKEND=local for now.');

        case 'azure':
            // TODO: Implement AzureStorage
            throw new Error('Azure storage not yet implemented. Use STORAGE_BACKEND=local for now.');

        default:
            throw new Error(`Unknown storage backend: ${backend}`);
    }
}

// Default storage instance (created lazily)
let defaultStorage: TemplateStorage | null = null;

export function getStorage(): TemplateStorage {
    if (!defaultStorage) {
        defaultStorage = createStorage();
    }
    return defaultStorage;
}
