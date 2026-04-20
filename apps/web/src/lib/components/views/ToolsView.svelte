<script lang="ts">
    import { onMount } from 'svelte';
    import { toolsState } from '$lib/state/tools.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import {
        installFromZip,
        installFromUrl,
        ToolInstallError,
        ToolInstallCancelled,
        type ConsentProvider,
    } from '$lib/tools/install';
    import type { ToolManifest } from '@pasmello/shared';
    import PermissionsConsentModal from '$lib/components/PermissionsConsentModal.svelte';

    let consentRequest = $state<{ manifest: ToolManifest; resolve: (ok: boolean) => void } | null>(null);

    const consentProvider: ConsentProvider = (manifest) =>
        new Promise<boolean>((resolve) => {
            consentRequest = { manifest, resolve };
        });

    function resolveConsent(accepted: boolean) {
        const req = consentRequest;
        if (!req) return;
        consentRequest = null;
        req.resolve(accepted);
    }

    let installUrl = $state('');
    let installing = $state(false);
    let installError = $state<string | null>(null);
    let dragActive = $state(false);
    let fileInput: HTMLInputElement;

    onMount(async () => {
        await toolsState.loadTools();
        await workspaceState.loadWorkspace(workspaceState.currentName);
    });

    function isInWorkspace(toolId: string): boolean {
        return workspaceState.current?.tools.some(t => t.toolName === toolId) ?? false;
    }

    async function addToWorkspace(tool: ToolManifest) {
        const ws = workspaceState.current;
        if (!ws || isInWorkspace(tool.id)) return;

        ws.tools = [...ws.tools, { id: `${tool.id}-${Date.now()}`, toolName: tool.id }];

        const maxY = ws.layout.items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        ws.layout.items = [...ws.layout.items, {
            toolId: tool.id,
            x: 0,
            y: maxY,
            w: 6,
            h: 4,
        }];

        await workspaceState.updateWorkspace(ws);
    }

    async function removeFromWorkspace(toolId: string) {
        const ws = workspaceState.current;
        if (!ws) return;

        ws.tools = ws.tools.filter(t => t.toolName !== toolId);
        ws.layout.items = ws.layout.items.filter(item => item.toolId !== toolId);
        await workspaceState.updateWorkspace(ws);
    }

    async function runInstall(action: () => Promise<ToolManifest>) {
        installing = true;
        installError = null;
        try {
            await action();
            await toolsState.loadTools();
        } catch (err) {
            if (err instanceof ToolInstallCancelled) {
                // Silent cancel — user clicked Cancel on the consent prompt.
            } else if (err instanceof ToolInstallError || err instanceof Error) {
                installError = err.message;
            } else {
                installError = String(err);
            }
        } finally {
            installing = false;
        }
    }

    async function handleFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        for (const file of Array.from(fileList)) {
            await runInstall(() => installFromZip(file, { consentProvider }));
        }
    }

    async function handleUrl() {
        const url = installUrl.trim();
        if (!url) return;
        await runInstall(() => installFromUrl(url, { consentProvider }));
        if (!installError) installUrl = '';
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        dragActive = false;
        handleFiles(e.dataTransfer?.files ?? null);
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault();
        dragActive = true;
    }

    function onDragLeave() {
        dragActive = false;
    }

    let hasTools = $derived(toolsState.installed.length > 0);
</script>

