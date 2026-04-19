import { api } from '$lib/api/client';
import { eventBus, triggerDispatcher } from '$lib/workflow/triggers';
import type { Workspace } from '@pasmello/shared';

class WorkspaceState {
    workspaces = $state<string[]>([]);
    current = $state<Workspace | null>(null);
    currentName = $state('default');
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
            this.current = await api.workspaces.get(name);
            this.currentName = name;
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
}

export const workspaceState = new WorkspaceState();
