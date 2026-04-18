import type { WorkflowTrigger } from '@pasmello/shared';
import { storage } from '$lib/storage';
import { executor } from './executor.js';

type Listener = () => void;

/**
 * Simple in-process event bus. Other code calls `eventBus.emit('workspace:switched')`
 * and the trigger dispatcher fires workflows subscribed to that event.
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

    emit(event: string): void {
        const set = this.listeners.get(event);
        if (!set) return;
        for (const cb of set) {
            try {
                cb();
            } catch (err) {
                console.warn(`[eventBus] "${event}" listener failed`, err);
            }
        }
    }
}

export const eventBus = new EventBus();

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
                const unsub = eventBus.on(trigger.event, () => {
                    void this.fire(wfId, trg);
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
        await this.fire(workflowId, { type: 'manual' });
    }

    private async fire(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
        const wf = await storage.getWorkflow(this.workspace, workflowId);
        if (!wf) return;
        try {
            await executor.run(wf, { workspace: this.workspace, trigger });
        } catch (err) {
            console.warn(`[trigger] workflow "${workflowId}" failed`, err);
        }
    }
}

export const triggerDispatcher = new TriggerDispatcher();
