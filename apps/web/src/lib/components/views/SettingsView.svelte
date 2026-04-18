<script lang="ts">
    import { onMount } from 'svelte';
    import { themeSettings } from '$lib/theme/settings.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import { downloadStorageZip, importStorageZip } from '$lib/storage/portable';
    import ThemeSettingsRenderer from './ThemeSettingsRenderer.svelte';

    let newWorkspaceName = $state('');
    let createError = $state<string | null>(null);
    let backupBusy = $state(false);
    let backupMessage = $state<string | null>(null);
    let importInput: HTMLInputElement;

    onMount(async () => {
        await workspaceState.loadWorkspaces();
    });

    async function handleCreate() {
        if (!newWorkspaceName.trim()) return;
        createError = null;
        await workspaceState.createWorkspace(newWorkspaceName.trim());
        if (workspaceState.error) {
            createError = workspaceState.error;
        } else {
            newWorkspaceName = '';
        }
    }

    async function switchTo(name: string) {
        await workspaceState.switchWorkspace(name);
        bridgeManager.init(name);
    }

    async function handleExport() {
        backupBusy = true;
        backupMessage = null;
        try {
            await downloadStorageZip();
            backupMessage = 'Export downloaded.';
        } catch (err) {
            backupMessage = `Export failed: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            backupBusy = false;
        }
    }

    async function handleImport(file: File | null) {
        if (!file) return;
        if (!confirm('Import will overwrite matching files in storage. Continue?')) return;
        backupBusy = true;
        backupMessage = null;
        try {
            await importStorageZip(file);
            backupMessage = 'Import complete. Reload the page to see changes.';
        } catch (err) {
            backupMessage = `Import failed: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            backupBusy = false;
        }
    }

    let activeManifest = $derived(themeRegistry.activeManifest);
    let hasThemeSettings = $derived(
        activeManifest?.settings != null && activeManifest.settings.length > 0
    );
</script>

