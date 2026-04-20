import type { PluginSettingDef } from './theme.js';
import type { PluginPermissions } from './plugin.js';

export interface ToolManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    entry: string;
    permissions: ToolPermissions;
    actions: Record<string, ToolAction>;
    /** Declarative per-plugin settings, rendered in the workspace settings UI
     *  and exposed to the tool via `sdk.settings.get/set`. Values persist in
     *  `workspace.settings.tools[toolId]`. */
    settings?: PluginSettingDef[];
    /** When present, the tool can appear on a workspace grid as a widget.
     *  Absent → workflow-only tool (never rendered on a workspace). */
    widget?: WidgetDef;
}

/** Back-compat alias. ToolPermissions and PluginPermissions are the same shape. */
export type ToolPermissions = PluginPermissions;

export interface ToolAction {
    description: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
}

export interface WidgetSize {
    w: number;
    h: number;
}

export interface WidgetDef {
    minSize: WidgetSize;
    maxSize: WidgetSize;
    defaultSize: WidgetSize;
}
