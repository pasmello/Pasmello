import type { RequestHandler } from './host-bridge.js';

const API_BASE = '/api/v1';

/**
 * Creates handlers for tool storage requests.
 * Routes storage operations to the Go backend which persists to ~/.pasmello/
 */
export function createStorageHandlers(workspace: string): Record<string, RequestHandler> {
    return {
        'storage:get': async (toolId, data) => {
            const { key } = data as { key: string };
            const res = await fetch(`${API_BASE}/workspaces/${workspace}/tools/${toolId}/data/${encodeURIComponent(key)}`);
            if (!res.ok) return null;
            const json = await res.json();
            return json.value ?? null;
        },

        'storage:set': async (toolId, data) => {
            const { key, value } = data as { key: string; value: string };
            await fetch(`${API_BASE}/workspaces/${workspace}/tools/${toolId}/data/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value }),
            });
        },

        'storage:delete': async (toolId, data) => {
            const { key } = data as { key: string };
            await fetch(`${API_BASE}/workspaces/${workspace}/tools/${toolId}/data/${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });
        },

        'storage:keys': async (toolId) => {
            const res = await fetch(`${API_BASE}/workspaces/${workspace}/tools/${toolId}/data`);
            if (!res.ok) return [];
            const json = await res.json();
            return json.keys ?? [];
        },
    };
}
