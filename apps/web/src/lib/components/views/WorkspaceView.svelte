<script lang="ts">
    import { onMount } from 'svelte';
    import ToolFrame from '$lib/components/tools/ToolFrame.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { toolsState } from '$lib/state/tools.svelte';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import type { LayoutItem } from '@pasmello/shared';

    let gridItems = $state<Array<{ id: string; toolId: string; x: number; y: number; w: number; h: number }>>([]);

    onMount(async () => {
        await Promise.all([
            workspaceState.loadWorkspace(workspaceState.currentName),
            toolsState.loadTools(),
        ]);
        syncGridItems();
    });

    function syncGridItems() {
        const ws = workspaceState.current;
        if (!ws) return;
        gridItems = ws.layout.items.map((item: LayoutItem) => ({
            id: item.toolId,
            toolId: item.toolId,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
        }));
    }

    let hasTools = $derived(gridItems.length > 0);
    let cols = $derived(workspaceState.current?.layout.columns ?? 12);
</script>

<div class="workspace">
    <div class="workspace-header">
        <h2>{workspaceState.current?.name ?? 'Workspace'}</h2>
    </div>

    {#if workspaceState.loading}
        <div class="loading-state">
            <p>Loading workspace...</p>
        </div>
    {:else if workspaceState.error}
        <div class="error-state">
            <p>{workspaceState.error}</p>
            <button onclick={() => workspaceState.loadWorkspace(workspaceState.currentName)}>Retry</button>
        </div>
    {:else if hasTools && bridgeManager.bridge}
        <div
            class="tool-grid"
            style="grid-template-columns: repeat({cols}, 1fr)"
        >
            {#each gridItems as item (item.id)}
                <div
                    class="grid-cell"
                    style="grid-column: {item.x + 1} / span {item.w}; grid-row: {item.y + 1} / span {item.h}"
                >
                    <ToolFrame
                        id={item.id}
                        toolId={item.toolId}
                        bridge={bridgeManager.bridge}
                    />
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>No tools in this workspace yet.</p>
            <p class="hint">Go to <a href="/tools">Tools</a> to add your first tool.</p>
        </div>
    {/if}
</div>

<style>
    .workspace {
        height: 100%;
    }

    .workspace-header {
        margin-bottom: var(--pm-space-lg);
    }

    .workspace-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .tool-grid {
        display: grid;
        gap: 16px;
        grid-auto-rows: 80px;
        height: calc(100vh - 140px);
    }

    .grid-cell {
        border-radius: var(--pm-radius-md);
        overflow: hidden;
        border: 1px solid var(--pm-border-subtle);
        background-color: var(--pm-bg-surface);
    }

    .loading-state,
    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--pm-space-2xl);
        color: var(--pm-text-secondary);
        gap: var(--pm-space-sm);
    }

    .error-state button {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        border: none;
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--pm-space-2xl);
        border: 2px dashed var(--pm-border);
        border-radius: var(--pm-radius-lg);
        color: var(--pm-text-secondary);
        text-align: center;
        gap: var(--pm-space-sm);
    }

    .hint {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }

    .hint a {
        color: var(--pm-accent);
    }
</style>
