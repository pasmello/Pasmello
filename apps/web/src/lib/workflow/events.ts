/**
 * Catalog of known UI events the host emits. Purely a documentation +
 * autocomplete surface for the workflow editor — any string can still be used
 * in a ui-event trigger, but listed events are where we promise stable payload
 * shapes.
 */

export interface EventCatalogEntry {
    name: string;
    description: string;
    payloadSchema: Record<string, string>;
    emittedFrom: string;
}

export const EVENT_CATALOG: readonly EventCatalogEntry[] = [
    {
        name: 'workspace:switched',
        description: 'User switched the active workspace.',
        payloadSchema: { name: 'string' },
        emittedFrom: 'state/workspace.svelte.ts',
    },
    {
        name: 'workspace:created',
        description: 'A new workspace was created.',
        payloadSchema: { name: 'string' },
        emittedFrom: 'state/workspace.svelte.ts',
    },
    {
        name: 'workspace:deleted',
        description: 'A workspace was deleted.',
        payloadSchema: { name: 'string' },
        emittedFrom: 'state/workspace.svelte.ts',
    },
    {
        name: 'tool:installed',
        description: 'A tool finished installing (zip, URL, or builtin).',
        payloadSchema: { toolId: 'string', version: 'string' },
        emittedFrom: 'tools/install.ts',
    },
    {
        name: 'tool:uninstalled',
        description: 'A tool was removed via the Tools view.',
        payloadSchema: { toolId: 'string' },
        emittedFrom: 'state/tools.svelte.ts',
    },
    {
        name: 'workflow:completed',
        description:
            'A dispatcher-fired workflow finished. NOT emitted for manual runs from the editor. ' +
            'Self-firing on the same workflowId is suppressed to prevent loops.',
        payloadSchema: {
            workflowId: 'string',
            runId: 'string',
            status: '"success" | "error"',
            durationMs: 'number',
            triggerType: '"manual" | "ui-event"',
        },
        emittedFrom: 'workflow/triggers.ts',
    },
] as const;

export function getEventEntry(name: string): EventCatalogEntry | undefined {
    return EVENT_CATALOG.find((e) => e.name === name);
}
