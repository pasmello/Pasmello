import type { Workflow, WorkflowTrigger, WorkflowRunResult } from '@pasmello/shared';

export type NodeProgressStatus = 'started' | 'success' | 'error' | 'skipped';

export interface WorkflowExecutionContext {
    workspace: string;
    trigger: WorkflowTrigger;
    /** Optional initial data accessible via `$.input` in node references. */
    input?: unknown;
    /** Optional per-node progress callback (UI hook). */
    onNodeProgress?: (nodeId: string, status: NodeProgressStatus) => void;
}

/**
 * Executor adapter. Tier 1 ships WebWorkerExecutor (browser-side DAG runner).
 * Higher tiers can plug in RemoteServerExecutor that delegates to a paid backend.
 */
export interface WorkflowExecutor {
    run(workflow: Workflow, ctx: WorkflowExecutionContext): Promise<WorkflowRunResult>;
}
