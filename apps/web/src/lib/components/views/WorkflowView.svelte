<script lang="ts">
    import { onMount } from 'svelte';
    import { storage } from '$lib/storage';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { executor } from '$lib/workflow/executor';
    import { triggerDispatcher } from '$lib/workflow/triggers';
    import type { Workflow, WorkflowRunResult } from '@pasmello/shared';

    const NEW_WORKFLOW_TEMPLATE = (id: string): Workflow => ({
        id,
        name: id,
        description: '',
        triggers: [{ type: 'manual' }],
        nodes: [
            {
                id: 'fetch',
                type: 'http-request',
                config: { url: 'https://api.github.com' },
            },
        ],
        edges: [],
    });

    let workflows = $state<Workflow[]>([]);
    let selectedId = $state<string | null>(null);
    let editorText = $state('');
    let message = $state<string | null>(null);
    let running = $state(false);
    let runLogs = $state<WorkflowRunResult[]>([]);

    onMount(loadList);

    async function loadList() {
        const ws = workspaceState.currentName;
        workflows = await storage.listWorkflows(ws);
        if (!selectedId && workflows.length > 0) {
            await selectWorkflow(workflows[0].id);
        } else if (selectedId && !workflows.find(w => w.id === selectedId)) {
            selectedId = null;
            editorText = '';
            runLogs = [];
        }
    }

    async function selectWorkflow(id: string) {
        selectedId = id;
        message = null;
        const wf = await storage.getWorkflow(workspaceState.currentName, id);
        if (wf) {
            editorText = JSON.stringify(wf, null, 2);
            runLogs = await storage.listRunLogs(workspaceState.currentName, id, 10);
        }
    }

    async function createWorkflow() {
        const id = prompt('Workflow id (alphanumeric, -_. only):');
        if (!id) return;
        if (!/^[a-zA-Z0-9_\-.]+$/.test(id)) {
            alert('Invalid id');
            return;
        }
        if (await storage.getWorkflow(workspaceState.currentName, id)) {
            alert(`Workflow "${id}" already exists`);
            return;
        }
        const wf = NEW_WORKFLOW_TEMPLATE(id);
        await storage.saveWorkflow(workspaceState.currentName, wf);
        await triggerDispatcher.refresh();
        await loadList();
        await selectWorkflow(id);
    }

    async function save() {
        message = null;
        try {
            const parsed = JSON.parse(editorText) as Workflow;
            if (!parsed.id) throw new Error('workflow.id is required');
            await storage.saveWorkflow(workspaceState.currentName, parsed);
            await triggerDispatcher.refresh();
            await loadList();
            message = 'Saved.';
        } catch (err) {
            message = `Save failed: ${err instanceof Error ? err.message : err}`;
        }
    }

    async function run() {
        message = null;
        running = true;
        try {
            const parsed = JSON.parse(editorText) as Workflow;
            const result = await executor.run(parsed, {
                workspace: workspaceState.currentName,
                trigger: { type: 'manual' },
            });
            runLogs = await storage.listRunLogs(workspaceState.currentName, parsed.id, 10);
            message = result.status === 'success' ? 'Run completed.' : `Run failed: ${result.error ?? 'unknown'}`;
        } catch (err) {
            message = `Run failed: ${err instanceof Error ? err.message : err}`;
        } finally {
            running = false;
        }
    }

    async function remove() {
        if (!selectedId) return;
        if (!confirm(`Delete workflow "${selectedId}"?`)) return;
        await storage.deleteWorkflow(workspaceState.currentName, selectedId);
        await triggerDispatcher.refresh();
        selectedId = null;
        editorText = '';
        runLogs = [];
        await loadList();
    }

    function formatDuration(start: number, end: number): string {
        return `${Math.max(0, end - start)}ms`;
    }

    function formatTime(ts: number): string {
        return new Date(ts).toLocaleTimeString();
    }
</script>

