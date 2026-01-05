/**
 * LocalFileStorage - File system based storage for self-hosted deployments
 * 
 * Templates are stored in a local directory with optional org-based subdirectories.
 * For single-tenant self-hosted mode, use orgId = 'default'.
 */

import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { Template, TemplateStorage } from './types';

export class LocalFileStorage implements TemplateStorage {
    private baseDir: string;
    private multiTenant: boolean;

    constructor(baseDir: string, multiTenant: boolean = false) {
        this.baseDir = baseDir;
        this.multiTenant = multiTenant;
    }

    private getOrgDir(orgId: string): string {
        if (this.multiTenant) {
            return join(this.baseDir, orgId);
        }
        // Single-tenant mode: all templates in root
        return this.baseDir;
    }

    async list(orgId: string): Promise<Template[]> {
        const dir = this.getOrgDir(orgId);

        try {
            const files = await readdir(dir);
            const templates: Template[] = [];

            for (const file of files) {
                if (extname(file) === '.docx') {
                    const filePath = join(dir, file);
                    const stats = await stat(filePath);

                    templates.push({
                        id: file,
                        name: basename(file, '.docx'),
                        engine: 'word',
                        source: file,
                        createdAt: stats.birthtime,
                        updatedAt: stats.mtime,
                    });
                }
            }

            return templates;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async get(orgId: string, templateId: string): Promise<Buffer> {
        const filePath = join(this.getOrgDir(orgId), templateId);
        return readFile(filePath);
    }

    async put(orgId: string, templateId: string, file: Buffer, metadata?: Partial<Template>): Promise<Template> {
        const dir = this.getOrgDir(orgId);

        // Ensure directory exists
        await mkdir(dir, { recursive: true });

        const filePath = join(dir, templateId);
        await writeFile(filePath, file);

        const stats = await stat(filePath);

        return {
            id: templateId,
            name: metadata?.name || basename(templateId, '.docx'),
            engine: metadata?.engine || 'word',
            source: templateId,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
        };
    }

    async delete(orgId: string, templateId: string): Promise<void> {
        const filePath = join(this.getOrgDir(orgId), templateId);
        await unlink(filePath);
    }

    async exists(orgId: string, templateId: string): Promise<boolean> {
        const filePath = join(this.getOrgDir(orgId), templateId);
        try {
            await stat(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
