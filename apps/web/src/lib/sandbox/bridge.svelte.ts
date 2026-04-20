import { HostBridge } from './host-bridge.js';
import { createStorageHandlers } from './storage-handler.js';
import { createHttpHandler } from './http-handler.js';
import { createThemeHandler } from './theme-handler.js';
import { createSettingsHandlers } from './settings-handler.js';
import { createNavHandler, createChromeResizeHandler, createColorSchemeHandler } from './nav-handler.js';
import { createLayoutHandler, type PlaceCommand } from './layout-handler.js';

export type { PlaceCommand };

class BridgeManager {
    /** Tool iframe bridge (workspace grid). */
    bridge: HostBridge | null = $state(null);
    /** Theme layer iframe bridge (chrome / ambient / workspace layers). */
    themeBridge: HostBridge | null = $state(null);

    /** Dynamic chrome size reported by the chrome layer (e.g., collapsed sidebar). */
    chromeSizeOverride: number | null = $state(null);

    /** Pending per-tool position overrides from the workspace theme layer. */
    layoutOverrides: Record<string, PlaceCommand> = $state({});

    private workspace = $state('default');

    init(workspaceName: string) {
        this.destroy();
        this.workspace = workspaceName;

        this.bridge = this.buildBridge('tool');
        this.themeBridge = this.buildBridge('theme');
    }

    /** Broadcast theme tokens to all mounted iframes (tools + theme layers). */
    broadcastTheme() {
        if (!this.bridge && !this.themeBridge) return;
        const handler = createThemeHandler();
        handler('', undefined).then((vars) => {
            this.bridge?.broadcast('theme:update', vars);
            this.themeBridge?.broadcast('theme:update', vars);
        });
    }

    /** Notify a tool that one of its settings changed. */
    broadcastSettingsChange(toolId: string, key: string, value: unknown) {
        const mount = this.bridge?.findByToolId(toolId);
        if (mount) this.bridge!.send(mount.id, 'settings:update', { key, value });
    }

    /** Notify a theme (all layers) that one of its settings changed. */
    broadcastThemeSettingsChange(themeId: string, key: string, value: unknown) {
        if (!this.themeBridge) return;
        for (const mount of this.themeBridge.listMounts()) {
            if (mount.toolId === themeId) {
                this.themeBridge.send(mount.id, 'settings:update', { key, value });
            }
        }
    }

    /** Push the current view + workspace name + color scheme to the chrome layer. */
    broadcastNav(currentView: string, workspaceName: string, colorScheme: 'light' | 'dark') {
        this.themeBridge?.broadcast('nav:update', { currentView, workspaceName, colorScheme });
    }

    /** Push route changes to the ambient layer. */
    broadcastRoute(view: string) {
        this.themeBridge?.broadcast('route:change', { view });
    }

    /** Emit a workspace drag event to the workspace layer. */
    broadcastDragEvent(e: { toolId: string; phase: 'start' | 'move' | 'end'; x: number; y: number }) {
        this.themeBridge?.broadcast('workspace:drag-event', e);
    }

    /** Emit layout changes to the workspace layer. */
    broadcastLayoutChanged(tools: Array<{ toolId: string; x: number; y: number; w: number; h: number }>) {
        this.themeBridge?.broadcast('workspace:layout-changed', { tools });
    }

    destroy() {
        this.bridge = null;
        this.themeBridge = null;
        this.chromeSizeOverride = null;
        this.layoutOverrides = {};
    }

    private buildBridge(kind: 'tool' | 'theme'): HostBridge {
        const bridge = new HostBridge();

        const storageHandlers = createStorageHandlers(this.workspace);
        for (const [type, handler] of Object.entries(storageHandlers)) {
            bridge.handle(type, handler);
        }
        bridge.handle('http:fetch', createHttpHandler());
        bridge.handle('theme:get', createThemeHandler());

        const settingsHandlers = createSettingsHandlers(kind);
        for (const [type, handler] of Object.entries(settingsHandlers)) {
            bridge.handle(type, handler);
        }

        if (kind === 'theme') {
            bridge.handle('ui:navigate', createNavHandler());
            bridge.handle('ui:color-scheme', createColorSchemeHandler());
            bridge.handle('chrome:resize', createChromeResizeHandler((_pluginId, size) => {
                this.chromeSizeOverride = size;
            }));
            bridge.handle('layout:place', createLayoutHandler((cmd) => {
                this.layoutOverrides = { ...this.layoutOverrides, [cmd.toolId]: cmd };
            }));
        }

        return bridge;
    }

}

export const bridgeManager = new BridgeManager();
