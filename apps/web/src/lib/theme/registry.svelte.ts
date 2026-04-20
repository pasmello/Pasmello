import type { ThemeManifest } from '@pasmello/shared';
import { pluginSettings } from '$lib/state/plugin-settings.svelte';
import { storage } from '$lib/storage';

export type ThemeSource = 'builtin' | 'installed';

export interface ThemeDefinition {
    manifest: ThemeManifest;
    source: ThemeSource;
}

const BUILTIN_THEME_IDS = new Set(['advanced', 'monolithic', 'cute']);

class ThemeRegistry {
    private themes = $state(new Map<string, ThemeDefinition>());

    register(def: ThemeDefinition): void {
        this.themes.set(def.manifest.id, def);
        this.themes = new Map(this.themes);
    }

    unregister(id: string): void {
        this.themes.delete(id);
        this.themes = new Map(this.themes);
    }

    get all(): ThemeDefinition[] {
        return [...this.themes.values()];
    }

    get active(): ThemeDefinition | undefined {
        return this.themes.get(pluginSettings.activeThemeId);
    }

    get activeManifest(): ThemeManifest | undefined {
        return this.active?.manifest;
    }

    getManifest(id: string): ThemeManifest | undefined {
        return this.themes.get(id)?.manifest;
    }

    get(id: string): ThemeDefinition | undefined {
        return this.themes.get(id);
    }

    /** Re-scan OPFS and register every installed theme. Call after bootstrap
     *  installs builtin themes. */
    async loadFromStorage(): Promise<void> {
        try {
            const manifests = await storage.listThemes();
            for (const manifest of manifests) {
                if (!manifest.layers) continue;
                this.register({
                    manifest,
                    source: BUILTIN_THEME_IDS.has(manifest.id) ? 'builtin' : 'installed',
                });
            }
        } catch (err) {
            console.warn('[Pasmello] failed to load themes from storage', err);
        }
    }
}

export const themeRegistry = new ThemeRegistry();
