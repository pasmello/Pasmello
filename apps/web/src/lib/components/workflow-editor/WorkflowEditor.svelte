<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { SvelteFlowProvider } from '@xyflow/svelte';
    import type { Workflow, WorkflowRunResult } from '@pasmello/shared';
    import { executor } from '$lib/workflow/executor';
    import type { NodeProgressStatus } from '$lib/workflow/types';
    import { EditorState } from './state/editor.svelte.js';
    import { editorInstance } from './shared.svelte.js';
    import Canvas from './Canvas.svelte';
    import NodePalette from './NodePalette.svelte';
    import ConfigPanel from './ConfigPanel.svelte';
    import TriggerPanel from './TriggerPanel.svelte';
    import JsonFallback from './JsonFallback.svelte';

    let {
        workflow,
        workspace,
        onsave,
        onrun,
    }: {
        workflow: Workflow;
        workspace: string;
        onsave: (wf: Workflow) => Promise<void>;
        onrun: (result: WorkflowRunResult) => void;
    } = $props();

    const editor = new EditorState();

    onMount(() => {
        editorInstance.current = editor;
    });

    onDestroy(() => {
        if (editorInstance.current === editor) editorInstance.current = null;
    });

    $effect(() => {
        editor.load(workflow);
    });

    let mode = $state<'canvas' | 'json'>('canvas');

    async function save() {
        try {
            editor.message = null;
            await onsave(editor.workflow);
            editor.message = 'Saved.';
        } catch (err) {
            editor.message = `Save failed: ${err instanceof Error ? err.message : err}`;
        }
    }

    async function run() {
        editor.running = true;
        editor.message = null;
        const initial = new Map<string, NodeProgressStatus>();
        for (const n of editor.workflow.nodes) initial.set(n.id, 'pending');
        editor.runStatus = initial;
        try {
            const result = await executor.run(editor.workflow, {
                workspace,
                trigger: { type: 'manual' },
                onNodeProgress: (id, status) => {
                    const next = new Map(editor.runStatus);
                    next.set(id, status);
                    editor.runStatus = next;
                },
            });
            editor.message = result.status === 'success'
                ? 'Run completed.'
                : `Run failed: ${result.error ?? 'unknown'}`;
            onrun(result);
        } catch (err) {
            editor.message = `Run failed: ${err instanceof Error ? err.message : err}`;
        } finally {
            editor.running = false;
        }
    }
</script>

<div class="editor-root">
    <div class="toolbar">
        <div class="tabs">
            <button class:active={mode === 'canvas'} onclick={() => mode = 'canvas'}>Canvas</button>
            <button class:active={mode === 'json'} onclick={() => mode = 'json'}>JSON</button>
        </div>
        <div class="spacer"></div>
        <button onclick={save} disabled={editor.running}>Save</button>
        <button class="primary" onclick={run} disabled={editor.running}>
            {editor.running ? 'Running…' : 'Run'}
        </button>
    </div>

    {#if editor.message}
        <p class="message">{editor.message}</p>
    {/if}

    <div class="layout">
        {#if mode === 'canvas'}
            <NodePalette />
            <div class="center">
                <SvelteFlowProvider>
                    <Canvas {editor} />
                </SvelteFlowProvider>
            </div>
            <div class="right">
                <ConfigPanel {editor} />
                <TriggerPanel {editor} />
            </div>
        {:else}
            <div class="json-layout">
                <JsonFallback {editor} />
            </div>
        {/if}
    </div>
</div>

<style>
    .editor-root {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
        height: 100%;
    }

    .toolbar {
        display: flex;
        gap: var(--pm-space-xs);
        align-items: center;
    }

    .spacer { flex: 1; }

    .tabs {
        display: flex;
        gap: 2px;
        padding: 2px;
        background-color: var(--pm-bg-secondary);
        border-radius: var(--pm-radius-sm);
    }

    .tabs button {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background: none;
        border: none;
        color: var(--pm-text-secondary);
        font-size: var(--pm-font-size-xs);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
    }

    .tabs button.active {
        background-color: var(--pm-bg-surface);
        color: var(--pm-text-primary);
        box-shadow: var(--pm-shadow-sm);
    }

    .toolbar > button {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border);
        color: var(--pm-text-primary);
        border-radius: var(--pm-radius-sm);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
    }

    .toolbar > button.primary {
        background-color: var(--pm-accent);
        border-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }

    .toolbar > button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .message {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-secondary);
    }

    .layout {
        display: flex;
        gap: var(--pm-space-sm);
        min-height: 520px;
        flex: 1;
    }

    .layout > :global(.palette) {
        flex-shrink: 0;
    }

    .center {
        flex: 1;
        min-width: 0;
    }

    .right {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
        width: 300px;
        flex-shrink: 0;
    }

    .json-layout {
        flex: 1;
    }
</style>
