<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { base } from '$app/paths';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import { api } from '$lib/api/client';
    import type { Workspace } from '@pasmello/shared';

    let workspaces = $state<Workspace[]>([]);
    let newName = $state('');
    let createError = $state<string | null>(null);
    let busy = $state(false);

    onMount(loadAll);

    async function loadAll() {
        busy = true;
        try {
            await workspaceState.loadWorkspaces();
            const loaded = await Promise.all(
                workspaceState.workspaces.map((name) => api.workspaces.get(name).catch(() => null)),
            );
            workspaces = loaded.filter((ws): ws is Workspace => ws !== null);
        } finally {
            busy = false;
        }
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        createError = null;
        await workspaceState.createWorkspace(newName.trim());
        if (workspaceState.error) {
            createError = workspaceState.error;
            return;
        }
        newName = '';
        await loadAll();
    }

    async function enter(name: string) {
        await workspaceState.switchWorkspace(name);
        bridgeManager.init(name);
        goto(`${base}/home`);
    }

    function openConfig(name: string) {
        goto(`${base}/workspaces/${encodeURIComponent(name)}`);
    }

    async function remove(name: string) {
        if (name === 'default') return;
        if (!confirm(`Delete workspace "${name}"? This cannot be undone.`)) return;
        await workspaceState.deleteWorkspace(name);
        await loadAll();
    }

    function themeSwatch(ws: Workspace): string[] {
        const id = ws.settings?.activeThemeId;
        if (!id) return [];
        const m = themeRegistry.getManifest(id);
        if (!m) return [];
        const picks = ['--pm-accent', '--pm-bg-primary', '--pm-bg-surface', '--pm-text-primary'];
        const light = m.tokens ?? {};
        const dark = m.darkTokens ?? {};
        return picks
            .map((k) => light[k] ?? dark[k])
            .filter((v): v is string => typeof v === 'string')
            .slice(0, 4);
    }

    function themeName(ws: Workspace): string {
        const id = ws.settings?.activeThemeId ?? 'advanced';
        return themeRegistry.getManifest(id)?.name ?? id;
    }
</script>

<div class="workspaces-page">
    <div class="page-header">
        <h2>Workspaces</h2>
        <p class="sub">Each workspace is a bundle of tools, a theme, and workflows.</p>
    </div>

    <form class="create-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
        <input
            type="text"
            bind:value={newName}
            placeholder="New workspace name…"
            class="create-input"
        />
        <button type="submit" class="btn primary" disabled={busy || !newName.trim()}>Create</button>
    </form>
    {#if createError}
        <p class="create-error">{createError}</p>
    {/if}

    {#if busy && workspaces.length === 0}
        <p class="empty">Loading…</p>
    {:else if workspaces.length === 0}
        <p class="empty">No workspaces yet.</p>
    {:else}
        <div class="ws-grid">
            {#each workspaces as ws (ws.name)}
                {@const isCurrent = workspaceState.currentName === ws.name}
                {@const swatch = themeSwatch(ws)}
                <article class="ws-card" class:current={isCurrent}>
                    <header>
                        <h3>{ws.name}</h3>
                        <div class="badges">
                            {#if ws.home}<span class="badge home">Home</span>{/if}
                            {#if isCurrent}<span class="badge current-badge">Current</span>{/if}
                        </div>
                    </header>
                    <div class="meta">
                        <span class="theme-name">{themeName(ws)}</span>
                        <span class="sep">·</span>
                        <span>{ws.tools.length} {ws.tools.length === 1 ? 'tool' : 'tools'}</span>
                    </div>
                    {#if swatch.length > 0}
                        <div class="swatch-row">
                            {#each swatch as color, i (i)}
                                <span class="swatch" style="background-color: {color};" title={color}></span>
                            {/each}
                        </div>
                    {/if}
                    {#if ws.tools.length > 0}
                        <ul class="tool-peek">
                            {#each ws.tools.slice(0, 4) as t (t.id)}
                                <li>{t.toolName}</li>
                            {/each}
                            {#if ws.tools.length > 4}
                                <li class="more">+{ws.tools.length - 4} more</li>
                            {/if}
                        </ul>
                    {/if}
                    <div class="card-actions">
                        <button class="btn primary" onclick={() => enter(ws.name)}>Enter</button>
                        <button class="btn" onclick={() => openConfig(ws.name)}>Configure</button>
                        <button
                            class="btn danger"
                            disabled={ws.name === 'default'}
                            title={ws.name === 'default' ? 'The default workspace cannot be deleted' : ''}
                            onclick={() => remove(ws.name)}
                        >Delete</button>
                    </div>
                </article>
            {/each}
        </div>
    {/if}
</div>

<style>
    .workspaces-page {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-lg);
    }
    .page-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }
    .page-header .sub {
        margin-top: var(--pm-space-xs);
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }
    .create-form {
        display: flex;
        gap: var(--pm-space-sm);
    }
    .create-input {
        flex: 1;
        padding: var(--pm-space-xs) var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
    }
    .create-error {
        color: var(--pm-status-error);
        font-size: var(--pm-font-size-sm);
    }
    .ws-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--pm-space-md);
    }
    .ws-card {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-md);
        transition: border-color var(--pm-transition-fast);
    }
    .ws-card.current {
        border-color: var(--pm-accent);
        box-shadow: 0 0 0 1px var(--pm-accent-subtle);
    }
    .ws-card header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--pm-space-sm);
    }
    .ws-card h3 {
        font-size: var(--pm-font-size-lg);
        font-weight: 600;
    }
    .badges { display: flex; gap: var(--pm-space-xs); flex-wrap: wrap; }
    .badge {
        font-size: var(--pm-font-size-xs);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        background-color: var(--pm-bg-tertiary);
        color: var(--pm-text-secondary);
    }
    .badge.home {
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }
    .badge.current-badge {
        background-color: var(--pm-accent-subtle);
        color: var(--pm-accent);
    }
    .meta {
        display: flex;
        gap: var(--pm-space-xs);
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
    }
    .theme-name { font-weight: 500; }
    .sep { opacity: 0.5; }
    .swatch-row { display: flex; gap: 6px; }
    .swatch {
        display: inline-block;
        width: 22px;
        height: 22px;
        border-radius: var(--pm-radius-sm);
        border: 1px solid var(--pm-border-subtle);
    }
    .tool-peek {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .tool-peek li {
        font-size: var(--pm-font-size-xs);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        background-color: var(--pm-bg-tertiary);
        color: var(--pm-text-secondary);
        font-family: var(--pm-font-mono);
    }
    .tool-peek li.more { font-style: italic; font-family: inherit; }
    .card-actions {
        display: flex;
        gap: var(--pm-space-xs);
        margin-top: auto;
    }
    .btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-xs);
        cursor: pointer;
    }
    .btn.primary {
        background-color: var(--pm-accent);
        border-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }
    .btn.danger {
        color: var(--pm-status-error);
        border-color: var(--pm-status-error);
        background: none;
    }
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
    }
</style>
