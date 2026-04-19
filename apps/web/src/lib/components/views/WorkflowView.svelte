<script lang="ts">
    import { onMount } from 'svelte';
    import { storage } from '$lib/storage';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { triggerDispatcher } from '$lib/workflow/triggers';
    import type { Workflow, WorkflowRunResult } from '@pasmello/shared';
    import WorkflowEditor from '$lib/components/workflow-editor/WorkflowEditor.svelte';

    const NEW_WORKFLOW_TEMPLATE = (id: string): Workflow => ({
        id,
        name: id,
        description: '',
        triggers: [{ type: 'manual' }],
        nodes: [],
        edges: [],
    });

    let workflows = $state<Workflow[]>([]);
    let selectedId = $state<string | null>(null);
    let selectedWorkflow = $state<Workflow | null>(null);
    let runLogs = $state<WorkflowRunResult[]>([]);

    onMount(loadList);

    async function loadList() {
        const ws = workspaceState.currentName;
        workflows = await storage.listWorkflows(ws);
        if (!selectedId && workflows.length > 0) {
            await selectWorkflow(workflows[0].id);
        } else if (selectedId && !workflows.find(w => w.id === selectedId)) {
            selectedId = null;
            selectedWorkflow = null;
            runLogs = [];
        }
    }

    async function selectWorkflow(id: string) {
        selectedId = id;
        const wf = await storage.getWorkflow(workspaceState.currentName, id);
        if (wf) {
            selectedWorkflow = wf;
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

    async function onSave(wf: Workflow) {
        await storage.saveWorkflow(workspaceState.currentName, wf);
        await triggerDispatcher.refresh();
        selectedWorkflow = wf;
        workflows = workflows.map((w) => (w.id === wf.id ? wf : w));
    }

    async function onRun(_result: WorkflowRunResult) {
        void _result;
        if (selectedId) {
            runLogs = await storage.listRunLogs(workspaceState.currentName, selectedId, 10);
        }
    }

    async function remove() {
        if (!selectedId) return;
        if (!confirm(`Delete workflow "${selectedId}"?`)) return;
        await storage.deleteWorkflow(workspaceState.currentName, selectedId);
        await triggerDispatcher.refresh();
        selectedId = null;
        selectedWorkflow = null;
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

            {#if selectedId}
                <button class="btn danger" onclick={remove}>Delete workflow</button>
            {/if}
        </aside>

        <section class="editor">
            {#if selectedWorkflow}
                {#key selectedWorkflow.id}
                    <WorkflowEditor
                        workflow={selectedWorkflow}
                        workspace={workspaceState.currentName}
                        onsave={onSave}
                        onrun={onRun}
                    />
                {/key}

                <details class="runs-details">
                    <summary>Recent runs ({runLogs.length})</summary>
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
                </details>
            {:else}
                <p class="empty">Create or select a workflow to edit.</p>
            {/if}
        </section>
    </div>
</div>

<style>
    .workflows-page {
        height: 100%;
        display: flex;
        flex-direction: column;
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

    .btn-primary {
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
        grid-template-columns: 200px 1fr;
        gap: var(--pm-space-lg);
        align-items: stretch;
        flex: 1;
        min-height: 0;
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
        min-width: 0;
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
        color: var(--pm-error);
        border-color: var(--pm-error);
        background: none;
        margin-top: var(--pm-space-sm);
    }

    .runs-details {
        margin-top: var(--pm-space-md);
    }

    .runs-details summary {
        cursor: pointer;
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
        margin-top: var(--pm-space-sm);
    }

    .run {
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-sm);
        background-color: var(--pm-bg-surface);
    }

    .run.run-error {
        border-color: var(--pm-error);
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
        color: var(--pm-error);
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
        color: var(--pm-error);
    }

    .run-node-err {
        color: var(--pm-error);
    }

    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
    }
</style>
