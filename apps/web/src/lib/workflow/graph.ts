import type { Workflow, WorkflowEdge, WorkflowNode } from '@pasmello/shared';

export interface BuiltGraph {
    nodes: Map<string, WorkflowNode>;
    outgoing: Map<string, WorkflowEdge[]>;
    incoming: Map<string, WorkflowEdge[]>;
    inDegree: Map<string, number>;
}

export function buildGraph(workflow: Workflow): BuiltGraph {
    const nodes = new Map(workflow.nodes.map((n) => [n.id, n]));
    const outgoing = new Map<string, WorkflowEdge[]>();
    const incoming = new Map<string, WorkflowEdge[]>();
    const inDegree = new Map<string, number>();
    for (const n of workflow.nodes) {
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
        inDegree.set(n.id, 0);
    }
    for (const edge of workflow.edges) {
        outgoing.get(edge.source)?.push(edge);
        incoming.get(edge.target)?.push(edge);
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
    return { nodes, outgoing, incoming, inDegree };
}

/** Return node ids in a valid topological order, or null if a cycle exists. */
export function topoSort(graph: BuiltGraph): string[] | null {
    const inDeg = new Map(graph.inDegree);
    const queue: string[] = [];
    for (const [id, d] of inDeg) if (d === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        order.push(id);
        for (const edge of graph.outgoing.get(id) ?? []) {
            const next = (inDeg.get(edge.target) ?? 0) - 1;
            inDeg.set(edge.target, next);
            if (next === 0) queue.push(edge.target);
        }
    }
    return order.length === graph.nodes.size ? order : null;
}

/** Ids of nodes that participate in a cycle (i.e. did not reach in-degree 0
 *  during Kahn's algorithm). Empty array means acyclic. */
export function findCycles(graph: BuiltGraph): string[] {
    const inDeg = new Map(graph.inDegree);
    const queue: string[] = [];
    for (const [id, d] of inDeg) if (d === 0) queue.push(id);
    const reached = new Set<string>();
    while (queue.length > 0) {
        const id = queue.shift()!;
        reached.add(id);
        for (const edge of graph.outgoing.get(id) ?? []) {
            const next = (inDeg.get(edge.target) ?? 0) - 1;
            inDeg.set(edge.target, next);
            if (next === 0) queue.push(edge.target);
        }
    }
    if (reached.size === graph.nodes.size) return [];
    return [...graph.nodes.keys()].filter((id) => !reached.has(id));
}

export function entryNodes(graph: BuiltGraph): string[] {
    const entries: string[] = [];
    for (const [id, d] of graph.inDegree) if (d === 0) entries.push(id);
    return entries;
}
