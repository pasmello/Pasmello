import type { WorkflowNode, WorkflowNodeType } from '@pasmello/shared';

export interface NodeTypeMeta {
    type: WorkflowNodeType;
    label: string;
    description: string;
    /** CSS variable name (without `var(...)`) used for the accent color. */
    accentVar: string;
    /** True if this node has a boolean output with `true`/`false` branches. */
    hasBooleanOutputs?: boolean;
    defaultConfig: () => Record<string, unknown>;
}

export const NODE_TYPE_META: Record<WorkflowNodeType, NodeTypeMeta> = {
    'tool-action': {
        type: 'tool-action',
        label: 'Tool Action',
        description: 'Invoke a registered action on an installed tool.',
        accentVar: '--pm-accent',
        defaultConfig: () => ({ toolId: '', action: '', inputs: {} }),
    },
    'http-request': {
        type: 'http-request',
        label: 'HTTP Request',
        description: 'Fetch from a URL. CORS must permit the call.',
        accentVar: '--pm-info',
        defaultConfig: () => ({ url: '', method: 'GET' }),
    },
    'code-block': {
        type: 'code-block',
        label: 'Code Block',
        description: 'Run JavaScript in a sandboxed Web Worker.',
        accentVar: '--pm-accent-hover',
        defaultConfig: () => ({ code: 'return inputs;', timeoutMs: 30000 }),
    },
    conditional: {
        type: 'conditional',
        label: 'Conditional',
        description: 'Evaluate a boolean expression. Branch edges by true/false.',
        accentVar: '--pm-warning',
        hasBooleanOutputs: true,
        defaultConfig: () => ({ expression: 'true' }),
    },
    delay: {
        type: 'delay',
        label: 'Delay',
        description: 'Wait N milliseconds.',
        accentVar: '--pm-text-tertiary',
        defaultConfig: () => ({ ms: 1000 }),
    },
    transform: {
        type: 'transform',
        label: 'Transform',
        description: 'Evaluate an expression and forward its value.',
        accentVar: '--pm-info',
        defaultConfig: () => ({ expression: 'inputs' }),
    },
};

export const PALETTE_ORDER: WorkflowNodeType[] = [
    'tool-action',
    'http-request',
    'code-block',
    'conditional',
    'transform',
    'delay',
];

export function makeDefaultNode(type: WorkflowNodeType, id: string): WorkflowNode {
    return {
        id,
        type,
        config: NODE_TYPE_META[type].defaultConfig(),
    };
}

/** Allocate a fresh node id: `{type}-{n}` where n is the lowest unused integer. */
export function nextNodeId(type: WorkflowNodeType, existing: Iterable<string>): string {
    const used = new Set(existing);
    const prefix = type;
    let n = 1;
    while (used.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
}
