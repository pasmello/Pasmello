import type { Edge, Node } from '@xyflow/svelte';
import type { Workflow, WorkflowEdge, WorkflowNode } from '@pasmello/shared';

export interface FlowNodeData extends Record<string, unknown> {
    node: WorkflowNode;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

/** Build Svelte Flow nodes/edges from a workflow. Missing positions are
 *  auto-laid-out in a simple left-to-right layer pass. */
export function workflowToFlow(wf: Workflow): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const positions = ensurePositions(wf);
    const nodes: FlowNode[] = wf.nodes.map((n) => ({
        id: n.id,
        type: 'pasmello',
        position: positions.get(n.id)!,
        data: { node: n },
    }));
    const edges: FlowEdge[] = wf.edges.map((e) => ({
        id: edgeKey(e),
        source: e.source,
        target: e.target,
        sourceHandle: e.when ?? undefined,
        label: e.when,
        data: { when: e.when },
    }));
    return { nodes, edges };
}

export function edgeKey(e: WorkflowEdge): string {
    return `${e.source}:${e.when ?? ''}→${e.target}`;
}

/** Compute positions for every node. Uses provided `position` when present,
 *  otherwise lays out by topological layer left-to-right. */
function ensurePositions(wf: Workflow): Map<string, { x: number; y: number }> {
    const result = new Map<string, { x: number; y: number }>();
    const missing: string[] = [];
    for (const n of wf.nodes) {
        if (n.position) result.set(n.id, { x: n.position.x, y: n.position.y });
        else missing.push(n.id);
    }
    if (missing.length === 0) return result;

    const layer = computeLayers(wf);
    const layerCounts = new Map<number, number>();
    const LAYER_W = 260;
    const LAYER_H = 120;
    const STEP_X = 240;
    const STEP_Y = 100;
    for (const id of missing) {
        const L = layer.get(id) ?? 0;
        const row = layerCounts.get(L) ?? 0;
        layerCounts.set(L, row + 1);
        result.set(id, { x: 40 + L * STEP_X, y: 40 + row * STEP_Y });
        void LAYER_W; void LAYER_H;
    }
    return result;
}

function computeLayers(wf: Workflow): Map<string, number> {
    const layer = new Map<string, number>();
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    for (const n of wf.nodes) {
        incoming.set(n.id, 0);
        outgoing.set(n.id, []);
    }
    for (const e of wf.edges) {
        incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
        outgoing.get(e.source)?.push(e.target);
    }
    const queue: string[] = [];
    for (const [id, d] of incoming) {
        if (d === 0) {
            layer.set(id, 0);
            queue.push(id);
        }
    }
    while (queue.length > 0) {
        const id = queue.shift()!;
        const L = layer.get(id)!;
        for (const next of outgoing.get(id) ?? []) {
            const candidate = L + 1;
            if (!layer.has(next) || layer.get(next)! < candidate) {
                layer.set(next, candidate);
            }
            const remaining = (incoming.get(next) ?? 0) - 1;
            incoming.set(next, remaining);
            if (remaining === 0) queue.push(next);
        }
    }
    for (const n of wf.nodes) if (!layer.has(n.id)) layer.set(n.id, 0);
    return layer;
}

/** Pull position updates from Svelte Flow back into the workflow object. */
export function applyFlowPositions(wf: Workflow, flowNodes: FlowNode[]): Workflow {
    const posById = new Map(flowNodes.map((n) => [n.id, n.position]));
    return {
        ...wf,
        nodes: wf.nodes.map((n) => {
            const p = posById.get(n.id);
            return p ? { ...n, position: { x: p.x, y: p.y } } : n;
        }),
    };
}
