import type { RequestHandler } from './host-bridge.js';

export interface PlaceCommand {
    pluginId: string;
    toolId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    tileStyle?: string;
}

type PlaceCallback = (cmd: PlaceCommand) => void;

/**
 * Workspace theme → host layout commands. Host validates bounds and
 * forwards accepted commands to the workspace view, which repositions the
 * corresponding tool iframe. Bogus coordinates are dropped.
 */
export function createLayoutHandler(onPlace: PlaceCallback): RequestHandler {
    return async (pluginId, data) => {
        const payload = (data ?? {}) as Partial<PlaceCommand>;
        const toolId = typeof payload.toolId === 'string' ? payload.toolId : null;
        if (!toolId) return { ok: false };

        const x = toInt(payload.x);
        const y = toInt(payload.y);
        const w = toInt(payload.w);
        const h = toInt(payload.h);
        if (x === null || y === null || w === null || h === null) return { ok: false };
        if (w <= 0 || h <= 0) return { ok: false };

        onPlace({
            pluginId,
            toolId,
            x,
            y,
            w,
            h,
            tileStyle: typeof payload.tileStyle === 'string' ? payload.tileStyle : undefined,
        });
        return { ok: true };
    };
}

function toInt(v: unknown): number | null {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return Math.round(v);
}
