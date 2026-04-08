import type { ThemeManifest } from '@pasmello/shared';
import { themeSettings } from './settings.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = any;

export interface ThemeDefinition {
    manifest: ThemeManifest;
    component: AnyComponent;
}

class ThemeRegistry {
    private themes = new Map<string, ThemeDefinition>();

    register(def: ThemeDefinition): void {
        this.themes.set(def.manifest.id, def);
    }

    get all(): ThemeDefinition[] {
        return [...this.themes.values()];
    }

    get active(): ThemeDefinition | undefined {
        return this.themes.get(themeSettings.activeThemeId);
    }

    get activeComponent(): AnyComponent {
        return this.active?.component ?? this.themes.values().next().value?.component;
    }

    get activeManifest(): ThemeManifest | undefined {
        return this.active?.manifest;
    }

    getManifest(id: string): ThemeManifest | undefined {
        return this.themes.get(id)?.manifest;
    }
}

export const themeRegistry = new ThemeRegistry();
