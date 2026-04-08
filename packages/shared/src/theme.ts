export interface ThemeManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    builtIn: boolean;
    settings?: ThemeSettingDef[];
    tokens?: Record<string, string>;
    darkTokens?: Record<string, string>;
}

export interface ThemeSettingDef {
    key: string;
    type: 'color' | 'select' | 'toggle' | 'range' | 'text';
    label: string;
    description?: string;
    default: string | number | boolean;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
}

export interface ThemeSettings {
    activeTheme: string;
    colorScheme: 'light' | 'dark';
    perTheme: Record<string, Record<string, unknown>>;
}
