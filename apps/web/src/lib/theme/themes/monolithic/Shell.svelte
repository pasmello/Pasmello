<script lang="ts">
    import type { Snippet } from 'svelte';
    import { pluginSettings } from '$lib/state/plugin-settings.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';

    interface Props {
        currentView: 'workspace' | 'tools' | 'workflows' | 'themes' | 'settings';
        children: Snippet;
    }

    let { currentView, children }: Props = $props();
    let collapsed = $state(false);
</script>

<div class="shell">
    <aside class="sidebar" class:collapsed style="width: {collapsed ? '56px' : '240px'}">
        <div class="sidebar-header">
            {#if !collapsed}
                <h1 class="logo">Pasmello</h1>
                <p class="workspace-name">{workspaceState.currentName}</p>
            {:else}
                <span class="logo-icon">P</span>
            {/if}
        </div>
        <nav class="sidebar-nav">
            <a href="/" class="nav-item" class:active={currentView === 'workspace'}>
                <span class="nav-icon">&#9633;</span>
                <span class="nav-text">Workspace</span>
            </a>
            <a href="/tools" class="nav-item" class:active={currentView === 'tools'}>
                <span class="nav-icon">&#128295;</span>
                <span class="nav-text">Tools</span>
            </a>
            <a href="/workflows" class="nav-item" class:active={currentView === 'workflows'}>
                <span class="nav-icon">&#8644;</span>
                <span class="nav-text">Workflows</span>
            </a>
            <a href="/themes" class="nav-item" class:active={currentView === 'themes'}>
                <span class="nav-icon">&#127912;</span>
                <span class="nav-text">Themes</span>
            </a>
            <a href="/settings" class="nav-item" class:active={currentView === 'settings'}>
                <span class="nav-icon">&#9881;</span>
                <span class="nav-text">Settings</span>
            </a>
        </nav>
        <div class="sidebar-footer">
            <button class="theme-toggle" onclick={() => pluginSettings.toggleColorScheme()}>
                {pluginSettings.colorScheme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button class="collapse-toggle" onclick={() => collapsed = !collapsed}>
                {collapsed ? '\u25B6' : '\u25C0'}
            </button>
        </div>
    </aside>
    <main class="content">
        {@render children()}
    </main>
</div>

<style>
    .shell {
        display: flex;
        height: 100vh;
        overflow: hidden;
    }

    .sidebar {
        background-color: var(--pm-bg-secondary);
        border-right: 1px solid var(--pm-border-subtle);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
    }

    .sidebar-header {
        padding: var(--pm-space-md);
        border-bottom: 1px solid var(--pm-border-subtle);
        white-space: nowrap;
        overflow: hidden;
        min-height: 60px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .logo {
        font-size: var(--pm-font-size-lg);
        font-weight: 700;
        color: var(--pm-accent);
    }

    .logo-icon {
        font-size: var(--pm-font-size-lg);
        font-weight: 700;
        color: var(--pm-accent);
        display: flex;
        justify-content: center;
    }

    .workspace-name {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        margin-top: var(--pm-space-xs);
    }

    .sidebar-nav {
        flex: 1;
        padding: var(--pm-space-sm);
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-sm) var(--pm-space-md);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-secondary);
        transition: all var(--pm-transition-fast);
        font-size: var(--pm-font-size-sm);
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
    }

    .nav-item:hover {
        background-color: var(--pm-bg-tertiary);
        color: var(--pm-text-primary);
    }

    .nav-item.active {
        background-color: var(--pm-accent-subtle);
        color: var(--pm-accent);
    }

    .nav-icon {
        font-size: var(--pm-font-size-lg);
        width: 20px;
        text-align: center;
        flex-shrink: 0;
    }

    .nav-text {
        overflow: hidden;
        white-space: nowrap;
    }

    .collapsed .nav-item {
        padding: var(--pm-space-sm);
        justify-content: center;
    }

    .collapsed .nav-text {
        width: 0;
        opacity: 0;
    }

    .sidebar-footer {
        padding: var(--pm-space-md);
        border-top: 1px solid var(--pm-border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pm-space-xs);
    }

    .collapsed .sidebar-footer {
        flex-direction: column;
        padding: var(--pm-space-sm);
    }

    .theme-toggle {
        background: none;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-base);
    }

    .collapse-toggle {
        background: none;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
        transition: all var(--pm-transition-fast);
    }

    .collapse-toggle:hover {
        color: var(--pm-text-primary);
        border-color: var(--pm-accent);
    }

    .content {
        flex: 1;
        overflow-y: auto;
        padding: var(--pm-space-lg);
        background-color: var(--pm-bg-primary);
    }
</style>
