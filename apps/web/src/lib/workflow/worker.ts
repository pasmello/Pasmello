/// <reference lib="webworker" />

interface WorkerRequest {
    id: string;
    code: string;
    inputs: Record<string, unknown>;
}

interface WorkerResponse {
    id: string;
    result?: unknown;
    error?: string;
}

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { id, code, inputs } = event.data;
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const fn = new Function('inputs', `"use strict"; return (async (inputs) => { ${code} })(inputs);`);
        const result = await fn(inputs);
        const res: WorkerResponse = { id, result };
        worker.postMessage(res);
    } catch (err) {
        const res: WorkerResponse = {
            id,
            error: err instanceof Error ? err.message : String(err),
        };
        worker.postMessage(res);
    }
};
