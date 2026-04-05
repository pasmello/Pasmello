/**
 * Manages the MessagePort connection between a sandboxed tool iframe and the host.
 * The host creates a MessageChannel and transfers one port into the iframe.
 * This class handles receiving that port and routing messages.
 */
export class Channel {
    private port: MessagePort | null = null;
    private pendingRequests = new Map<string, {
        resolve: (value: unknown) => void;
        reject: (reason: unknown) => void;
    }>();
    private handlers = new Map<string, (data: unknown) => unknown>();
    private readyPromise: Promise<void>;
    private readyResolve!: () => void;
    private requestId = 0;

    constructor() {
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
        });

        // Listen for the init message from the host that transfers the MessagePort
        window.addEventListener('message', (event: MessageEvent) => {
            if (event.data?.type === 'init' && event.ports.length > 0) {
                this.port = event.ports[0];
                this.port.onmessage = (e: MessageEvent) => this.handleMessage(e);
                this.readyResolve();
            }
        }, { once: true });
    }

    /** Wait for the channel to be ready (port received from host). */
    async ready(): Promise<void> {
        return this.readyPromise;
    }

    /** Send a request to the host and wait for a response. */
    async request(type: string, data?: unknown): Promise<unknown> {
        await this.ready();
        const id = String(++this.requestId);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.port!.postMessage({ id, type, data });
        });
    }

    /** Register a handler for messages from the host. */
    onMessage(type: string, handler: (data: unknown) => unknown): void {
        this.handlers.set(type, handler);
    }

    /** Send a fire-and-forget message to the host. */
    async send(type: string, data?: unknown): Promise<void> {
        await this.ready();
        this.port!.postMessage({ type, data });
    }

    private handleMessage(event: MessageEvent) {
        const { id, type, data, error } = event.data;

        // Response to a pending request
        if (id && this.pendingRequests.has(id)) {
            const pending = this.pendingRequests.get(id)!;
            this.pendingRequests.delete(id);
            if (error) {
                pending.reject(new Error(error));
            } else {
                pending.resolve(data);
            }
            return;
        }

        // Incoming message from host (e.g., action invocation)
        if (type && this.handlers.has(type)) {
            const handler = this.handlers.get(type)!;
            const result = handler(data);

            // If the host expects a response, send it back
            if (id) {
                Promise.resolve(result).then(
                    (res) => this.port!.postMessage({ id, data: res }),
                    (err) => this.port!.postMessage({ id, error: String(err) })
                );
            }
        }
    }
}
