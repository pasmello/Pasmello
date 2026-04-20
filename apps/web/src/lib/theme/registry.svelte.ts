import type { ThemeManifest } from '@pasmello/shared';
import { pluginSettings } from '$lib/state/plugin-settings.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = any;

export type ThemeSource = 'builtin' | 'installed';
export type ThemeKind = 'svelte' | 'iframe';

export interface ThemeDefinition {
    manifest: ThemeManifest;
    source: ThemeSource;
    /** 'svelte' during Phase 2 rollout (builtins), 'iframe' for OPFS-hosted themes. */
    kind: ThemeKind;
    /** Populated when kind === 'svelte'. */
    component?: AnyComponent;
}

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

    get activeComponent(): AnyComponent {
        if (this.active?.kind === 'svelte') return this.active.component;
        for (const def of this.themes.values()) {
            if (def.kind === 'svelte') return def.component;
        }
        return undefined;
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
}

export const themeRegistry = new ThemeRegistry();
