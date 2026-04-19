import type { NodeHandler } from './index.js';

export const delay: NodeHandler = async (config, runtime) => {
    const { ms } = config as { ms?: number };
    if (typeof ms !== 'number' || ms < 0) throw new Error('delay: ms must be a non-negative number');

    if (runtime.signal.aborted) throw new DOMException('aborted', 'AbortError');

    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            runtime.signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('aborted', 'AbortError'));
        };
        runtime.signal.addEventListener('abort', onAbort, { once: true });
    });

    return { waitedMs: ms };
};
