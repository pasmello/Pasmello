/** Messages sent between host and tool iframes via MessagePort */
export interface PortMessage {
    id?: string;
    type: string;
    data?: unknown;
    error?: string;
}

/** Represents a mounted tool iframe with its communication channel */
export interface MountedTool {
    id: string;
    toolId: string;
    iframe: HTMLIFrameElement;
    channel: MessageChannel;
    port: MessagePort;
}
