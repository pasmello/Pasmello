import type { Channel } from './channel.js';

/**
 * Provides namespaced key-value storage for tools.
 * All storage operations are proxied through the MessageChannel to the host,
 * which persists data in the tool's data directory.
 */
export class Storage {
    constructor(private channel: Channel) {}

    async get(key: string): Promise<string | null> {
        const result = await this.channel.request('storage:get', { key });
        return result as string | null;
    }

    async set(key: string, value: string): Promise<void> {
        await this.channel.request('storage:set', { key, value });
    }

    async delete(key: string): Promise<void> {
        await this.channel.request('storage:delete', { key });
    }

    async keys(): Promise<string[]> {
        const result = await this.channel.request('storage:keys');
        return result as string[];
    }
}
