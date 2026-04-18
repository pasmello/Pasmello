import type {
    Workflow,
    WorkflowEdge,
    WorkflowNode,
    WorkflowRunResult,
    NodeRunResult,
    NodeErrorPolicy,
} from '@pasmello/shared';
import { bridgeManager } from '$lib/sandbox/bridge.svelte';
import { storage } from '$lib/storage';
import { getNodeHandler, type NodeRuntime } from './nodes/index.js';
import { resolveRefs } from './refs.js';
import type { WorkflowExecutionContext, WorkflowExecutor } from './types.js';

export class WebWorkerExecutor implements WorkflowExecutor {
    async run(workflow: Workflow, ctx: WorkflowExecutionContext): Promise<WorkflowRunResult> {
        const nodes = new Map(workflow.nodes.map((n) => [n.id, n]));
        const outgoing = new Map<string, WorkflowEdge[]>();
        for (const edge of workflow.edges) {
            const list = outgoing.get(edge.source);
            if (list) list.push(edge);
            else outgoing.set(edge.source, [edge]);
        }
        const incoming = new Set(workflow.edges.map((e) => e.target));
        const entries = workflow.nodes.filter((n) => !incoming.has(n.id));

        const runId = generateRunId();
        const startedAt = Date.now();
        const nodeResults: NodeRunResult[] = [];
        const outputs = new Map<string, unknown>();
        if (ctx.input !== undefined) outputs.set('input', ctx.input);

        let status: 'success' | 'error' = 'success';
        let error: string | undefined;

        if (entries.length !== 1) {
            status = 'error';
            error = entries.length === 0 ? 'no entry node' : 'multiple entry nodes are not supported in v1';
        }

        if (status === 'success') {
            let current: WorkflowNode | undefined = entries[0];
            const visited = new Set<string>();
            while (current) {
                if (visited.has(current.id)) {
                    status = 'error';
                    error = `cycle detected at node ${current.id}`;
                    break;
                }
                visited.add(current.id);

                const result = await runNode(current, outputs, ctx);
                nodeResults.push(result);

                if (result.status === 'success') {
                    outputs.set(current.id, result.output);
                } else if (result.status === 'error') {
                    const policy = current.onError ?? 'fail';
                    const gotoId = resolveErrorGoto(policy);
                    if (policy === 'fail') {
                        status = 'error';
                        error = `node "${current.id}" failed: ${result.error}`;
                        break;
                    }
                    if (gotoId) {
                        current = nodes.get(gotoId);
                        continue;
                    }
                    // 'continue' falls through to normal edge selection
                }

                const nextEdge = pickNextEdge(
                    outgoing.get(current.id) ?? [],
                    current,
                    result.output,
                );
                current = nextEdge ? nodes.get(nextEdge.target) : undefined;
            }
        }

        const finishedAt = Date.now();
        const runResult: WorkflowRunResult = {
            workflowId: workflow.id,
            runId,
            status,
            trigger: ctx.trigger,
            startedAt,
            finishedAt,
            nodes: nodeResults,
            error,
        };

        try {
            await storage.appendRunLog(ctx.workspace, runResult);
        } catch (err) {
            console.warn('[workflow] failed to persist run log', err);
        }

        return runResult;
    }
}

async function runNode(
    node: WorkflowNode,
    outputs: Map<string, unknown>,
    ctx: WorkflowExecutionContext,
): Promise<NodeRunResult> {
    ctx.onNodeProgress?.(node.id, 'started');
    const handler = getNodeHandler(node.type);
    const startedAt = Date.now();

    if (!handler) {
        const finishedAt = Date.now();
        ctx.onNodeProgress?.(node.id, 'error');
        return {
            nodeId: node.id,
            status: 'error',
            error: `no handler registered for node type "${node.type}"`,
            startedAt,
            finishedAt,
            attempts: 0,
        };
    }

    const runtime: NodeRuntime = {
        workspace: ctx.workspace,
        outputs,
        bridge: bridgeManager.bridge,
    };

    const maxAttempts = Math.max(1, (node.retry?.max ?? 0) + 1);
    let attempts = 0;
    let lastError: unknown;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const resolvedConfig = resolveRefs(node.config, outputs) as Record<string, unknown>;
            const output = await handler(resolvedConfig, runtime);
            ctx.onNodeProgress?.(node.id, 'success');
            return {
                nodeId: node.id,
                status: 'success',
                output,
                startedAt,
                finishedAt: Date.now(),
                attempts,
            };
        } catch (err) {
            lastError = err;
            if (attempts < maxAttempts && node.retry) {
                await new Promise((resolve) => setTimeout(resolve, node.retry!.delayMs));
            }
        }
    }

    ctx.onNodeProgress?.(node.id, 'error');
    return {
        nodeId: node.id,
        status: 'error',
        error: lastError instanceof Error ? lastError.message : String(lastError),
        startedAt,
        finishedAt: Date.now(),
        attempts,
    };
}

function pickNextEdge(
    edges: WorkflowEdge[],
    node: WorkflowNode,
    output: unknown,
): WorkflowEdge | undefined {
    if (edges.length === 0) return undefined;
    if (node.type === 'conditional') {
        const branch = output === true ? 'true' : 'false';
        return edges.find((e) => e.when === branch) ?? edges.find((e) => !e.when);
    }
    return edges[0];
}

function resolveErrorGoto(policy: NodeErrorPolicy): string | null {
    if (policy === 'fail' || policy === 'continue') return null;
    return policy.goto;
}

function generateRunId(): string {
    return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const executor = new WebWorkerExecutor();
