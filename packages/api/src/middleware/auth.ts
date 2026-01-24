/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header against configured keys.
 * Supports multiple tenants with different API keys.
 *
 * Configuration via environment variables:
 * - API_KEYS: Comma-separated list of valid API keys (e.g., "key1,key2,key3")
 * - API_KEY_HEADER: Header name (default: "X-API-Key")
 * - AUTH_ENABLED: Set to "false" to disable auth (default: "true" in production)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface AuthConfig {
    enabled: boolean;
    apiKeys: Set<string>;
    headerName: string;
}

/**
 * Load auth configuration from environment
 */
export function loadAuthConfig(): AuthConfig {
    const enabled = process.env.AUTH_ENABLED !== 'false';
    const apiKeysEnv = process.env.API_KEYS || '';
    const apiKeys = new Set(
        apiKeysEnv.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0)
    );
    const headerName = process.env.API_KEY_HEADER || 'X-API-Key';

    return { enabled, apiKeys, headerName };
}

/**
 * Extract tenant ID from API key
 * For now, just returns the key itself as the tenant ID
 * In production, you'd lookup the key in a database
 */
export function getTenantFromKey(apiKey: string): string {
    // Simple implementation: hash the key to get a tenant ID
    // In production, lookup in database
    return apiKey.substring(0, 8);
}

/**
 * Register API key authentication hook
 */
export async function registerAuth(server: FastifyInstance) {
    const config = loadAuthConfig();

    // Skip auth in test environment or if explicitly disabled
    if (!config.enabled) {
        server.log.warn("API key authentication is DISABLED");
        return;
    }

    if (config.apiKeys.size === 0) {
        server.log.warn("No API keys configured. Set API_KEYS environment variable.");
    }

    // Add request decorator for tenant ID
    server.decorateRequest('tenantId', null);

    // Pre-handler hook for authentication
    server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
        // Skip auth for health check
        if (request.url === '/health') {
            return undefined;
        }

        // Skip auth for OPTIONS (CORS preflight)
        if (request.method === 'OPTIONS') {
            return undefined;
        }

        const apiKey = request.headers[config.headerName.toLowerCase()] as string | undefined;

        if (!apiKey) {
            reply.status(401).send({
                error: 'Unauthorized',
                message: `Missing ${config.headerName} header`,
            });
            return reply;
        }

        if (!config.apiKeys.has(apiKey)) {
            request.log.warn({ apiKey: apiKey.substring(0, 4) + '...' }, 'Invalid API key');
            reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid API key',
            });
            return reply;
        }

        // Set tenant ID on request
        (request as any).tenantId = getTenantFromKey(apiKey);
        request.log.info({ tenantId: (request as any).tenantId }, 'Authenticated request');
    });

    server.log.info({
        headerName: config.headerName,
        keyCount: config.apiKeys.size,
    }, 'API key authentication enabled');
}
