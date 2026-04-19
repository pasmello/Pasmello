import type { Workspace, ToolManifest } from '@pasmello/shared';
import { defaultWorkspaceSettings } from '@pasmello/shared';
import { storage, assertPathSegment, type ToolFile } from '$lib/storage';

let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
    if (!initPromise) initPromise = storage.init();
    return initPromise;
}

async function nonNull<T>(v: T | null, msg: string): Promise<T> {
    if (v === null) throw new Error(msg);
    return v;
}

export const api = {
    workspaces: {
        async list(): Promise<{ workspaces: string[] }> {
            await ensureInit();
            return { workspaces: await storage.listWorkspaces() };
        },
        async get(name: string): Promise<Workspace> {
            await ensureInit();
            assertPathSegment(name);
            return nonNull(await storage.getWorkspace(name), 'workspace not found');
        },
        async create(name: string): Promise<Workspace> {
            await ensureInit();
            assertPathSegment(name);
            if (await storage.getWorkspace(name)) {
                throw new Error('workspace already exists');
            }
            const ws: Workspace = {
                name,
                tools: [],
                layout: { columns: 12, items: [] },
                settings: defaultWorkspaceSettings(),
            };
            await storage.saveWorkspace(ws);
            return ws;
        },
        async update(name: string, data: Workspace): Promise<Workspace> {
            await ensureInit();
            assertPathSegment(name);
            const ws: Workspace = { ...data, name };
            await storage.saveWorkspace(ws);
            return ws;
        },
        async delete(name: string): Promise<void> {
            await ensureInit();
            assertPathSegment(name);
            if (name === 'default') throw new Error('cannot delete default workspace');
            await storage.deleteWorkspace(name);
        },
    },
    tools: {
        async list(): Promise<{ tools: ToolManifest[] }> {
            await ensureInit();
            return { tools: await storage.listTools() };
        },
        async get(id: string): Promise<ToolManifest> {
            await ensureInit();
            return nonNull(await storage.getToolManifest(id), 'tool not found');
        },
        async install(id: string, files: ToolFile[]): Promise<{ status: string }> {
            await ensureInit();
            await storage.installTool(id, files);
            return { status: 'installed' };
        },
        async remove(id: string): Promise<void> {
            await ensureInit();
            await storage.removeTool(id);
        },
    },
};
