import type {
    Workspace,
    ToolManifest,
    Workflow,
    WorkflowRunResult,
} from '@pasmello/shared';

/**
 * Storage abstraction. The OSS tier uses OpfsStorage; future tiers
 * (Plus cloud sync, Enterprise on-prem) implement the same interface.
 */
export interface Storage {
    init(): Promise<void>;

    listWorkspaces(): Promise<string[]>;
    getWorkspace(name: string): Promise<Workspace | null>;
    saveWorkspace(ws: Workspace): Promise<void>;
    deleteWorkspace(name: string): Promise<void>;

    listTools(): Promise<ToolManifest[]>;
    getToolManifest(id: string): Promise<ToolManifest | null>;
    installTool(id: string, files: ToolFile[]): Promise<void>;
    removeTool(id: string): Promise<void>;
    readToolFile(id: string, path: string): Promise<Uint8Array | null>;

    listToolDataKeys(workspace: string, toolId: string): Promise<string[]>;
    getToolData(workspace: string, toolId: string, key: string): Promise<string | null>;
    setToolData(workspace: string, toolId: string, key: string, value: string): Promise<void>;
    deleteToolData(workspace: string, toolId: string, key: string): Promise<void>;

    /** One-shot migration helper: read + delete the legacy global settings.json
     *  (pre-v1 theme settings, before the move onto Workspace.settings). Returns
     *  the parsed blob or null if the file doesn't exist. */
    migrateGlobalThemeSettings(): Promise<LegacyThemeSettings | null>;

    listWorkflows(workspace: string): Promise<Workflow[]>;
    getWorkflow(workspace: string, id: string): Promise<Workflow | null>;
    saveWorkflow(workspace: string, wf: Workflow): Promise<void>;
    deleteWorkflow(workspace: string, id: string): Promise<void>;

    appendRunLog(workspace: string, run: WorkflowRunResult): Promise<void>;
    listRunLogs(workspace: string, workflowId: string, limit?: number): Promise<WorkflowRunResult[]>;

    /** Snapshot every byte under storage as a flat path -> bytes map. */
    exportAll(): Promise<Map<string, Uint8Array>>;
    /** Restore from an exportAll() snapshot, overwriting matching paths. */
    importAll(entries: Map<string, Uint8Array>): Promise<void>;
}

export interface ToolFile {
    path: string;
    data: Uint8Array;
}

/** Shape of the legacy global `settings.json` file that used to live at OPFS
 *  root. Kept here as a local type so the shared package doesn't have to
 *  re-export `ThemeSettings` purely for a one-shot migration. */
export interface LegacyThemeSettings {
    activeTheme?: string;
    colorScheme?: 'light' | 'dark';
    perTheme?: Record<string, Record<string, unknown>>;
}

export const PATH_SEGMENT_RE = /^[a-zA-Z0-9_\-.]+$/;

export function isValidPathSegment(s: string): boolean {
    return s !== '' && s !== '.' && s !== '..' && PATH_SEGMENT_RE.test(s);
}

export class InvalidPathSegmentError extends Error {
    constructor(segment: string) {
        super(`invalid path segment: ${JSON.stringify(segment)}`);
        this.name = 'InvalidPathSegmentError';
    }
}

export function assertPathSegment(s: string): void {
    if (!isValidPathSegment(s)) throw new InvalidPathSegmentError(s);
}
