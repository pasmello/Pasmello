import type { PortMessage, MountedTool } from './types.js';

export type RequestHandler = (toolId: string, data: unknown) => Promise<unknown>;

/**
 * Manages the host side of tool iframe communication.
 * Creates a dedicated MessageChannel per tool for isolation.
 */
export class HostBridge {
    private tools = new Map<string, MountedTool>();
    private handlers = new Map<string, RequestHandler>();

    /** Register a handler for a message type from tools. */
    handle(type: string, handler: RequestHandler): void {
        this.handlers.set(type, handler);
    }

    /**
     * Mount a tool iframe and establish a MessageChannel connection.
     * Returns the MountedTool with the host-side port for communication.
     */
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

        // Transfer port2 to the iframe once it loads
        iframe.addEventListener('load', () => {
            iframe.contentWindow?.postMessage(
                { type: 'init', port: channel.port2 },
                '*',
                [channel.port2]
            );
        }, { once: true });

        return mounted;
    }

    /** Unmount a tool and clean up its channel. */
    unmount(id: string): void {
        const tool = this.tools.get(id);
        if (tool) {
            tool.port.close();
            tool.channel.port2.close();
            this.tools.delete(id);
        }
    }

    /** Send a message to a specific tool. */
    send(id: string, type: string, data?: unknown): void {
        const tool = this.tools.get(id);
        if (tool) {
            tool.port.postMessage({ type, data });
        }
    }

    /** Send a message to all mounted tools. */
    broadcast(type: string, data?: unknown): void {
        for (const tool of this.tools.values()) {
            tool.port.postMessage({ type, data });
        }
    }

    private async handleMessage(
        id: string,
        toolId: string,
        message: PortMessage,
        port: MessagePort
    ): Promise<void> {
        const { id: requestId, type, data } = message;

        const handler = this.handlers.get(type);
        if (!handler) {
            if (requestId) {
                port.postMessage({ id: requestId, error: `Unknown message type: ${type}` });
            }
            return;
        }

        try {
            const result = await handler(toolId, data);
            if (requestId) {
                port.postMessage({ id: requestId, data: result });
            }
        } catch (err) {
            if (requestId) {
                port.postMessage({
                    id: requestId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
}
