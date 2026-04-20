<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { base } from '$app/paths';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { api } from '$lib/api/client';
    import type { Workspace } from '@pasmello/shared';

    let ws = $state<Workspace | null>(null);
    let name = $derived($page.params.name ?? '');
    let error = $state<string | null>(null);
    let renameTo = $state('');

    onMount(load);

    async function load() {
        error = null;
        if (!name) {
            error = 'missing workspace name';
            return;
        }
        try {
            ws = await api.workspaces.get(name);
            renameTo = ws.name;
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        }
    }

    async function makeHome() {
        if (!ws || ws.home) return;
        await workspaceState.setHome(ws.name);
        await load();
    }

    async function handleRename() {
        if (!ws) return;
        const target = renameTo.trim();
        if (!target || target === ws.name) return;
        alert('Rename is not yet implemented — delete and recreate for now.');
        renameTo = ws.name;
    }

    async function handleDelete() {
        if (!ws) return;
        if (ws.name === 'default') return;
        if (!confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) return;
        await workspaceState.deleteWorkspace(ws.name);
        goto(`${base}/workspaces`);
    }
</script>

<div class="config-page">
    <div class="breadcrumb">
        <a href="{base}/workspaces">Workspaces</a>
        <span class="sep">/</span>
        <span>{name}</span>
    </div>

    {#if error}
        <p class="error">{error}</p>
    {:else if !ws}
        <p class="empty">Loading…</p>
    {:else}
        <header class="ws-header">
            <div>
                <h2>{ws.name}</h2>
                <div class="meta">
                    {#if ws.home}<span class="badge home">Home</span>{/if}
                    <span class="theme-chip">Theme: {themeRegistry.getManifest(ws.settings.activeThemeId)?.name ?? ws.settings.activeThemeId}</span>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn" onclick={makeHome} disabled={ws.home}>
                    {ws.home ? 'Is Home' : 'Make Home'}
                </button>
                <button
                    class="btn danger"
                    disabled={ws.name === 'default'}
                    onclick={handleDelete}
                >Delete</button>
            </div>
        </header>

        <section class="section">
            <h3>Rename</h3>
            <form class="inline-form" onsubmit={(e) => { e.preventDefault(); handleRename(); }}>
                <input type="text" bind:value={renameTo} class="input" />
                <button type="submit" class="btn" disabled={!renameTo.trim() || renameTo === ws.name}>Rename</button>
            </form>
        </section>

        <section class="section">
            <h3>Tools</h3>
            <p class="hint">Per-workspace tool assignment lands in the next PR.</p>
        </section>

        <section class="section">
            <h3>Theme</h3>
            <p class="hint">Theme selector for this workspace lands in the next PR.</p>
        </section>
    {/if}
</div>

<style>
    .config-page {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-lg);
    }
    .breadcrumb {
        display: flex;
        gap: var(--pm-space-xs);
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }
    .breadcrumb a {
        color: var(--pm-accent);
        text-decoration: none;
    }
    .breadcrumb .sep { opacity: 0.5; }
    .ws-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--pm-space-md);
    }
    .ws-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }
    .meta {
        margin-top: var(--pm-space-xs);
        display: flex;
        gap: var(--pm-space-sm);
        align-items: center;
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
    }
    .badge {
        font-size: var(--pm-font-size-xs);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
    }
    .badge.home {
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }
    .theme-chip {
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        background-color: var(--pm-bg-tertiary);
    }
    .header-actions { display: flex; gap: var(--pm-space-xs); }
    .section {
        padding: var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-md);
    }
    .section h3 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        margin-bottom: var(--pm-space-sm);
        color: var(--pm-text-secondary);
    }
    .inline-form { display: flex; gap: var(--pm-space-sm); }
    .input {
        flex: 1;
        padding: var(--pm-space-xs) var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
    }
    .btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
    }
    .btn.danger {
        color: var(--pm-status-error);
        border-color: var(--pm-status-error);
        background: none;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .hint {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }
    .error {
        color: var(--pm-status-error);
        font-size: var(--pm-font-size-sm);
    }
    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
    }
</style>
