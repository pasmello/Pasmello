import type { RequestHandler } from './host-bridge.js';
import { storage } from '$lib/storage';

/**
 * Tool HTTP handler. Validates the URL against the tool's network permissions,
 * then issues a direct fetch from the host. CORS is enforced by the browser
 * against the target server (no proxy bypass).
 */
export function createHttpHandler(): RequestHandler {
    return async (toolId, data) => {
        const { url, method, headers, body } = data as {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: string;
        };

        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw new Error('invalid url');
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('only http/https allowed');
        }

        const manifest = await storage.getToolManifest(toolId);
        if (!manifest) throw new Error('tool not found');

        const allowed = manifest.permissions.network.some((p) => matchesPattern(p, url));
        if (!allowed) throw new Error('network request not allowed by tool permissions');

        const res = await fetch(url, {
            method: method ?? 'GET',
            headers,
            body: body ?? undefined,
        });

        const responseBody = await res.text();
        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return {
            status: res.status,
            headers: responseHeaders,
            body: responseBody,
        };
    };
}

function matchesPattern(pattern: string, url: string): boolean {
    if (pattern.endsWith('*')) {
        return url.startsWith(pattern.slice(0, -1));
    }
    return pattern === url;
}
