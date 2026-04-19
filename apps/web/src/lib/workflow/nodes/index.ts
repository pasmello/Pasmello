import type { WorkflowNodeType } from '@pasmello/shared';
import type { HostBridge } from '$lib/sandbox/host-bridge';

import { toolAction } from './tool-action.js';
import { httpRequest } from './http-request.js';
import { delay } from './delay.js';
import { codeBlock } from './code-block.js';
import { conditional } from './conditional.js';
import { transform } from './transform.js';

export interface NodeRuntime {
    workspace: string;
    outputs: Map<string, unknown>;
    bridge: HostBridge | null;
    signal: AbortSignal;
}

export type NodeHandler = (
    config: Record<string, unknown>,
    runtime: NodeRuntime,
) => Promise<unknown>;

const handlers: Partial<Record<WorkflowNodeType, NodeHandler>> = {
    'tool-action': toolAction,
    'http-request': httpRequest,
    'code-block': codeBlock,
    conditional,
    delay,
    transform,
};

export function registerNodeHandler(type: WorkflowNodeType, handler: NodeHandler): void {
    handlers[type] = handler;
}

export function getNodeHandler(type: WorkflowNodeType): NodeHandler | undefined {
    return handlers[type];
}
