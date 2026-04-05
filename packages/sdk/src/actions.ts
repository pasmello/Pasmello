import type { Channel } from './channel.js';

export type ActionHandler = (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;

/**
 * Allows tools to register actions that can be invoked by the workflow engine.
 * Tools expose actions in their manifest; this class wires up the actual handlers.
 */
export class Actions {
    private actionHandlers = new Map<string, ActionHandler>();

    constructor(private channel: Channel) {
        // Listen for action invocations from the host (workflow engine)
        this.channel.onMessage('action:invoke', async (data) => {
            const { action, inputs } = data as { action: string; inputs: Record<string, unknown> };
            const handler = this.actionHandlers.get(action);
            if (!handler) {
                throw new Error(`Unknown action: ${action}`);
            }
            return handler(inputs);
        });
    }

    /** Register a handler for a declared action. */
    register(name: string, handler: ActionHandler): void {
        this.actionHandlers.set(name, handler);
    }
}
