<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { WidgetSize } from '@pasmello/shared';

    interface Rect { x: number; y: number; w: number; h: number }

    type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

    interface Props {
        item: Rect;
        cols: number;
        rowHeight: number;
        gap: number;
        minSize: WidgetSize;
        maxSize: WidgetSize;
        gridEl: HTMLElement | undefined;
        oncommit: (next: Rect) => void;
        children: Snippet;
    }

    let { item, cols, rowHeight, gap, minSize, maxSize, gridEl, oncommit, children }: Props = $props();

    let dragging = $state<null | { mode: 'move' | 'resize'; dir?: ResizeDir; startX: number; startY: number; startRect: Rect; ghost: Rect }>(null);

    function cellPitchX(): number {
        if (!gridEl) return 80 + gap;
        const rect = gridEl.getBoundingClientRect();
        const cellW = (rect.width - (cols - 1) * gap) / cols;
        return cellW + gap;
    }

    function cellPitchY(): number {
        return rowHeight + gap;
    }

    function clampRect(r: Rect): Rect {
        let { x, y, w, h } = r;
        w = Math.max(minSize.w, Math.min(maxSize.w, w));
        h = Math.max(minSize.h, Math.min(maxSize.h, h));
        x = Math.max(0, Math.min(cols - w, x));
        y = Math.max(0, y);
        return { x, y, w, h };
    }

    function onMoveDown(e: PointerEvent) {
        if (e.button !== 0) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragging = {
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startRect: { ...item },
            ghost: { ...item },
        };
    }

    function onResizeDown(e: PointerEvent, dir: ResizeDir) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragging = {
            mode: 'resize',
            dir,
            startX: e.clientX,
            startY: e.clientY,
            startRect: { ...item },
            ghost: { ...item },
        };
    }

    function onMoveMove(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const pitchX = cellPitchX();
        const pitchY = cellPitchY();
        const cellDX = Math.round(dx / pitchX);
        const cellDY = Math.round(dy / pitchY);

        if (dragging.mode === 'move') {
            dragging.ghost = clampRect({
                x: dragging.startRect.x + cellDX,
                y: dragging.startRect.y + cellDY,
                w: dragging.startRect.w,
                h: dragging.startRect.h,
            });
        } else {
            const r = { ...dragging.startRect };
            const d = dragging.dir!;
            if (d.includes('e')) r.w = dragging.startRect.w + cellDX;
            if (d.includes('w')) { r.w = dragging.startRect.w - cellDX; r.x = dragging.startRect.x + cellDX; }
            if (d.includes('s')) r.h = dragging.startRect.h + cellDY;
            if (d.includes('n')) { r.h = dragging.startRect.h - cellDY; r.y = dragging.startRect.y + cellDY; }
            dragging.ghost = clampRect(r);
        }
    }

    function onMoveUp() {
        if (!dragging) return;
        const next = dragging.ghost;
        const same =
            next.x === item.x && next.y === item.y && next.w === item.w && next.h === item.h;
        dragging = null;
        if (!same) oncommit(next);
    }

    // Visual offset during drag — CSS grid holds the "canonical" position; we
    // layer a transform/size override on top while dragging for preview.
    let dragOffsetStyle = $derived.by(() => {
        if (!dragging) return '';
        const pitchX = cellPitchX();
        const pitchY = cellPitchY();
        const dx = (dragging.ghost.x - item.x) * pitchX;
        const dy = (dragging.ghost.y - item.y) * pitchY;
        if (dragging.mode === 'move') {
            return `transform: translate(${dx}px, ${dy}px);`;
        }
        // Resize: grow/shrink relative to committed cell size
        const cellW = pitchX - gap;
        const addW = (dragging.ghost.w - item.w) * pitchX;
        const addH = (dragging.ghost.h - item.h) * pitchY;
        let styles = `width: ${item.w * cellW + (item.w - 1) * gap + addW}px; height: ${item.h * rowHeight + (item.h - 1) * gap + addH}px;`;
        if (dragging.ghost.x !== item.x) styles += ` transform: translateX(${(dragging.ghost.x - item.x) * pitchX}px);`;
        if (dragging.ghost.y !== item.y) styles += ` transform: translateY(${(dragging.ghost.y - item.y) * pitchY}px);`;
        return styles;
    });
</script>

<div class="widget-frame" class:dragging={!!dragging} style={dragOffsetStyle}>
    <div
        class="drag-strip"
        onpointerdown={onMoveDown}
        onpointermove={onMoveMove}
        onpointerup={onMoveUp}
        onpointercancel={onMoveUp}
        aria-label="Drag to reposition"
        role="button"
        tabindex="0"
    ></div>
    <div class="widget-body">
        {@render children()}
    </div>
    {#each ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as dir (dir)}
        <div
            class="resize-handle resize-{dir}"
            onpointerdown={(e) => onResizeDown(e, dir as ResizeDir)}
            onpointermove={onMoveMove}
            onpointerup={onMoveUp}
            onpointercancel={onMoveUp}
            role="button"
            tabindex="-1"
            aria-label="Resize {dir}"
        ></div>
    {/each}
    {#if dragging}
        <div class="drag-readout">{dragging.ghost.x},{dragging.ghost.y} · {dragging.ghost.w}×{dragging.ghost.h}</div>
    {/if}
</div>

<style>
    .widget-frame {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: var(--pm-radius-md);
        overflow: visible;
        transition: box-shadow var(--pm-transition-fast);
    }
    .widget-frame.dragging {
        z-index: 2;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    }

    .drag-strip {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 20px;
        background: linear-gradient(
            to bottom,
            var(--pm-bg-tertiary),
            transparent
        );
        opacity: 0;
        cursor: grab;
        transition: opacity var(--pm-transition-fast);
        z-index: 2;
        border-top-left-radius: var(--pm-radius-md);
        border-top-right-radius: var(--pm-radius-md);
    }
    .widget-frame:hover .drag-strip {
        opacity: 0.7;
    }
    .drag-strip:active {
        cursor: grabbing;
        opacity: 1;
    }

    .widget-body {
        position: absolute;
        inset: 0;
        border-radius: var(--pm-radius-md);
        overflow: hidden;
        border: 1px solid var(--pm-border-subtle);
        background-color: var(--pm-bg-surface);
    }

    .resize-handle {
        position: absolute;
        z-index: 3;
        opacity: 0;
        background-color: var(--pm-accent);
        transition: opacity var(--pm-transition-fast);
    }
    .widget-frame:hover .resize-handle {
        opacity: 0.35;
    }
    .resize-handle:hover {
        opacity: 0.85 !important;
    }

    .resize-n, .resize-s { left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
    .resize-n { top: -3px; }
    .resize-s { bottom: -3px; }

    .resize-e, .resize-w { top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
    .resize-e { right: -3px; }
    .resize-w { left: -3px; }

    .resize-ne, .resize-nw, .resize-se, .resize-sw {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }
    .resize-ne { top: -6px; right: -6px; cursor: nesw-resize; }
    .resize-nw { top: -6px; left: -6px; cursor: nwse-resize; }
    .resize-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
    .resize-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }

    .drag-readout {
        position: absolute;
        top: 24px;
        left: 8px;
        z-index: 4;
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
        font-size: var(--pm-font-size-xs);
        font-family: var(--pm-font-mono);
        pointer-events: none;
    }
</style>
