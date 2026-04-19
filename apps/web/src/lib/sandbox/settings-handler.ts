import type { RequestHandler } from './host-bridge.js';
import { storage } from '$lib/storage';
import { pluginSettings } from '$lib/state/plugin-settings.svelte';

/**
 * Settings handlers expose per-tool, per-workspace settings to tools.
 * Keys are validated against the tool's declared `ToolManifest.settings`;
 * anything undeclared is silently ignored on `set` and returns `undefined`
 * on `get`.
 */
export function createSettingsHandlers(): Record<string, RequestHandler> {
    return {
        'settings:get': async (toolId, data) => {
            const { key } = (data ?? {}) as { key?: string };
            const manifest = await storage.getToolManifest(toolId);
            const defs = manifest?.settings ?? [];
            if (key === undefined) {
                const out: Record<string, unknown> = {};
                for (const def of defs) {
                    const stored = pluginSettings.getToolSetting(toolId, def.key);
                    out[def.key] = stored ?? def.default;
                }
                return out;
            }
            const def = defs.find((d) => d.key === key);
            if (!def) return undefined;
            const stored = pluginSettings.getToolSetting(toolId, key);
            return stored ?? def.default;
        },

        'settings:set': async (toolId, data) => {
            const { key, value } = (data ?? {}) as { key?: string; value?: unknown };
            if (typeof key !== 'string') return false;
            const manifest = await storage.getToolManifest(toolId);
            const def = manifest?.settings?.find((d) => d.key === key);
            if (!def) return false;
            pluginSettings.setToolSetting(toolId, key, value);
            return true;
        },
    };
}
