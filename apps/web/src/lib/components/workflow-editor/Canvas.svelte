<script lang="ts">
    import {
        SvelteFlow,
        Background,
        Controls,
        useSvelteFlow,
        type Connection,
    } from '@xyflow/svelte';
    import type { Edge, Node } from '@xyflow/svelte';
    import type { WorkflowNodeType } from '@pasmello/shared';
    import BaseNode from './nodes/BaseNode.svelte';
    import type { EditorState } from './state/editor.svelte.js';
    import { edgeKey, workflowToFlow, type FlowEdge, type FlowNode } from './state/serialize.js';

    let { editor }: { editor: EditorState } = $props();

    const nodeTypes = { pasmello: BaseNode as never };

    let flowNodes = $state<FlowNode[]>([]);
    let flowEdges = $state<FlowEdge[]>([]);

    $effect(() => {
        const { nodes, edges } = workflowToFlow(editor.workflow);
        flowNodes = nodes.map((n) => ({ ...n, selected: n.id === editor.selectedNodeId }));
        flowEdges = edges.map((e) => ({
            ...e,
            class: tintForEdge(e),
        }));
    });

    function tintForEdge(e: FlowEdge): string | undefined {
        const src = editor.runStatus.get(e.source);
        const tgt = editor.runStatus.get(e.target);
        if (src === 'skipped') return 'tinted-skipped';
        if (src === 'error') return 'tinted-error';
        if (src === 'success' && tgt === 'success') return 'tinted-success';
        return undefined;
    }

    const sf = useSvelteFlow();

    function onNodeDragStop({ targetNode }: { targetNode: FlowNode | null }) {
        if (!targetNode?.position) return;
        editor.moveNode(targetNode.id, targetNode.position);
    }

    function onNodeClick({ node }: { node: FlowNode }) {
        editor.selectedNodeId = node.id;
    }

    function onPaneClick() {
        editor.selectedNodeId = null;
    }

    function onDelete(params: { nodes: Node[]; edges: Edge[] }) {
        for (const e of params.edges) {
            const original = editor.workflow.edges.find((ed) => edgeKey(ed) === e.id);
            if (original) editor.disconnect(original.source, original.target, original.when);
        }
        for (const n of params.nodes) {
            editor.removeNode(n.id);
        }
    }

    function onConnect(conn: Connection) {
        if (!conn.source || !conn.target) return;
        const when = conn.sourceHandle === 'true' || conn.sourceHandle === 'false'
            ? (conn.sourceHandle as 'true' | 'false')
            : undefined;
        editor.connect(conn.source, conn.target, when);
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        const type = event.dataTransfer?.getData('application/pasmello-node-type') as WorkflowNodeType | null;
        if (!type) return;
        const position = sf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        editor.addNode(type, position);
    }
</script>

<div class="canvas-wrap" ondragover={onDragOver} ondrop={onDrop} role="application">
    <SvelteFlow
        bind:nodes={flowNodes}
        bind:edges={flowEdges}
        {nodeTypes}
        onnodedragstop={onNodeDragStop}
        onnodeclick={onNodeClick}
        onpaneclick={onPaneClick}
        ondelete={onDelete}
        onconnect={onConnect}
        fitView
        deleteKey={['Backspace', 'Delete']}
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>

<style>
    .canvas-wrap {
        height: 100%;
        width: 100%;
        min-height: 500px;
        background-color: var(--pm-bg-primary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        overflow: hidden;
    }
</style>
