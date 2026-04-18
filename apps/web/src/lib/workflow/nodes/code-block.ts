import type { NodeHandler } from './index.js';
import { evalInWorker } from '../eval.js';

export const codeBlock: NodeHandler = async (config, runtime) => {
    const { code, timeoutMs } = config as { code?: string; timeoutMs?: number };
    if (typeof code !== 'string' || !code.trim()) {
        throw new Error('code-block: missing code');
    }
    const inputs = Object.fromEntries(runtime.outputs);
    return evalInWorker(code, inputs, typeof timeoutMs === 'number' ? timeoutMs : undefined);
};
