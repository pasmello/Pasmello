/**
 * Run a snippet of user JS in a dedicated Web Worker with a hard timeout.
 * The worker is terminated (not cooperatively cancelled) on timeout or abort.
 *
 * The worker has no DOM and no access to this page's state — only what we
 * pass via the `inputs` object. It shares the browser sandbox with the
 * parent, which is what gives us isolation from the host machine.
 */
export async function evalInWorker(
    code: string,
    inputs: Record<string, unknown>,
    timeoutMs = 30_000,
    signal?: AbortSignal,
): Promise<unknown> {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const requestId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`worker evaluation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        const onAbort = () => {
            cleanup();
            reject(new DOMException('aborted', 'AbortError'));
        };

        const cleanup = () => {
            clearTimeout(timer);
            worker.terminate();
            signal?.removeEventListener('abort', onAbort);
        };

        signal?.addEventListener('abort', onAbort);

        worker.onmessage = (event: MessageEvent<{ id: string; result?: unknown; error?: string }>) => {
            cleanup();
            if (event.data.error) reject(new Error(event.data.error));
            else resolve(event.data.result);
        };

        worker.onerror = (err) => {
            cleanup();
            reject(new Error(err.message || 'worker error'));
        };

        worker.postMessage({ id: requestId, code, inputs });
    });
}
