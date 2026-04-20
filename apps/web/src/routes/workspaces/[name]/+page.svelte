<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { base } from '$app/paths';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { toolsState } from '$lib/state/tools.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { api } from '$lib/api/client';
    import type { Workspace, ToolManifest } from '@pasmello/shared';

    let ws = $state<Workspace | null>(null);
    let name = $derived($page.params.name ?? '');
    let error = $state<string | null>(null);
    let renameTo = $state('');

    onMount(async () => {
        await toolsState.loadTools();
        await load();
    });

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

    async function persist(next: Workspace) {
        ws = next;
        await workspaceState.updateWorkspace(next);
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
        if (!ws || ws.name === 'default') return;
        if (!confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) return;
        await workspaceState.deleteWorkspace(ws.name);
        goto(`${base}/workspaces`);
    }

    function isInWorkspace(toolId: string): boolean {
        return ws?.tools.some((t) => t.toolName === toolId) ?? false;
    }

    async function toggleTool(tool: ToolManifest, enabled: boolean) {
        if (!ws) return;
        const nextTools = enabled
            ? ws.tools.some((t) => t.toolName === tool.id)
                ? ws.tools
                : [...ws.tools, { id: `${tool.id}-${Date.now()}`, toolName: tool.id }]
            : ws.tools.filter((t) => t.toolName !== tool.id);

        let nextItems = ws.layout.items;
        if (enabled && tool.widget) {
            if (!nextItems.some((it) => it.toolId === tool.id)) {
                const maxY = nextItems.reduce((m, it) => Math.max(m, it.y + it.h), 0);
                nextItems = [
                    ...nextItems,
                    {
                        toolId: tool.id,
                        x: 0,
                        y: maxY,
                        w: tool.widget.defaultSize.w,
                        h: tool.widget.defaultSize.h,
                    },
                ];
            }
        } else if (!enabled) {
            nextItems = nextItems.filter((it) => it.toolId !== tool.id);
        }

        await persist({ ...ws, tools: nextTools, layout: { ...ws.layout, items: nextItems } });
    }

    async function setTheme(themeId: string) {
        if (!ws) return;
        await persist({ ...ws, settings: { ...ws.settings, activeThemeId: themeId } });
    }

    async function toggleColorScheme() {
        if (!ws) return;
        const scheme = ws.settings.colorScheme === 'dark' ? 'light' : 'dark';
        await persist({ ...ws, settings: { ...ws.settings, colorScheme: scheme } });
    }

    const widgetTools = $derived(toolsState.installed.filter((t) => t.widget));
    const workflowTools = $derived(toolsState.installed.filter((t) => !t.widget));
    const themes = $derived(themeRegistry.all);
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
                    <span>·</span>
                    <span>{ws.settings.colorScheme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
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
            <h3>Theme</h3>
            <div class="theme-row">
                <select
                    class="input"
                    value={ws.settings.activeThemeId}
                    onchange={(e) => setTheme((e.currentTarget as HTMLSelectElement).value)}
                >
                    {#each themes as t (t.manifest.id)}
                        <option value={t.manifest.id}>{t.manifest.name}</option>
                    {/each}
                </select>
                <button class="btn" onclick={toggleColorScheme}>
                    Switch to {ws.settings.colorScheme === 'dark' ? 'Light' : 'Dark'}
                </button>
            </div>
        </section>

        <section class="section">
            <h3>Widgets</h3>
            {#if widgetTools.length === 0}
                <p class="hint">No widget-capable tools installed.</p>
            {:else}
                <ul class="tool-list">
                    {#each widgetTools as tool (tool.id)}
                        <li>
                            <label class="tool-row">
                                <input
                                    type="checkbox"
                                    checked={isInWorkspace(tool.id)}
                                    onchange={(e) => toggleTool(tool, (e.currentTarget as HTMLInputElement).checked)}
                                />
                                <div class="tool-info">
                                    <span class="tool-name">{tool.name}</span>
                                    <span class="tool-id">{tool.id}</span>
                                </div>
                                <span class="tool-size">
                                    {tool.widget!.defaultSize.w}×{tool.widget!.defaultSize.h} default
                                </span>
                            </label>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <section class="section">
            <h3>Workflow-only tools</h3>
            {#if workflowTools.length === 0}
                <p class="hint">No workflow-only tools installed.</p>
            {:else}
                <ul class="tool-list">
                    {#each workflowTools as tool (tool.id)}
                        <li>
                            <label class="tool-row">
                                <input
                                    type="checkbox"
                                    checked={isInWorkspace(tool.id)}
                                    onchange={(e) => toggleTool(tool, (e.currentTarget as HTMLInputElement).checked)}
                                />
                                <div class="tool-info">
                                    <span class="tool-name">{tool.name}</span>
                                    <span class="tool-id">{tool.id}</span>
                                </div>
                                <span class="tool-kind">Workflow only</span>
                            </label>
                        </li>
                    {/each}
                </ul>
            {/if}
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
    .theme-row {
        display: flex;
        gap: var(--pm-space-sm);
        align-items: center;
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
    .tool-list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
    }
    .tool-row {
        display: flex;
        align-items: center;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-sm);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
    }
    .tool-row:hover {
        background-color: var(--pm-bg-tertiary);
    }
    .tool-info {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: var(--pm-space-sm);
    }
    .tool-name { font-weight: 500; }
    .tool-id {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
    }
    .tool-size, .tool-kind {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
    }
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
