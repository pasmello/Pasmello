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

export interface ThemeManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    builtIn: boolean;
    settings?: PluginSettingDef[];
    tokens?: Record<string, string>;
    darkTokens?: Record<string, string>;
}
