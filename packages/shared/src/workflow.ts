export type EventFilter = Record<string, string | number | boolean | null>;

export type WorkflowTrigger =
    | { type: 'manual' }
    | { type: 'ui-event'; event: string; filter?: EventFilter };

export type WorkflowNodeType =
    | 'tool-action'
    | 'http-request'
    | 'code-block'
    | 'conditional'
    | 'delay'
    | 'transform';

export type NodeErrorPolicy = 'fail' | 'continue' | { goto: string };

export interface NodeRetry {
    max: number;
    delayMs: number;
}

export interface NodePosition {
    x: number;
    y: number;
}

export interface WorkflowNode {
    id: string;
    type: WorkflowNodeType;
    config: Record<string, unknown>;
    retry?: NodeRetry;
    onError?: NodeErrorPolicy;
    /** Join semantics for fan-in: `all` (wait for every incoming edge, default)
     *  or `any` (fire on first resolved edge). v1 only honors `all`. */
    joinMode?: 'all' | 'any';
    /** Editor-managed layout coordinate. Ignored by the executor. */
    position?: NodePosition;
}

export interface WorkflowEdge {
    source: string;
    target: string;
    /** For conditional nodes: only follow this edge when the boolean output matches. */
    when?: 'true' | 'false';
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    triggers: WorkflowTrigger[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

/** A shareable workflow package (marketplace distribution). Adds versioning + tool dependency. */
export interface WorkflowManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    triggers: WorkflowTrigger[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    requiredTools?: string[];
}

export type NodeRunStatus = 'success' | 'error' | 'skipped';

export interface NodeRunResult {
    nodeId: string;
    status: NodeRunStatus;
    output?: unknown;
    error?: string;
    startedAt: number;
    finishedAt: number;
    attempts: number;
}

export interface WorkflowRunResult {
    workflowId: string;
    runId: string;
    status: 'success' | 'error';
    trigger: WorkflowTrigger;
    startedAt: number;
    finishedAt: number;
    nodes: NodeRunResult[];
    error?: string;
}
