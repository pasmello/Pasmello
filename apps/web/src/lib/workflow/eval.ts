/**
 * Run a snippet of user JS in a dedicated Web Worker with a hard timeout.
 * The worker is terminated (not cooperatively cancelled) on timeout.
 *
 * The worker has no DOM and no access to this page's state — only what we
 * pass via the `inputs` object. It shares the browser sandbox with the
 * parent, which is what gives us isolation from the host machine.
 */
export async function evalInWorker(
    code: string,
    inputs: Record<string, unknown>,
    timeoutMs = 30_000,
): Promise<unknown> {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const requestId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error(`worker evaluation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        worker.onmessage = (event: MessageEvent<{ id: string; result?: unknown; error?: string }>) => {
            clearTimeout(timer);
            worker.terminate();
            if (event.data.error) reject(new Error(event.data.error));
            else resolve(event.data.result);
        };

        worker.onerror = (err) => {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(err.message || 'worker error'));
        };

        worker.postMessage({ id: requestId, code, inputs });
    });
}
