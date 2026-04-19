<script lang="ts">
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import type { WorkflowNode } from '@pasmello/shared';
    import { NODE_TYPE_META } from '../state/palette.js';
    import { editorInstance } from '../shared.svelte.js';

    type Props = NodeProps & { data: { node: WorkflowNode } };

    let { id, data, selected }: Props = $props();

    const meta = $derived(NODE_TYPE_META[data.node.type]);
    const runStatus = $derived(editorInstance.current?.runStatus.get(id));
    const summary = $derived(summarize(data.node));

    function summarize(n: WorkflowNode): string {
        const c = n.config as Record<string, unknown>;
        switch (n.type) {
            case 'tool-action':
                return `${c.toolId || '?'}::${c.action || '?'}`;
            case 'http-request':
                return `${(c.method as string) || 'GET'} ${truncate((c.url as string) || '—', 32)}`;
            case 'code-block':
                return truncate((c.code as string) || '', 40);
            case 'conditional':
                return truncate((c.expression as string) || 'true', 32);
            case 'delay':
                return `wait ${c.ms ?? 0}ms`;
            case 'transform':
                return truncate((c.expression as string) || 'inputs', 40);
            default:
                return '';
        }
    }

    function truncate(s: string, n: number): string {
        if (s.length <= n) return s;
        return s.slice(0, n - 1) + '…';
    }
</script>

<div class="pm-node" class:selected data-status={runStatus ?? 'pending'} style="--accent: var({meta.accentVar});">
    <Handle type="target" position={Position.Left} />

    <div class="head">
        <span class="type-dot"></span>
        <span class="type-label">{meta.label}</span>
        <span class="id">{id}</span>
    </div>
    <div class="body">
        <code class="summary">{summary || '—'}</code>
    </div>

    {#if meta.hasBooleanOutputs}
        <Handle
            type="source"
            position={Position.Right}
            id="true"
            style="top: 38%; background-color: var(--pm-success);"
        />
        <Handle
            type="source"
            position={Position.Right}
            id="false"
            style="top: 72%; background-color: var(--pm-error);"
        />
        <span class="branch-label branch-true">true</span>
        <span class="branch-label branch-false">false</span>
    {:else}
        <Handle type="source" position={Position.Right} />
    {/if}
</div>

<style>
    .pm-node {
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border);
        border-left: 4px solid var(--accent);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-xs) var(--pm-space-sm);
        min-width: 180px;
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-primary);
        box-shadow: var(--pm-shadow-sm);
        position: relative;
    }

    .pm-node.selected {
        box-shadow: 0 0 0 2px var(--pm-accent);
    }

    .pm-node[data-status='running'] {
        box-shadow: 0 0 0 2px var(--pm-accent), var(--pm-shadow-md);
        animation: pulse 1.2s ease-in-out infinite;
    }

    .pm-node[data-status='success'] {
        border-color: var(--pm-success);
    }

    .pm-node[data-status='error'] {
        border-color: var(--pm-error);
        background-color: color-mix(in oklab, var(--pm-error) 8%, var(--pm-bg-surface));
    }

    .pm-node[data-status='skipped'] {
        opacity: 0.45;
        border-style: dashed;
    }

    @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 2px var(--pm-accent); }
        50% { box-shadow: 0 0 0 4px var(--pm-accent-subtle); }
    }

    .head {
        display: flex;
        align-items: center;
        gap: var(--pm-space-xs);
        margin-bottom: 2px;
    }

    .type-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--accent);
    }

    .type-label {
        font-weight: 600;
        color: var(--pm-text-primary);
    }

    .id {
        margin-left: auto;
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
    }

    .body {
        font-family: var(--pm-font-mono);
        color: var(--pm-text-secondary);
    }

    .summary {
        display: block;
        word-break: break-all;
        white-space: pre-wrap;
        max-width: 220px;
    }

    .branch-label {
        position: absolute;
        right: 10px;
        font-size: 10px;
        color: var(--pm-text-tertiary);
        pointer-events: none;
    }

    .branch-true { top: 32%; }
    .branch-false { top: 66%; }
</style>
