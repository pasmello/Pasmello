import type { Workflow, WorkflowTrigger, WorkflowRunResult } from '@pasmello/shared';

export type NodeProgressStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface WorkflowExecutionContext {
    workspace: string;
    trigger: WorkflowTrigger;
    /** Optional initial data accessible via `$.input` in node references. */
    input?: unknown;
    /** Optional per-node progress callback (UI hook). */
    onNodeProgress?: (nodeId: string, status: NodeProgressStatus) => void;
    /** Abort handle. Executor creates one if omitted; callers can supply their
     *  own to cancel a run from the UI. */
    controller?: AbortController;
    /** How many trigger hops brought us here. Guards against chain-firing
     *  cycles between workflows. */
    triggerDepth?: number;
}

/**
 * Executor adapter. Tier 1 ships WebWorkerExecutor (browser-side DAG runner).
 * Higher tiers can plug in RemoteServerExecutor that delegates to a paid backend.
 */
export interface WorkflowExecutor {
    run(workflow: Workflow, ctx: WorkflowExecutionContext): Promise<WorkflowRunResult>;
}
