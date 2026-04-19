import type { NodeHandler } from './index.js';
import { evalInWorker } from '../eval.js';

export const conditional: NodeHandler = async (config, runtime) => {
    const { expression } = config as { expression?: string };
    if (typeof expression !== 'string' || !expression.trim()) {
        throw new Error('conditional: missing expression');
    }
    const inputs = Object.fromEntries(runtime.outputs);
    const result = await evalInWorker(
        `return (${expression});`,
        inputs,
        undefined,
        runtime.signal,
    );
    return Boolean(result);
};
