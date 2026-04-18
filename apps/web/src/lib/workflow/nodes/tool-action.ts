import type { NodeHandler } from './index.js';

export const toolAction: NodeHandler = async (config, runtime) => {
    const { toolId, action, inputs } = config as {
        toolId?: string;
        action?: string;
        inputs?: Record<string, unknown>;
    };
    if (!toolId) throw new Error('tool-action: missing toolId');
    if (!action) throw new Error('tool-action: missing action');
    if (!runtime.bridge) throw new Error('tool-action: host bridge unavailable');
    return runtime.bridge.invokeAction(toolId, action, inputs ?? {});
};
