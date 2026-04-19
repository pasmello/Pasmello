import type { NodeHandler } from './index.js';

export const httpRequest: NodeHandler = async (config, runtime) => {
    const { url, method, headers, body } = config as {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    };
    if (!url) throw new Error('http-request: missing url');

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`http-request: invalid url ${url}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('http-request: only http/https allowed');
    }

    const res = await fetch(url, {
        method: method ?? 'GET',
        headers,
        body: body ?? undefined,
        signal: runtime.signal,
    });

    let responseBody: unknown = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        try { responseBody = JSON.parse(responseBody as string); } catch { /* keep text */ }
    }

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => { responseHeaders[key] = value; });

    return {
        status: res.status,
        ok: res.ok,
        headers: responseHeaders,
        body: responseBody,
    };
};
