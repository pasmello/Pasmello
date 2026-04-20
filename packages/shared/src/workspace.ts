export interface Workspace {
    name: string;
    /** Home workspace flag. Exactly one workspace should have home=true; the
     *  app redirects the root route to this workspace on fresh loads. */
    home: boolean;
    tools: WorkspaceTool[];
    layout: Layout;
    settings: WorkspaceSettings;
}

export interface WorkspaceTool {
    id: string;
    toolName: string;
}

export interface Layout {
    columns: number;
    items: LayoutItem[];
}

export interface LayoutItem {
    toolId: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface WorkspaceSettings {
    activeThemeId: string;
    colorScheme: 'light' | 'dark';
    /** Per-theme custom settings keyed by theme id. */
    themes: Record<string, Record<string, unknown>>;
    /** Per-tool custom settings keyed by tool id. */
    tools: Record<string, Record<string, unknown>>;
}

export function defaultWorkspaceSettings(): WorkspaceSettings {
    return {
        activeThemeId: 'advanced',
        colorScheme: 'dark',
        themes: {},
        tools: {},
    };
}