<div class="workflows-page">
    <div class="page-header">
        <h2>Workflows</h2>
        <button class="btn-primary" onclick={createWorkflow}>+ New</button>
    </div>

    <div class="layout">
        <aside class="wf-list">
            {#if workflows.length === 0}
                <p class="empty">No workflows yet.</p>
            {:else}
                {#each workflows as wf (wf.id)}
                    <button
                        class="wf-item"
                        class:active={wf.id === selectedId}
                        onclick={() => selectWorkflow(wf.id)}
                    >
                        <span class="wf-name">{wf.name}</span>
                        <span class="wf-id">{wf.id}</span>
                    </button>
                {/each}
            {/if}
        </aside>

        <section class="editor">
            {#if selectedId}
                <div class="editor-toolbar">
                    <button class="btn" disabled={running} onclick={save}>Save</button>
                    <button class="btn primary" disabled={running} onclick={run}>
                        {running ? 'Running…' : 'Run'}
                    </button>
                    <button class="btn danger" disabled={running} onclick={remove}>Delete</button>
                </div>
                <textarea
                    class="json-editor"
                    bind:value={editorText}
                    spellcheck="false"
                    disabled={running}
                ></textarea>
                {#if message}
                    <p class="message">{message}</p>
                {/if}

                <h3>Recent runs</h3>
                {#if runLogs.length === 0}
                    <p class="empty">No runs yet.</p>
                {:else}
                    <ul class="runs">
                        {#each runLogs as log (log.runId)}
                            <li class="run" class:run-error={log.status === 'error'}>
                                <div class="run-head">
                                    <span class="run-status">{log.status}</span>
                                    <span class="run-time">{formatTime(log.startedAt)}</span>
                                    <span class="run-duration">{formatDuration(log.startedAt, log.finishedAt)}</span>
                                </div>
                                {#if log.error}
                                    <p class="run-error-msg">{log.error}</p>
                                {/if}
                                <ol class="run-nodes">
                                    {#each log.nodes as n (n.nodeId)}
                                        <li class="run-node" class:err={n.status === 'error'}>
                                            <code>{n.nodeId}</code>
                                            <span class="run-node-status">{n.status}</span>
                                            {#if n.error}
                                                <span class="run-node-err">{n.error}</span>
                                            {/if}
                                        </li>
                                    {/each}
                                </ol>
                            </li>
                        {/each}
                    </ul>
                {/if}
            {:else}
                <p class="empty">Create or select a workflow to edit.</p>
            {/if}
        </section>
    </div>
</div>

<style>
    .workflows-page {
        height: 100%;
    }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--pm-space-lg);
    }

    .page-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .btn-primary,
    .btn.primary {
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        border: none;
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-md);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
    }

    .layout {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: var(--pm-space-lg);
        align-items: flex-start;
    }

    .wf-list {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
    }

    .wf-item {
        text-align: left;
        background: none;
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-sm) var(--pm-space-md);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
        color: var(--pm-text-primary);
    }

    .wf-item.active {
        border-color: var(--pm-accent);
        background-color: var(--pm-accent-subtle);
    }

    .wf-name {
        font-size: var(--pm-font-size-sm);
        font-weight: 500;
    }

    .wf-id {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
    }

    .editor {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
    }

    .editor-toolbar {
        display: flex;
        gap: var(--pm-space-sm);
    }

    .btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
        color: var(--pm-text-primary);
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

    .json-editor {
        width: 100%;
        min-height: 320px;
        font-family: var(--pm-font-mono);
        font-size: var(--pm-font-size-sm);
        padding: var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        resize: vertical;
    }

    .message {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-secondary);
    }

    h3 {
        margin-top: var(--pm-space-md);
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        color: var(--pm-text-secondary);
    }

    .runs {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
    }

    .run {
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-sm);
        background-color: var(--pm-bg-surface);
    }

    .run.run-error {
        border-color: var(--pm-status-error);
    }

    .run-head {
        display: flex;
        gap: var(--pm-space-md);
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-secondary);
    }

    .run-status {
        font-weight: 600;
        text-transform: uppercase;
    }

    .run-error-msg {
        color: var(--pm-status-error);
        font-size: var(--pm-font-size-xs);
        margin-top: var(--pm-space-xs);
    }

    .run-nodes {
        list-style: none;
        padding: 0;
        margin-top: var(--pm-space-xs);
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .run-node {
        display: flex;
        gap: var(--pm-space-sm);
        font-size: var(--pm-font-size-xs);
        font-family: var(--pm-font-mono);
        color: var(--pm-text-tertiary);
    }

    .run-node.err {
        color: var(--pm-status-error);
    }

    .run-node-err {
        color: var(--pm-status-error);
    }

    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
    }
</style>
