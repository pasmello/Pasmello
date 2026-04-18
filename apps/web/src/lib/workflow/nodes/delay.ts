import type { NodeHandler } from './index.js';

export const delay: NodeHandler = async (config) => {
    const { ms } = config as { ms?: number };
    if (typeof ms !== 'number' || ms < 0) throw new Error('delay: ms must be a non-negative number');
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { waitedMs: ms };
};
