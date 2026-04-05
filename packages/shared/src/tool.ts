export interface ToolManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    entry: string;
    permissions: ToolPermissions;
    actions: Record<string, ToolAction>;
}

export interface ToolPermissions {
    network: string[];
    storage: 'none' | 'read' | 'read-write';
    clipboard: 'none' | 'read' | 'read-write';
    notifications: boolean;
    camera: boolean;
    geolocation: boolean;
}

export interface ToolAction {
    description: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
}
