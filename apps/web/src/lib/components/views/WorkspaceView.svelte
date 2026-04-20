<script lang="ts">
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import ToolFrame from '$lib/components/tools/ToolFrame.svelte';
    import WorkspaceThemeLayer from '$lib/components/iframes/WorkspaceThemeLayer.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { toolsState } from '$lib/state/tools.svelte';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
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

    // Apply any layout overrides the active workspace-layer theme has sent.
    let placedItems = $derived.by(() => {
        const overrides = bridgeManager.layoutOverrides;
        return gridItems.map((g) => {
            const o = overrides[g.toolId];
            if (!o) return g;
            return { ...g, x: o.x, y: o.y, w: o.w, h: o.h };
        });
    });

    let hasTools = $derived(placedItems.length > 0);
    let cols = $derived(workspaceState.current?.layout.columns ?? 12);

    let active = $derived(themeRegistry.active);
    let workspaceLayer = $derived(active?.kind === 'iframe' ? active.manifest.layers?.workspace : undefined);

    // Emit layout changes to the workspace layer so it can re-render tile decorations.
    $effect(() => {
        const tools = placedItems.map((p) => ({ toolId: p.toolId, x: p.x, y: p.y, w: p.w, h: p.h }));
        bridgeManager.broadcastLayoutChanged(tools);
    });
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
        <div class="workspace-surface">
            {#if workspaceLayer && bridgeManager.themeBridge && active}
                <WorkspaceThemeLayer
                    themeId={active.manifest.id}
                    workspace={workspaceLayer}
                    bridge={bridgeManager.themeBridge}
                />
            {/if}
            <div
                class="tool-grid"
                style="grid-template-columns: repeat({cols}, 1fr)"
            >
                {#each placedItems as item (item.id)}
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
        </div>
    {:else}
        <div class="empty-state">
            <p>No tools in this workspace yet.</p>
            <p class="hint">Go to <a href="{base}/tools">Tools</a> to add your first tool.</p>
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

    .workspace-surface {
        position: relative;
        height: calc(100vh - 140px);
    }

    .tool-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 16px;
        grid-auto-rows: 80px;
        height: 100%;
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
