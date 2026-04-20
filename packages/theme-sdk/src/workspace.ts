import type { Channel } from '@pasmello/sdk';

export interface PlaceArgs {
    toolId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    tileStyle?: string;
}

export interface DragEvent {
    toolId: string;
    phase: 'start' | 'move' | 'end';
    x: number;
    y: number;
}

export interface LayoutTool {
    toolId: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

type DragListener = (e: DragEvent) => void;
type LayoutListener = (tools: LayoutTool[]) => void;

/**
 * Workspace layer API. Available only when the theme iframe is mounted as
 * the workspace layer. Lets themes override tile positions and decorate
 * drag interactions; the host still mounts and owns tool iframes directly.
 */
export class WorkspaceAPI {
    private dragListeners = new Set<DragListener>();
    private layoutListeners = new Set<LayoutListener>();

    constructor(private channel: Channel) {
        this.channel.onMessage('workspace:drag-event', (data) => {
            const e = data as DragEvent;
            if (!e || typeof e.toolId !== 'string') return;
            for (const cb of this.dragListeners) {
                try { cb(e); }
                catch (err) { console.warn('[theme-sdk] drag listener failed', err); }
            }
        });

        this.channel.onMessage('workspace:layout-changed', (data) => {
            const payload = (data ?? {}) as { tools?: LayoutTool[] };
            const tools = payload.tools ?? [];
            for (const cb of this.layoutListeners) {
                try { cb(tools); }
                catch (err) { console.warn('[theme-sdk] layout listener failed', err); }
            }
        });
    }

    /** Ask the host to position a tool iframe. Host validates bounds against the workspace region. */
    place(args: PlaceArgs): void {
        this.channel.send('layout:place', args);
    }

    onDrag(cb: DragListener): () => void {
        this.dragListeners.add(cb);
        return () => this.dragListeners.delete(cb);
    }

    onLayoutChange(cb: LayoutListener): () => void {
        this.layoutListeners.add(cb);
        return () => this.layoutListeners.delete(cb);
    }
}
