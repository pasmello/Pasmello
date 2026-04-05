<script lang="ts">
    import { theme } from '$lib/theme/theme.svelte';
</script>

<div class="settings-page">
    <div class="page-header">
        <h2>Settings</h2>
    </div>
    <div class="settings-sections">
        <section class="setting-group">
            <h3>Appearance</h3>
            <div class="setting-row">
                <div class="setting-info">
                    <span class="setting-label">Theme</span>
                    <span class="setting-description">Switch between light and dark mode</span>
                </div>
                <button class="setting-control" onclick={() => theme.toggle()}>
                    {theme.current === 'dark' ? 'Dark' : 'Light'}
                </button>
            </div>
        </section>
        <section class="setting-group">
            <h3>Workspaces</h3>
            <div class="setting-row">
                <div class="setting-info">
                    <span class="setting-label">Current Workspace</span>
                    <span class="setting-description">default</span>
                </div>
            </div>
        </section>
    </div>
</div>

<style>
    .settings-page {
        max-width: 640px;
    }

    .page-header {
        margin-bottom: var(--pm-space-lg);
    }

    .page-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .settings-sections {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xl);
    }

    .setting-group h3 {
        font-size: var(--pm-font-size-lg);
        font-weight: 600;
        margin-bottom: var(--pm-space-md);
        padding-bottom: var(--pm-space-sm);
        border-bottom: 1px solid var(--pm-border-subtle);
    }

    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--pm-space-sm) 0;
    }

    .setting-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .setting-label {
        font-size: var(--pm-font-size-sm);
        font-weight: 500;
    }

    .setting-description {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
    }

    .setting-control {
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-md);
        color: var(--pm-text-primary);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
        transition: all var(--pm-transition-fast);
    }

    .setting-control:hover {
        background-color: var(--pm-accent-subtle);
        border-color: var(--pm-accent);
    }
</style>
