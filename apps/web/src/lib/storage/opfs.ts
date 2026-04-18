import type {
    Workspace,
    ToolManifest,
    ThemeSettings,
    Workflow,
    WorkflowRunResult,
} from '@pasmello/shared';
import { assertPathSegment, type Storage, type ToolFile } from './types.js';

const DEFAULT_WORKSPACE: Workspace = {
    name: 'default',
    tools: [],
    layout: { columns: 12, items: [] },
};

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    activeTheme: 'advanced',
    colorScheme: 'dark',
    perTheme: {},
};

const TOP_LEVEL_DIRS = ['workspaces', 'tools', 'themes', 'workflows', 'logs'];

export class OpfsStorage implements Storage {
    private rootPromise: Promise<FileSystemDirectoryHandle> | null = null;

    private async root(): Promise<FileSystemDirectoryHandle> {
        if (!this.rootPromise) {
            this.rootPromise = navigator.storage.getDirectory();
        }
        return this.rootPromise;
    }

    async init(): Promise<void> {
        const root = await this.root();
        for (const dir of TOP_LEVEL_DIRS) {
            await root.getDirectoryHandle(dir, { create: true });
        }
        await this.getDir(['workspaces', 'default'], true);
        await this.getDir(['workspaces', 'default', 'data'], true);
        await this.getDir(['workspaces', 'default', 'workflows'], true);
        await this.getDir(['logs', 'workflow-runs'], true);

        if (!(await this.getWorkspace('default'))) {
            await this.saveWorkspace(DEFAULT_WORKSPACE);
        }
    }

    async listWorkspaces(): Promise<string[]> {
        const dir = await this.getDir(['workspaces'], false);
        if (!dir) return [];
        return await this.listDirNames(dir);
    }

    async getWorkspace(name: string): Promise<Workspace | null> {
        assertPathSegment(name);
        return this.readJson<Workspace>(['workspaces', name, 'workspace.json']);
    }

    async saveWorkspace(ws: Workspace): Promise<void> {
        assertPathSegment(ws.name);
        await this.getDir(['workspaces', ws.name, 'data'], true);
        await this.getDir(['workspaces', ws.name, 'workflows'], true);
        await this.writeJson(['workspaces', ws.name, 'workspace.json'], ws);
    }

    async deleteWorkspace(name: string): Promise<void> {
        assertPathSegment(name);
        const wsDir = await this.getDir(['workspaces'], false);
        if (!wsDir) return;
        await wsDir.removeEntry(name, { recursive: true }).catch(() => {});
    }

    async listTools(): Promise<ToolManifest[]> {
        const dir = await this.getDir(['tools'], false);
        if (!dir) return [];
        const out: ToolManifest[] = [];
        for await (const [name, handle] of entries(dir)) {
            if (handle.kind !== 'directory') continue;
            const m = await this.getToolManifest(name).catch(() => null);
            if (m) out.push(m);
        }
        return out;
    }

    async getToolManifest(id: string): Promise<ToolManifest | null> {
        assertPathSegment(id);
        return this.readJson<ToolManifest>(['tools', id, 'tool.manifest.json']);
    }

    async installTool(id: string, files: ToolFile[]): Promise<void> {
        assertPathSegment(id);
        const toolsDir = await this.requireDir(['tools']);
        await toolsDir.removeEntry(id, { recursive: true }).catch(() => {});
        const toolDir = await toolsDir.getDirectoryHandle(id, { create: true });

        for (const file of files) {
            const segments = file.path.split('/').filter(Boolean);
            for (const seg of segments) assertPathSegment(seg);
            const fileName = segments.pop()!;
            let cur = toolDir;
            for (const seg of segments) {
                cur = await cur.getDirectoryHandle(seg, { create: true });
            }
            const fh = await cur.getFileHandle(fileName, { create: true });
            const writable = await fh.createWritable();
            await writable.write(new Blob([file.data as Uint8Array<ArrayBuffer>]));
            await writable.close();
        }
    }

    async removeTool(id: string): Promise<void> {
        assertPathSegment(id);
        const toolsDir = await this.getDir(['tools'], false);
        if (!toolsDir) return;
        await toolsDir.removeEntry(id, { recursive: true }).catch(() => {});
    }

