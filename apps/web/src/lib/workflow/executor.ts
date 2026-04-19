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
import { buildGraph, entryNodes, findCycles } from './graph.js';
import type { NodeProgressStatus, WorkflowExecutionContext, WorkflowExecutor } from './types.js';

type EdgeStatus = 'pending' | 'active' | 'skipped';

export class WebWorkerExecutor implements WorkflowExecutor {
    async run(workflow: Workflow, ctx: WorkflowExecutionContext): Promise<WorkflowRunResult> {
        const runId = generateRunId();
        const startedAt = Date.now();
        const nodeResults: NodeRunResult[] = [];

        const controller = ctx.controller ?? new AbortController();
        const graph = buildGraph(workflow);

        const outputs = new Map<string, unknown>();
        if (ctx.input !== undefined) outputs.set('input', ctx.input);

        let status: 'success' | 'error' = 'success';
        let error: string | undefined;

        const cycles = findCycles(graph);
        if (cycles.length > 0) {
            status = 'error';
            error = `cycle detected in nodes: ${cycles.join(', ')}`;
            return finalize(workflow, ctx, runId, startedAt, status, error, nodeResults);
        }

        const entries = entryNodes(graph);
        if (entries.length === 0 && workflow.nodes.length > 0) {
            status = 'error';
            error = 'no entry node';
            return finalize(workflow, ctx, runId, startedAt, status, error, nodeResults);
        }

        const inDegRemaining = new Map(graph.inDegree);
        const edgeStatus = new Map<WorkflowEdge, EdgeStatus>();
        for (const edge of workflow.edges) edgeStatus.set(edge, 'pending');
        const nodeStatus = new Map<string, NodeProgressStatus>();
        for (const n of workflow.nodes) {
            nodeStatus.set(n.id, 'pending');
            ctx.onNodeProgress?.(n.id, 'pending');
        }

        const ready: WorkflowNode[] = entries
            .map((id) => graph.nodes.get(id)!)
            .filter(Boolean);
        const inFlight = new Map<string, Promise<void>>();
        const gotoVisited = new Set<string>();

        let failed = false;
        let failError: string | undefined;

        const emit = (id: string, s: NodeProgressStatus) => {
            nodeStatus.set(id, s);
            ctx.onNodeProgress?.(id, s);
        };

        const decrementTarget = (targetId: string) => {
            const remaining = (inDegRemaining.get(targetId) ?? 0) - 1;
            inDegRemaining.set(targetId, remaining);
            if (remaining > 0) return;
            const incoming = graph.incoming.get(targetId) ?? [];
            const allSkipped = incoming.length > 0 && incoming.every((e) => edgeStatus.get(e) === 'skipped');
            if (allSkipped) {
                cascadeSkip(targetId);
                return;
            }
            const target = graph.nodes.get(targetId);
            if (target) ready.push(target);
        };

        const cascadeSkip = (id: string) => {
            if (nodeStatus.get(id) !== 'pending') return;
            const now = Date.now();
            emit(id, 'skipped');
            nodeResults.push({
                nodeId: id,
                status: 'skipped',
                startedAt: now,
                finishedAt: now,
                attempts: 0,
            });
            for (const e of graph.outgoing.get(id) ?? []) {
                edgeStatus.set(e, 'skipped');
                decrementTarget(e.target);
            }
        };

        const handleResult = (node: WorkflowNode, result: NodeRunResult) => {
            nodeResults.push(result);
            if (failed) return;

            if (result.status === 'success') {
                outputs.set(node.id, result.output);
                emit(node.id, 'success');
                for (const e of graph.outgoing.get(node.id) ?? []) {
                    const active = decideEdge(node, e, result.output);
                    edgeStatus.set(e, active ? 'active' : 'skipped');
                    decrementTarget(e.target);
                }
                return;
            }

            // result.status === 'error'
            const policy: NodeErrorPolicy = node.onError ?? 'fail';
            if (policy === 'fail') {
                failed = true;
                failError = `node "${node.id}" failed: ${result.error ?? 'unknown'}`;
                emit(node.id, 'error');
                controller.abort();
                return;
            }
            emit(node.id, 'error');
            for (const e of graph.outgoing.get(node.id) ?? []) {
                edgeStatus.set(e, 'skipped');
                decrementTarget(e.target);
            }
            if (typeof policy === 'object' && policy.goto) {
                scheduleGoto(policy.goto, node.id);
            }
        };

        const scheduleGoto = (targetId: string, fromNodeId: string) => {
            if (gotoVisited.has(targetId)) {
                failed = true;
                failError = `goto cycle: "${fromNodeId}" → "${targetId}" revisited`;
                controller.abort();
                return;
            }
            gotoVisited.add(targetId);
            const target = graph.nodes.get(targetId);
            if (!target) {
                console.warn(`[workflow] goto target "${targetId}" not found`);
                return;
            }
            const currentStatus = nodeStatus.get(targetId);
            if (currentStatus && currentStatus !== 'pending') {
                console.warn(`[workflow] goto target "${targetId}" already ${currentStatus}, skipping`);
                return;
            }
            inDegRemaining.set(targetId, 0);
            ready.push(target);
        };

        const runtimeSignal = controller.signal;

        const fire = (node: WorkflowNode) => {
            emit(node.id, 'running');
            const p = runNode(node, outputs, runtimeSignal, ctx.workspace).then((result) => {
                inFlight.delete(node.id);
                handleResult(node, result);
                drain();
            });
            inFlight.set(node.id, p);
        };

        const drain = () => {
            while (!failed && ready.length > 0) {
                const node = ready.shift()!;
                if (nodeStatus.get(node.id) !== 'pending' && nodeStatus.get(node.id) !== 'running') continue;
                if (inFlight.has(node.id)) continue;
                fire(node);
            }
        };

        drain();

        while (inFlight.size > 0) {
            await Promise.race(inFlight.values()).catch(() => { /* handled inside */ });
        }

        if (failed) {
            status = 'error';
            error = failError;
        }

        return finalize(workflow, ctx, runId, startedAt, status, error, nodeResults);
    }
}

