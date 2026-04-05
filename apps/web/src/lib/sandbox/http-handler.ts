import type { RequestHandler } from './host-bridge.js';

const API_BASE = '/api/v1';

/**
 * Creates a handler for tool HTTP requests.
 * All tool network requests are proxied through the Go backend,
 * which validates them against the tool's permission allowlist.
 */
export function createHttpHandler(): RequestHandler {
    return async (toolId, data) => {
        const { url, method, headers, body } = data as {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: string;
        };

        const res = await fetch(`${API_BASE}/proxy/${toolId}/${encodeURIComponent(url)}`, {
            method: method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: body ? JSON.stringify({ body }) : undefined,
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
