import type { NodeHandler } from './index.js';
import { evalInWorker } from '../eval.js';

export const transform: NodeHandler = async (config, runtime) => {
    const { expression } = config as { expression?: string };
    if (typeof expression !== 'string' || !expression.trim()) {
        throw new Error('transform: missing expression');
    }
    const inputs = Object.fromEntries(runtime.outputs);
    return evalInWorker(`return (${expression});`, inputs);
};
