import { api } from '$lib/api/client';
import { eventBus, triggerDispatcher } from '$lib/workflow/triggers';
import type { Workspace } from '@pasmello/shared';
import { defaultWorkspaceSettings } from '@pasmello/shared';

const CURRENT_NAME_KEY = 'pasmello:currentWorkspace';

function readPersistedCurrent(): string {
    if (typeof localStorage === 'undefined') return 'default';
    try {
        return localStorage.getItem(CURRENT_NAME_KEY) || 'default';
    } catch {
        return 'default';
    }
}

function persistCurrent(name: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(CURRENT_NAME_KEY, name);
    } catch {
        // ignore quota / unavailable storage
    }
}

function backfillSettings(ws: Workspace): Workspace {
    const base: Workspace = {
        ...ws,
        home: typeof ws.home === 'boolean' ? ws.home : false,
    };
    if (base.settings && typeof base.settings === 'object') {
        const s = base.settings;
        return {
            ...base,
            settings: {
                activeThemeId: s.activeThemeId ?? 'advanced',
                colorScheme: s.colorScheme ?? 'dark',
                themes: s.themes ?? {},
                tools: s.tools ?? {},
            },
        };
    }
    return { ...base, settings: defaultWorkspaceSettings() };
}

class WorkspaceState {
    workspaces = $state<string[]>([]);
    current = $state<Workspace | null>(null);
    currentName = $state(readPersistedCurrent());
    loading = $state(false);
    error = $state<string | null>(null);

    async loadWorkspaces() {
        try {
            const res = await api.workspaces.list();
            this.workspaces = res.workspaces;
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }

    async loadWorkspace(name: string) {
        this.loading = true;
        this.error = null;
        try {
            const ws = await api.workspaces.get(name);
            const filled = backfillSettings(ws);
            const needsWrite = !ws.settings || typeof ws.home !== 'boolean';
            if (needsWrite) {
                await api.workspaces.update(name, filled);
            }
            this.current = filled;
            this.currentName = name;
            persistCurrent(name);
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        } finally {
            this.loading = false;
        }
    }

    async createWorkspace(name: string) {
        this.error = null;
        try {
            await api.workspaces.create(name);
            await this.loadWorkspaces();
            eventBus.emit('workspace:created', { name });
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }

    async deleteWorkspace(name: string) {
        this.error = null;
        try {
            await api.workspaces.delete(name);
            await this.loadWorkspaces();
            eventBus.emit('workspace:deleted', { name });
            if (this.currentName === name) {
                await this.loadWorkspace('default');
            }
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }

    async updateWorkspace(ws: Workspace) {
        this.error = null;
        try {
            this.current = await api.workspaces.update(ws.name, ws);
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }

    async switchWorkspace(name: string) {
        await this.loadWorkspace(name);
        await triggerDispatcher.init(name);
        eventBus.emit('workspace:switched', { name });
    }

    /** Set `name` as the home workspace. Clears the flag on every other
     *  workspace to enforce the single-home invariant. */
    async setHome(name: string) {
        this.error = null;
        try {
            const names = await api.workspaces.list().then((r) => r.workspaces);
            for (const wsName of names) {
                const ws = await api.workspaces.get(wsName).catch(() => null);
                if (!ws) continue;
                const shouldBeHome = wsName === name;
                if (ws.home === shouldBeHome) continue;
                await api.workspaces.update(wsName, {
                    ...backfillSettings(ws),
                    home: shouldBeHome,
                });
            }
            if (this.current && this.currentName === name) {
                this.current = { ...this.current, home: true };
            } else if (this.current && this.current.home) {
                this.current = { ...this.current, home: false };
            }
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }

    /** Load the persisted current workspace. Falls back to home, then to the
     *  first available workspace if the persisted target is missing. */
    async loadPreferred(): Promise<void> {
        const tryLoad = async (name: string): Promise<boolean> => {
            try {
                await this.loadWorkspace(name);
                return this.error === null;
            } catch {
                return false;
            }
        };
        if (await tryLoad(this.currentName)) return;
        this.error = null;
        const home = await this.getHomeName();
        if (home !== this.currentName && (await tryLoad(home))) return;
        this.error = null;
        const names = await this.listAvailable();
        for (const n of names) {
            if (await tryLoad(n)) return;
        }
    }

    async listAvailable(): Promise<string[]> {
        try {
            const res = await api.workspaces.list();
            return res.workspaces;
        } catch {
            return [];
        }
    }

    async getHomeName(): Promise<string> {
        try {
            const names = await api.workspaces.list().then((r) => r.workspaces);
            for (const wsName of names) {
                const ws = await api.workspaces.get(wsName).catch(() => null);
                if (ws?.home) return wsName;
            }
            return names[0] ?? 'default';
        } catch {
            return 'default';
        }
    }
}

export const workspaceState = new WorkspaceState();
