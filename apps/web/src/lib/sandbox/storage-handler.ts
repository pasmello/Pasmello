import type { RequestHandler } from './host-bridge.js';
import { storage } from '$lib/storage';

/**
 * Storage handlers route tool-side requests directly to OPFS via the
 * shared Storage adapter — no HTTP, no server.
 */
export function createStorageHandlers(workspace: string): Record<string, RequestHandler> {
    return {
        'storage:get': async (toolId, data) => {
            const { key } = data as { key: string };
            return storage.getToolData(workspace, toolId, key);
        },

        'storage:set': async (toolId, data) => {
            const { key, value } = data as { key: string; value: string };
            await storage.setToolData(workspace, toolId, key, value);
        },

        'storage:delete': async (toolId, data) => {
            const { key } = data as { key: string };
            await storage.deleteToolData(workspace, toolId, key);
        },

        'storage:keys': async (toolId) => {
            return storage.listToolDataKeys(workspace, toolId);
        },
    };
}