async function finalize(
    workflow: Workflow,
    ctx: WorkflowExecutionContext,
    runId: string,
    startedAt: number,
    status: 'success' | 'error',
    error: string | undefined,
    nodeResults: NodeRunResult[],
): Promise<WorkflowRunResult> {
    const runResult: WorkflowRunResult = {
        workflowId: workflow.id,
        runId,
        status,
        trigger: ctx.trigger,
        startedAt,
        finishedAt: Date.now(),
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

async function runNode(
    node: WorkflowNode,
    outputs: Map<string, unknown>,
    signal: AbortSignal,
    workspace: string,
): Promise<NodeRunResult> {
    const handler = getNodeHandler(node.type);
    const startedAt = Date.now();

    if (!handler) {
        return {
            nodeId: node.id,
            status: 'error',
            error: `no handler registered for node type "${node.type}"`,
            startedAt,
            finishedAt: Date.now(),
            attempts: 0,
        };
    }

    if (node.joinMode === 'any') {
        console.warn(`[workflow] node "${node.id}" requested joinMode:'any' — not honored in v1 (falling back to 'all')`);
    }

    const runtime: NodeRuntime = {
        workspace,
        outputs,
        bridge: bridgeManager.bridge,
        signal,
    };

    const maxAttempts = Math.max(1, (node.retry?.max ?? 0) + 1);
    let attempts = 0;
    let lastError: unknown;

    while (attempts < maxAttempts) {
        if (signal.aborted) break;
        attempts++;
        try {
            const resolvedConfig = resolveRefs(node.config, outputs) as Record<string, unknown>;
            const output = await handler(resolvedConfig, runtime);
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
            if (signal.aborted) break;
            if (attempts < maxAttempts && node.retry) {
                await sleep(node.retry.delayMs, signal);
            }
        }
    }

    return {
        nodeId: node.id,
        status: 'error',
        error: lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error'),
        startedAt,
        finishedAt: Date.now(),
        attempts,
    };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (signal.aborted) return resolve();
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            resolve();
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

function decideEdge(node: WorkflowNode, edge: WorkflowEdge, output: unknown): boolean {
    if (node.type === 'conditional') {
        const branch: 'true' | 'false' = output === true ? 'true' : 'false';
        return edge.when === branch;
    }
    return true;
}

function generateRunId(): string {
    return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const executor = new WebWorkerExecutor();
