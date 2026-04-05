import type { Channel } from './channel.js';

/**
 * Provides proxied HTTP access for sandboxed tools.
 * All requests go: Tool SDK -> MessagePort -> Host -> Go backend proxy -> validates permissions -> makes request.
 * fetch() fails from opaque origin (no allow-same-origin), so this is the only way tools can make HTTP requests.
 */
export class Http {
    constructor(private channel: Channel) {}

    async fetch(url: string, options?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    }): Promise<{
        status: number;
        headers: Record<string, string>;
        body: string;
    }> {
        const result = await this.channel.request('http:fetch', { url, ...options });
        return result as {
            status: number;
            headers: Record<string, string>;
            body: string;
        };
    }
}
