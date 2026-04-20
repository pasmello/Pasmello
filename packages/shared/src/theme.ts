import type { PluginPermissions } from './plugin.js';

export interface PluginSettingDef {
    key: string;
    type: 'color' | 'select' | 'toggle' | 'range' | 'text';
    label: string;
    description?: string;
    default: string | number | boolean;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
}

/** Back-compat alias for the original pre-unification name. */
export type ThemeSettingDef = PluginSettingDef;

export type ThemeChromeRegion = 'top' | 'left' | 'floating';

export interface ThemeChromeLayer {
    /** Path inside the theme package, e.g. "chrome.html". */
    entry: string;
    region: ThemeChromeRegion;
    /** Pixel size for top (height) or left (width) regions. Ignored for floating. */
    size: number;
}

export interface ThemeAmbientLayer {
    entry: string;
}

export interface ThemeWorkspaceLayer {
    entry: string;
}

export interface ThemeLayers {
    chrome: ThemeChromeLayer;
    ambient?: ThemeAmbientLayer;
    workspace?: ThemeWorkspaceLayer;
}

export interface ThemeManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    builtIn: boolean;
    /** Permissions requested by the theme. Most themes declare empty network
     *  and `storage: 'read-write'`. Required from Phase 2 onward. */
    permissions?: PluginPermissions;
    settings?: PluginSettingDef[];
    tokens?: Record<string, string>;
    darkTokens?: Record<string, string>;
    /** Iframe layer declarations. Absent when the theme is still a Svelte
     *  component (builtin compatibility path during Phase 2 rollout). */
    layers?: ThemeLayers;
}
