import type { PortMessage, MountedTool } from './types.js';

export type RequestHandler = (toolId: string, data: unknown) => Promise<unknown>;

interface PendingResponse {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * Host side of tool iframe communication. One MessageChannel per mounted tool.
 *
 * Two messaging directions share each port:
 *  - tool → host requests (handled via `handle(type, fn)`)
 *  - host → tool requests (issued via `invokeAction` / `requestFromTool`)
 *
 * Request IDs are namespaced (`host-N` vs the tool SDK's plain numeric IDs)
 * so the two directions never collide.
 */
export class HostBridge {
    private tools = new Map<string, MountedTool>();
    private handlers = new Map<string, RequestHandler>();
    private pendingResponses = new Map<string, PendingResponse>();
    private nextRequestId = 0;

    handle(type: string, handler: RequestHandler): void {
        this.handlers.set(type, handler);
    }

    mount(id: string, toolId: string, iframe: HTMLIFrameElement): MountedTool {
        const channel = new MessageChannel();
        const hostPort = channel.port1;

        hostPort.onmessage = (event: MessageEvent<PortMessage>) => {
            this.handleMessage(id, toolId, event.data, hostPort);
        };

        const mounted: MountedTool = {
            id,
            toolId,
            iframe,
            channel,
            port: hostPort,
        };

        this.tools.set(id, mounted);

        const dispatch = () => {
            iframe.contentWindow?.postMessage(
                { type: 'init', port: channel.port2 },
                '*',
                [channel.port2],
            );
        };

        // For srcdoc iframes the load event may have fired before mount(),
        // so dispatch immediately if the document is already there. Otherwise
        // wait for load.
        if (iframe.contentDocument && iframe.contentDocument.readyState !== 'loading') {
            queueMicrotask(dispatch);
        } else {
            iframe.addEventListener('load', dispatch, { once: true });
        }

        return mounted;
    }

    unmount(id: string): void {
        const tool = this.tools.get(id);
        if (!tool) return;
        tool.port.close();
        tool.channel.port2.close();
        this.tools.delete(id);
    }

    send(id: string, type: string, data?: unknown): void {
        const tool = this.tools.get(id);
        if (tool) tool.port.postMessage({ type, data });
    }

    broadcast(type: string, data?: unknown): void {
        for (const tool of this.tools.values()) {
            tool.port.postMessage({ type, data });
        }
    }

    /** Find a mounted tool by its manifest id (first match). */
    findByToolId(toolId: string): MountedTool | undefined {
        for (const tool of this.tools.values()) {
            if (tool.toolId === toolId) return tool;
        }
        return undefined;
    }

    /** Invoke a declared action on a mounted tool and await its response. */
    invokeAction(
        toolId: string,
        action: string,
        inputs: Record<string, unknown>,
        timeoutMs = 30_000,
    ): Promise<unknown> {
        const tool = this.findByToolId(toolId);
        if (!tool) return Promise.reject(new Error(`tool not mounted: ${toolId}`));
        return this.requestFromTool(tool, 'action:invoke', { action, inputs }, timeoutMs);
    }

    private requestFromTool(
        tool: MountedTool,
        type: string,
        data: unknown,
        timeoutMs: number,
    ): Promise<unknown> {
        const requestId = `host-${++this.nextRequestId}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingResponses.delete(requestId);
                reject(new Error(`tool request timed out: ${type}`));
            }, timeoutMs);
            this.pendingResponses.set(requestId, { resolve, reject, timer });
            tool.port.postMessage({ id: requestId, type, data });
        });
    }

    private async handleMessage(
        id: string,
        toolId: string,
        message: PortMessage,
        port: MessagePort,
    ): Promise<void> {
        const { id: requestId, type, data, error } = message;

        // Response to a host → tool request
        if (requestId && this.pendingResponses.has(requestId)) {
            const pending = this.pendingResponses.get(requestId)!;
            clearTimeout(pending.timer);
            this.pendingResponses.delete(requestId);
            if (error) pending.reject(new Error(error));
            else pending.resolve(data);
            return;
        }

        // Otherwise it's a tool → host request
        const handler = this.handlers.get(type);
        if (!handler) {
            if (requestId) {
                port.postMessage({ id: requestId, error: `Unknown message type: ${type}` });
            }
            return;
        }

        try {
            const result = await handler(toolId, data);
            if (requestId) port.postMessage({ id: requestId, data: result });
        } catch (err) {
            if (requestId) {
                port.postMessage({
                    id: requestId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        void id;
    }
}
