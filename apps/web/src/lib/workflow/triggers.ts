import type { EventFilter, WorkflowTrigger } from '@pasmello/shared';
import { storage } from '$lib/storage';
import { executor } from './executor.js';

type Listener = (payload?: unknown) => void;

const MAX_TRIGGER_DEPTH = 4;

/**
 * Simple in-process event bus. Other code calls `eventBus.emit('workspace:switched', { name })`
 * and the trigger dispatcher fires workflows subscribed to that event. Listeners
 * may ignore the payload (existing zero-arg listeners still work).
 */
class EventBus {
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, cb: Listener): () => void {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(cb);
        return () => set!.delete(cb);
    }

    emit(event: string, payload?: unknown): void {
        const set = this.listeners.get(event);
        if (!set) return;
        for (const cb of set) {
            try {
                cb(payload);
            } catch (err) {
                console.warn(`[eventBus] "${event}" listener failed`, err);
            }
        }
    }
}

export const eventBus = new EventBus();

const DEPTH_KEY = '__pmTriggerDepth';

function wrapPayload(payload: Record<string, unknown>, depth: number): Record<string, unknown> {
    return { ...payload, [DEPTH_KEY]: depth };
}

function unwrapPayload(raw: unknown): { depth: number; payload: unknown } {
    if (raw == null || typeof raw !== 'object') return { depth: 0, payload: raw };
    const obj = raw as Record<string, unknown>;
    if (typeof obj[DEPTH_KEY] !== 'number') return { depth: 0, payload: raw };
    const { [DEPTH_KEY]: depth, ...rest } = obj;
    return { depth: depth as number, payload: rest };
}

function matchesFilter(filter: EventFilter | undefined, payload: unknown): boolean {
    if (!filter) return true;
    if (payload == null || typeof payload !== 'object') return false;
    const p = payload as Record<string, unknown>;
    for (const [k, v] of Object.entries(filter)) {
        if (p[k] !== v) return false;
    }
    return true;
}

class TriggerDispatcher {
    private workspace = 'default';
    private unsubscribers: Array<() => void> = [];

    /** (Re)subscribe all `ui-event` triggers in the given workspace. */
    async init(workspace: string): Promise<void> {
        this.workspace = workspace;
        for (const un of this.unsubscribers) un();
        this.unsubscribers = [];

        const workflows = await storage.listWorkflows(workspace);
        for (const wf of workflows) {
            for (const trigger of wf.triggers) {
                if (trigger.type !== 'ui-event') continue;
                const wfId = wf.id;
                const trg = trigger;
                const unsub = eventBus.on(trigger.event, (rawPayload) => {
                    const { depth: carriedDepth, payload } = unwrapPayload(rawPayload);
                    if (!matchesFilter(trg.filter, payload)) return;
                    // Suppress self-firing: workflow:completed for the subscriber's own id.
                    if (trg.event === 'workflow:completed'
                        && payload != null
                        && typeof payload === 'object'
                        && (payload as { workflowId?: unknown }).workflowId === wfId) return;
                    void this.fire(wfId, trg, payload, carriedDepth + 1);
                });
                this.unsubscribers.push(unsub);
            }
        }
    }

    /** Refresh subscriptions without changing workspace (after save/delete). */
    async refresh(): Promise<void> {
        await this.init(this.workspace);
    }

    /** Run a workflow manually. */
    async runManual(workflowId: string): Promise<void> {
        await this.fire(workflowId, { type: 'manual' }, undefined, 0);
    }

    private async fire(
        workflowId: string,
        trigger: WorkflowTrigger,
        payload: unknown,
        depth: number,
    ): Promise<void> {
        if (depth > MAX_TRIGGER_DEPTH) {
            console.warn(`[trigger] depth ${depth} exceeds ${MAX_TRIGGER_DEPTH}; dropping "${workflowId}"`);
            return;
        }
        const wf = await storage.getWorkflow(this.workspace, workflowId);
        if (!wf) return;
        try {
            const result = await executor.run(wf, {
                workspace: this.workspace,
                trigger,
                input: payload,
                triggerDepth: depth,
            });
            eventBus.emit('workflow:completed', wrapPayload({
                workflowId,
                runId: result.runId,
                status: result.status,
                durationMs: result.finishedAt - result.startedAt,
                triggerType: trigger.type,
            }, depth));
        } catch (err) {
            console.warn(`[trigger] workflow "${workflowId}" failed`, err);
        }
    }
}

export const triggerDispatcher = new TriggerDispatcher();
