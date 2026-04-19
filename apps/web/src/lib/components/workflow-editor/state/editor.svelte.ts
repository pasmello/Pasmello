import type { Workflow, WorkflowEdge, WorkflowNode, WorkflowNodeType, WorkflowTrigger } from '@pasmello/shared';
import type { RunNodeStatus } from '../types.js';
import { makeDefaultNode, nextNodeId } from './palette.js';

export function emptyWorkflow(id: string): Workflow {
    return {
        id,
        name: id,
        description: '',
        triggers: [{ type: 'manual' }],
        nodes: [],
        edges: [],
    };
}

export class EditorState {
    workflow = $state<Workflow>(emptyWorkflow('untitled'));
    selectedNodeId = $state<string | null>(null);
    runStatus = $state<Map<string, RunNodeStatus>>(new Map());
    message = $state<string | null>(null);
    running = $state(false);

    load(wf: Workflow) {
        this.workflow = JSON.parse(JSON.stringify(wf));
        this.selectedNodeId = null;
        this.runStatus = new Map();
        this.message = null;
    }

    selectedNode(): WorkflowNode | null {
        if (!this.selectedNodeId) return null;
        return this.workflow.nodes.find((n) => n.id === this.selectedNodeId) ?? null;
    }

    addNode(type: WorkflowNodeType, position: { x: number; y: number }): WorkflowNode {
        const id = nextNodeId(type, this.workflow.nodes.map((n) => n.id));
        const node = makeDefaultNode(type, id);
        node.position = position;
        this.workflow = { ...this.workflow, nodes: [...this.workflow.nodes, node] };
        return node;
    }

    moveNode(id: string, position: { x: number; y: number }) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
        };
    }

    removeNode(id: string) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.filter((n) => n.id !== id),
            edges: this.workflow.edges.filter((e) => e.source !== id && e.target !== id),
        };
        if (this.selectedNodeId === id) this.selectedNodeId = null;
    }

    updateNode(id: string, updater: (n: WorkflowNode) => WorkflowNode) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((n) => (n.id === id ? updater(n) : n)),
        };
    }

    renameNode(oldId: string, newId: string): string | null {
        if (oldId === newId) return null;
        if (!newId || !/^[a-zA-Z0-9_\-.]+$/.test(newId)) return 'invalid id (use alphanumeric, -, _, .)';
        if (this.workflow.nodes.some((n) => n.id === newId)) return `id "${newId}" already in use`;
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((n) => (n.id === oldId ? { ...n, id: newId } : n)),
            edges: this.workflow.edges.map((e) => ({
                ...e,
                source: e.source === oldId ? newId : e.source,
                target: e.target === oldId ? newId : e.target,
            })),
        };
        if (this.selectedNodeId === oldId) this.selectedNodeId = newId;
        return null;
    }

    connect(source: string, target: string, when?: 'true' | 'false') {
        if (source === target) return;
        const exists = this.workflow.edges.some(
            (e) => e.source === source && e.target === target && e.when === when,
        );
        if (exists) return;
        const edge: WorkflowEdge = when ? { source, target, when } : { source, target };
        this.workflow = { ...this.workflow, edges: [...this.workflow.edges, edge] };
    }

    disconnect(source: string, target: string, when?: 'true' | 'false') {
        this.workflow = {
            ...this.workflow,
            edges: this.workflow.edges.filter(
                (e) => !(e.source === source && e.target === target && e.when === when),
            ),
        };
    }

    setTriggers(triggers: WorkflowTrigger[]) {
        this.workflow = { ...this.workflow, triggers };
    }

    replace(wf: Workflow) {
        this.workflow = wf;
        if (this.selectedNodeId && !wf.nodes.find((n) => n.id === this.selectedNodeId)) {
            this.selectedNodeId = null;
        }
    }
}