    async readToolFile(id: string, path: string): Promise<Uint8Array | null> {
        assertPathSegment(id);
        const segments = path.split('/').filter(Boolean);
        for (const seg of segments) assertPathSegment(seg);
        const bytes = await this.readBytes(['tools', id, ...segments]);
        return bytes;
    }

    async listToolDataKeys(workspace: string, toolId: string): Promise<string[]> {
        assertPathSegment(workspace);
        assertPathSegment(toolId);
        const dir = await this.getDir(['workspaces', workspace, 'data', toolId], false);
        if (!dir) return [];
        const keys: string[] = [];
        for await (const [name, handle] of entries(dir)) {
            if (handle.kind === 'file' && name.endsWith('.json')) {
                keys.push(name.slice(0, -'.json'.length));
            }
        }
        return keys;
    }

    async getToolData(workspace: string, toolId: string, key: string): Promise<string | null> {
        assertPathSegment(workspace);
        assertPathSegment(toolId);
        assertPathSegment(key);
        const entry = await this.readJson<{ value: string }>([
            'workspaces', workspace, 'data', toolId, `${key}.json`,
        ]);
        return entry?.value ?? null;
    }

    async setToolData(workspace: string, toolId: string, key: string, value: string): Promise<void> {
        assertPathSegment(workspace);
        assertPathSegment(toolId);
        assertPathSegment(key);
        await this.getDir(['workspaces', workspace, 'data', toolId], true);
        await this.writeJson(
            ['workspaces', workspace, 'data', toolId, `${key}.json`],
            { value },
        );
    }

    async deleteToolData(workspace: string, toolId: string, key: string): Promise<void> {
        assertPathSegment(workspace);
        assertPathSegment(toolId);
        assertPathSegment(key);
        const dir = await this.getDir(['workspaces', workspace, 'data', toolId], false);
        if (!dir) return;
        await dir.removeEntry(`${key}.json`).catch(() => {});
    }

    async getThemeSettings(): Promise<ThemeSettings> {
        const data = await this.readJson<ThemeSettings>(['settings.json']);
        if (!data) return { ...DEFAULT_THEME_SETTINGS, perTheme: {} };
        return { ...DEFAULT_THEME_SETTINGS, ...data, perTheme: data.perTheme ?? {} };
    }

    async saveThemeSettings(settings: ThemeSettings): Promise<void> {
        await this.writeJson(['settings.json'], settings);
    }

    async listWorkflows(workspace: string): Promise<Workflow[]> {
        assertPathSegment(workspace);
        const dir = await this.getDir(['workspaces', workspace, 'workflows'], false);
        if (!dir) return [];
        const out: Workflow[] = [];
        for await (const [name, handle] of entries(dir)) {
            if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
            const wf = await this.readJson<Workflow>([
                'workspaces', workspace, 'workflows', name,
            ]);
            if (wf) out.push(wf);
        }
        return out;
    }

    async getWorkflow(workspace: string, id: string): Promise<Workflow | null> {
        assertPathSegment(workspace);
        assertPathSegment(id);
        return this.readJson<Workflow>(['workspaces', workspace, 'workflows', `${id}.json`]);
    }

    async saveWorkflow(workspace: string, wf: Workflow): Promise<void> {
        assertPathSegment(workspace);
        assertPathSegment(wf.id);
        await this.getDir(['workspaces', workspace, 'workflows'], true);
        await this.writeJson(['workspaces', workspace, 'workflows', `${wf.id}.json`], wf);
    }

    async deleteWorkflow(workspace: string, id: string): Promise<void> {
        assertPathSegment(workspace);
        assertPathSegment(id);
        const dir = await this.getDir(['workspaces', workspace, 'workflows'], false);
        if (!dir) return;
        await dir.removeEntry(`${id}.json`).catch(() => {});
    }

    async appendRunLog(workspace: string, run: WorkflowRunResult): Promise<void> {
        assertPathSegment(workspace);
        assertPathSegment(run.workflowId);
        assertPathSegment(run.runId);
        await this.getDir(['logs', 'workflow-runs', workspace, run.workflowId], true);
        await this.writeJson(
            ['logs', 'workflow-runs', workspace, run.workflowId, `${run.runId}.json`],
            run,
        );
    }