<div class="settings-page">
    <div class="page-header">
        <h2>Settings</h2>
    </div>
    <div class="settings-sections">
        <!-- Theme Selector -->
        <section class="setting-group">
            <h3>Theme</h3>
            <div class="theme-cards">
                {#each themeRegistry.all as themeDef (themeDef.manifest.id)}
                    <div
                        class="theme-card"
                        class:active={themeSettings.activeThemeId === themeDef.manifest.id}
                    >
                        <div class="theme-card-info">
                            <span class="theme-card-name">{themeDef.manifest.name}</span>
                            <span class="theme-card-desc">{themeDef.manifest.description}</span>
                        </div>
                        {#if themeSettings.activeThemeId === themeDef.manifest.id}
                            <span class="theme-badge">Active</span>
                        {:else}
                            <button
                                class="theme-use-btn"
                                onclick={() => themeSettings.setActiveTheme(themeDef.manifest.id)}
                            >
                                Use
                            </button>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>

        <!-- Color Scheme -->
        <section class="setting-group">
            <h3>Appearance</h3>
            <div class="setting-row">
                <div class="setting-info">
                    <span class="setting-label">Color Scheme</span>
                    <span class="setting-description">Switch between light and dark mode</span>
                </div>
                <button class="setting-control" onclick={() => themeSettings.toggleColorScheme()}>
                    {themeSettings.colorScheme === 'dark' ? 'Dark' : 'Light'}
                </button>
            </div>
        </section>

        <!-- Theme-Specific Settings -->
        {#if hasThemeSettings && activeManifest}
            <section class="setting-group">
                <h3>{activeManifest.name} Settings</h3>
                <ThemeSettingsRenderer
                    settings={activeManifest.settings!}
                    themeId={activeManifest.id}
                />
            </section>
        {/if}

        <!-- Workspaces -->
        <section class="setting-group">
            <h3>Workspaces</h3>
            <div class="workspace-list">
                {#each workspaceState.workspaces as ws (ws)}
                    <div class="workspace-item" class:active={ws === workspaceState.currentName}>
                        <span class="workspace-name">{ws}</span>
                        {#if ws === workspaceState.currentName}
                            <span class="workspace-badge">current</span>
                        {:else}
                            <button class="btn-switch" onclick={() => switchTo(ws)}>Switch</button>
                        {/if}
                        {#if ws !== 'default'}
                            <button class="btn-delete" onclick={() => workspaceState.deleteWorkspace(ws)}>Delete</button>
                        {/if}
                    </div>
                {/each}
            </div>

            <form class="create-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                <input
                    type="text"
                    bind:value={newWorkspaceName}
                    placeholder="New workspace name..."
                    class="create-input"
                />
                <button type="submit" class="create-btn" disabled={!newWorkspaceName.trim()}>Create</button>
            </form>
            {#if createError}
                <p class="create-error">{createError}</p>
            {/if}
        </section>

        <!-- Backup -->
        <section class="setting-group">
            <h3>Backup</h3>
            <p class="backup-hint">
                Storage lives inside the browser (OPFS). Export to keep a portable zip backup;
                import to restore on another browser or device.
            </p>
            <div class="backup-actions">
                <button class="setting-control" disabled={backupBusy} onclick={handleExport}>
                    Export storage as zip
                </button>
                <button
                    class="setting-control"
                    disabled={backupBusy}
                    onclick={() => importInput.click()}
                >
                    Import zip
                </button>
                <input
                    bind:this={importInput}
                    type="file"
                    accept=".zip,application/zip"
                    hidden
                    onchange={(e) => handleImport(((e.currentTarget as HTMLInputElement).files ?? [null])[0])}
                />
            </div>
            {#if backupMessage}
                <p class="backup-message">{backupMessage}</p>
            {/if}
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

    /* Theme Cards */
    .theme-cards {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
    }

    .theme-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--pm-space-sm) var(--pm-space-md);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        transition: all var(--pm-transition-fast);
    }

    .theme-card.active {
        border-color: var(--pm-accent);
        background-color: var(--pm-accent-subtle);
    }

    .theme-card-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .theme-card-name {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        color: var(--pm-text-primary);
    }

    .theme-card-desc {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
    }

    .theme-badge {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-accent);
        background-color: var(--pm-bg-primary);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        font-weight: 500;
    }

    .theme-use-btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-secondary);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
        transition: all var(--pm-transition-fast);
    }

    .theme-use-btn:hover {
        background-color: var(--pm-accent-subtle);
        border-color: var(--pm-accent);
        color: var(--pm-accent);
    }

    /* Setting Row */
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

    /* Workspaces */
    .workspace-list {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        margin-bottom: var(--pm-space-md);
    }

    .workspace-item {
        display: flex;
        align-items: center;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-sm) var(--pm-space-md);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
    }

    .workspace-item.active {
        border-color: var(--pm-accent);
        background-color: var(--pm-accent-subtle);
    }

    .workspace-name {
        flex: 1;
        font-size: var(--pm-font-size-sm);
        font-weight: 500;
    }

    .workspace-badge {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-accent);
        background-color: var(--pm-bg-primary);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
    }

    .btn-switch {
        padding: 2px var(--pm-space-sm);
        background: none;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-secondary);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
    }

    .btn-switch:hover {
        border-color: var(--pm-accent);
        color: var(--pm-accent);
    }

    .btn-delete {
        padding: 2px var(--pm-space-sm);
        background: none;
        border: 1px solid transparent;
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-tertiary);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
    }

    .btn-delete:hover {
        color: var(--pm-status-error);
        border-color: var(--pm-status-error);
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
        font-size: var(--pm-font-size-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
    }

    .create-input::placeholder {
        color: var(--pm-text-tertiary);
    }

    .create-btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        border: none;
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
    }

    .create-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .create-error {
        margin-top: var(--pm-space-xs);
        font-size: var(--pm-font-size-xs);
        color: var(--pm-status-error);
    }

    .backup-hint {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        margin-bottom: var(--pm-space-sm);
    }

    .backup-actions {
        display: flex;
        gap: var(--pm-space-sm);
        flex-wrap: wrap;
    }

    .backup-message {
        margin-top: var(--pm-space-sm);
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-secondary);
    }
</style>
