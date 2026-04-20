import type { RequestHandler } from './host-bridge.js';
import type { PluginSettingDef } from '@pasmello/shared';
import { storage } from '$lib/storage';
import { pluginSettings } from '$lib/state/plugin-settings.svelte';
import { themeRegistry } from '$lib/theme/registry.svelte';

interface SettingsAccessor {
    getDefs(pluginId: string): Promise<PluginSettingDef[]>;
    getValue(pluginId: string, key: string): unknown;
    setValue(pluginId: string, key: string, value: unknown): void;
}

const toolAccessor: SettingsAccessor = {
    async getDefs(pluginId) {
        const manifest = await storage.getToolManifest(pluginId);
        return manifest?.settings ?? [];
    },
    getValue: (pluginId, key) => pluginSettings.getToolSetting(pluginId, key),
    setValue: (pluginId, key, value) => pluginSettings.setToolSetting(pluginId, key, value),
};

const themeAccessor: SettingsAccessor = {
    async getDefs(pluginId) {
        return themeRegistry.get(pluginId)?.manifest.settings ?? [];
    },
    getValue: (pluginId, key) => pluginSettings.getThemeSetting(pluginId, key),
    setValue: (pluginId, key, value) => pluginSettings.setThemeSetting(pluginId, key, value),
};

export function createSettingsHandlers(
    kind: 'tool' | 'theme' = 'tool',
): Record<string, RequestHandler> {
    const accessor = kind === 'theme' ? themeAccessor : toolAccessor;

    return {
        'settings:get': async (pluginId, data) => {
            const { key } = (data ?? {}) as { key?: string };
            const defs = await accessor.getDefs(pluginId);
            if (key === undefined) {
                const out: Record<string, unknown> = {};
                for (const def of defs) {
                    const stored = accessor.getValue(pluginId, def.key);
                    out[def.key] = stored ?? def.default;
                }
                return out;
            }
            const def = defs.find((d) => d.key === key);
            if (!def) return undefined;
            const stored = accessor.getValue(pluginId, key);
            return stored ?? def.default;
        },

        'settings:set': async (pluginId, data) => {
            const { key, value } = (data ?? {}) as { key?: string; value?: unknown };
            if (typeof key !== 'string') return false;
            const defs = await accessor.getDefs(pluginId);
            const def = defs.find((d) => d.key === key);
            if (!def) return false;
            accessor.setValue(pluginId, key, value);
            return true;
        },
    };
}
