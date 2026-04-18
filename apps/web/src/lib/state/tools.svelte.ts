import { api } from '$lib/api/client';
import type { ToolManifest } from '@pasmello/shared';

class ToolsState {
    installed = $state<ToolManifest[]>([]);
    loading = $state(false);
    error = $state<string | null>(null);

    async loadTools() {
        this.loading = true;
        this.error = null;
        try {
            const res = await api.tools.list();
            this.installed = res.tools;
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        } finally {
            this.loading = false;
        }
    }

    async removeTool(id: string) {
        this.error = null;
        try {
            await api.tools.remove(id);
            await this.loadTools();
        } catch (e) {
            this.error = e instanceof Error ? e.message : String(e);
        }
    }
}

export const toolsState = new ToolsState();
