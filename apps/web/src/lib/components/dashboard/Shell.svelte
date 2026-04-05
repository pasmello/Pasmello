<script lang="ts">
    import { theme } from '$lib/theme/theme.svelte';

    let { children } = $props();
</script>

<div class="shell" data-theme={theme.current}>
    <aside class="sidebar">
        <div class="sidebar-header">
            <h1 class="logo">Pasmello</h1>
        </div>
        <nav class="sidebar-nav">
            <a href="/" class="nav-item active">
                <span class="nav-icon">&#9633;</span>
                <span>Workspace</span>
            </a>
            <a href="/tools" class="nav-item">
                <span class="nav-icon">&#9881;</span>
                <span>Tools</span>
            </a>
            <a href="/settings" class="nav-item">
                <span class="nav-icon">&#9881;</span>
                <span>Settings</span>
            </a>
        </nav>
        <div class="sidebar-footer">
            <button class="theme-toggle" onclick={() => theme.toggle()}>
                {theme.current === 'dark' ? '☀️' : '🌙'}
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
        width: var(--pm-sidebar-width);
        background-color: var(--pm-bg-secondary);
        border-right: 1px solid var(--pm-border-subtle);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
    }

    .sidebar-header {
        padding: var(--pm-space-md);
        border-bottom: 1px solid var(--pm-border-subtle);
    }

    .logo {
        font-size: var(--pm-font-size-lg);
        font-weight: 700;
        color: var(--pm-accent);
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
    }

    .sidebar-footer {
        padding: var(--pm-space-md);
        border-top: 1px solid var(--pm-border-subtle);
    }

    .theme-toggle {
        background: none;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-base);
    }

    .content {
        flex: 1;
        overflow-y: auto;
        padding: var(--pm-space-lg);
        background-color: var(--pm-bg-primary);
    }
</style>
