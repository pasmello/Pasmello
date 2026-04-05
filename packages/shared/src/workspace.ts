export interface Workspace {
    name: string;
    tools: WorkspaceTool[];
    layout: Layout;
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