<div class="tools-page">
    <div class="tools-header">
        <h2>Tools</h2>
    </div>

    {#if toolsState.error}
        <div class="error-banner">
            <p>{toolsState.error}</p>
            <button onclick={() => toolsState.loadTools()}>Retry</button>
        </div>
    {/if}

    <div
        class="install-section"
        class:drag-active={dragActive}
        ondrop={onDrop}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        role="region"
        aria-label="Install tool"
    >
        <h3>Install Tool</h3>
        <div class="install-row">
            <button
                type="button"
                class="install-btn"
                onclick={() => fileInput.click()}
                disabled={installing}
            >Upload zip</button>
            <input
                bind:this={fileInput}
                type="file"
                accept=".zip,application/zip"
                multiple
                hidden
                onchange={(e) => handleFiles((e.currentTarget as HTMLInputElement).files)}
            />
            <span class="install-or">or drop a zip here, or paste a URL</span>
        </div>
        <form class="install-row" onsubmit={(e) => { e.preventDefault(); handleUrl(); }}>
            <input
                type="url"
                bind:value={installUrl}
                placeholder="https://example.com/my-tool.zip"
                class="install-input"
                disabled={installing}
            />
            <button type="submit" class="install-btn" disabled={installing || !installUrl.trim()}>
                Install from URL
            </button>
        </form>
        {#if installError}
            <p class="install-error">{installError}</p>
        {/if}
    </div>

    {#if toolsState.loading}
        <div class="loading-state">
            <p>Loading tools...</p>
        </div>
    {:else if hasTools}
        <div class="tools-grid">
            {#each toolsState.installed as tool (tool.id)}
                <div class="tool-card">
                    <div class="tool-info">
                        <h3 class="tool-name">{tool.name}</h3>
                        <span class="tool-version">v{tool.version}</span>
                    </div>
                    <p class="tool-description">{tool.description}</p>
                    <div class="tool-actions">
                        {#if isInWorkspace(tool.id)}
                            <button class="btn-remove" onclick={() => removeFromWorkspace(tool.id)}>
                                Remove from workspace
                            </button>
                        {:else}
                            <button class="btn-add" onclick={() => addToWorkspace(tool)}>
                                Add to workspace
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>No tools installed yet.</p>
            <p class="hint">Install a tool using the form above or run <code>pasmello tool install ./path</code></p>
        </div>
    {/if}
</div>

{#if consentRequest}
    <PermissionsConsentModal
        manifest={consentRequest.manifest}
        kind="tool"
        onresolve={resolveConsent}
    />
{/if}

<style>
    .tools-page {
        height: 100%;
    }

    .tools-header {
        margin-bottom: var(--pm-space-lg);
    }

    .tools-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .install-section {
        margin-bottom: var(--pm-space-lg);
        padding: var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border-radius: var(--pm-radius-md);
        border: 1px solid var(--pm-border-subtle);
    }

    .install-section h3 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        margin-bottom: var(--pm-space-sm);
        color: var(--pm-text-secondary);
    }

    .install-section.drag-active {
        border-color: var(--pm-accent);
        background-color: var(--pm-bg-tertiary);
    }

    .install-row {
        display: flex;
        align-items: center;
        gap: var(--pm-space-sm);
        margin-top: var(--pm-space-sm);
    }

    .install-or {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
    }

    .install-input {
        flex: 1;
        padding: var(--pm-space-xs) var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        font-size: var(--pm-font-size-sm);
        font-family: var(--pm-font-mono);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
    }

    .install-btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        border: none;
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
    }

    .install-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .install-error {
        margin-top: var(--pm-space-sm);
        color: var(--pm-status-error);
        font-size: var(--pm-font-size-sm);
    }

    .error-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--pm-space-sm) var(--pm-space-md);
        margin-bottom: var(--pm-space-md);
        background-color: var(--pm-status-error);
        color: var(--pm-text-inverse);
        border-radius: var(--pm-radius-sm);
    }

    .error-banner button {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        background-color: rgba(255, 255, 255, 0.2);
        color: inherit;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--pm-space-2xl);
        color: var(--pm-text-secondary);
    }

    .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--pm-space-md);
    }

    .tool-card {
        padding: var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-md);
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
    }

    .tool-info {
        display: flex;
        align-items: baseline;
        gap: var(--pm-space-sm);
    }

    .tool-name {
        font-size: var(--pm-font-size-base);
        font-weight: 600;
    }

    .tool-version {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
    }

    .tool-description {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
        flex: 1;
    }

    .tool-actions {
        display: flex;
        gap: var(--pm-space-sm);
    }

    .btn-add {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        border: none;
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
    }

    .btn-remove {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        background-color: transparent;
        color: var(--pm-status-error);
        border: 1px solid var(--pm-status-error);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
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

    code {
        font-family: var(--pm-font-mono);
        background-color: var(--pm-bg-tertiary);
        padding: 2px 6px;
        border-radius: var(--pm-radius-sm);
        font-size: var(--pm-font-size-sm);
    }
</style>