    async listRunLogs(
        workspace: string,
        workflowId: string,
        limit?: number,
    ): Promise<WorkflowRunResult[]> {
        assertPathSegment(workspace);
        assertPathSegment(workflowId);
        const dir = await this.getDir(
            ['logs', 'workflow-runs', workspace, workflowId],
            false,
        );
        if (!dir) return [];
        const runs: WorkflowRunResult[] = [];
        for await (const [name, handle] of entries(dir)) {
            if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
            const run = await this.readJson<WorkflowRunResult>([
                'logs', 'workflow-runs', workspace, workflowId, name,
            ]);
            if (run) runs.push(run);
        }
        runs.sort((a, b) => b.startedAt - a.startedAt);
        return typeof limit === 'number' ? runs.slice(0, limit) : runs;
    }

    async exportAll(): Promise<Map<string, Uint8Array>> {
        const out = new Map<string, Uint8Array>();
        const root = await this.root();
        await walkDir(root, [], async (path, file) => {
            const buf = await file.arrayBuffer();
            out.set(path.join('/'), new Uint8Array(buf));
        });
        return out;
    }

    async importAll(entries: Map<string, Uint8Array>): Promise<void> {
        const root = await this.root();
        for (const [relPath, data] of entries) {
            const segments = relPath.split('/').filter(Boolean);
            for (const seg of segments) assertPathSegment(seg);
            if (segments.length === 0) continue;
            const fileName = segments.pop()!;
            let cur = root;
            for (const seg of segments) {
                cur = await cur.getDirectoryHandle(seg, { create: true });
            }
            const fh = await cur.getFileHandle(fileName, { create: true });
            const writable = await fh.createWritable();
            await writable.write(new Blob([data as Uint8Array<ArrayBuffer>]));
            await writable.close();
        }
    }

    private async getDir(
        path: string[],
        create: boolean,
    ): Promise<FileSystemDirectoryHandle | null> {
        let cur = await this.root();
        for (const segment of path) {
            try {
                cur = await cur.getDirectoryHandle(segment, { create });
            } catch (err) {
                if (!create && isNotFound(err)) return null;
                throw err;
            }
        }
        return cur;
    }

    private async readBytes(path: string[]): Promise<Uint8Array | null> {
        if (path.length === 0) return null;
        const dir = await this.getDir(path.slice(0, -1), false);
        if (!dir) return null;
        try {
            const fh = await dir.getFileHandle(path[path.length - 1]);
            const file = await fh.getFile();
            return new Uint8Array(await file.arrayBuffer());
        } catch (err) {
            if (isNotFound(err)) return null;
            throw err;
        }
    }

    private async readJson<T>(path: string[]): Promise<T | null> {
        const bytes = await this.readBytes(path);
        if (!bytes) return null;
        try {
            return JSON.parse(new TextDecoder().decode(bytes)) as T;
        } catch {
            return null;
        }
    }

    private async writeJson(path: string[], value: unknown): Promise<void> {
        if (path.length === 0) throw new Error('writeJson: empty path');
        const dir = await this.requireDir(path.slice(0, -1));
        const fh = await dir.getFileHandle(path[path.length - 1], { create: true });
        const writable = await fh.createWritable();
        await writable.write(JSON.stringify(value, null, 2));
        await writable.close();
    }

    private async requireDir(path: string[]): Promise<FileSystemDirectoryHandle> {
        const dir = await this.getDir(path, true);
        if (!dir) throw new Error(`failed to create dir: ${path.join('/')}`);
        return dir;
    }

    private async listDirNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
        const out: string[] = [];
        for await (const [name, handle] of entries(dir)) {
            if (handle.kind === 'directory') out.push(name);
        }
        return out;
    }
}

function isNotFound(err: unknown): boolean {
    return err instanceof DOMException && err.name === 'NotFoundError';
}

async function* entries(
    dir: FileSystemDirectoryHandle,
): AsyncGenerator<[string, FileSystemHandle]> {
    const iter = (dir as unknown as {
        entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    }).entries();
    for await (const entry of iter) yield entry;
}

async function walkDir(
    dir: FileSystemDirectoryHandle,
    prefix: string[],
    visit: (path: string[], file: File) => Promise<void>,
): Promise<void> {
    for await (const [name, handle] of entries(dir)) {
        if (handle.kind === 'directory') {
            await walkDir(handle as FileSystemDirectoryHandle, [...prefix, name], visit);
        } else {
            const file = await (handle as FileSystemFileHandle).getFile();
            await visit([...prefix, name], file);
        }
    }
}
