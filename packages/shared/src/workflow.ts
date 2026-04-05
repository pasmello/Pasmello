export interface Workflow {
    id: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface WorkflowNode {
    id: string;
    type: 'tool-action' | 'http-request' | 'code-block' | 'conditional' | 'delay' | 'transform';
    config: Record<string, unknown>;
}

export interface WorkflowEdge {
    source: string;
    target: string;
}
