import { HostBridge } from './host-bridge.js';
import { createStorageHandlers } from './storage-handler.js';
import { createHttpHandler } from './http-handler.js';
import { createThemeHandler } from './theme-handler.js';
import { createSettingsHandlers } from './settings-handler.js';

class BridgeManager {
    bridge: HostBridge | null = $state(null);
    private workspace = $state('default');

    init(workspaceName: string) {
        this.destroy();
        this.workspace = workspaceName;

        const bridge = new HostBridge();

        // Register storage handlers
        const storageHandlers = createStorageHandlers(this.workspace);
        for (const [type, handler] of Object.entries(storageHandlers)) {
            bridge.handle(type, handler);
        }

        // Register HTTP proxy handler
        bridge.handle('http:fetch', createHttpHandler());

        // Register theme handler
        bridge.handle('theme:get', createThemeHandler());

        // Register per-plugin settings handlers (workspace-scoped)
        const settingsHandlers = createSettingsHandlers();
        for (const [type, handler] of Object.entries(settingsHandlers)) {
            bridge.handle(type, handler);
        }

        this.bridge = bridge;
    }

    /** Broadcast theme update to all mounted tools. */
    broadcastTheme() {
        if (!this.bridge) return;
        const handler = createThemeHandler();
        handler('', undefined).then((vars) => {
            this.bridge!.broadcast('theme:update', vars);
        });
    }

    /** Notify a specific tool (or all, if toolId omitted) that one of its
     *  settings changed. Tools can listen via `sdk.settings.onChange(...)`. */
    broadcastSettingsChange(toolId: string, key: string, value: unknown) {
        if (!this.bridge) return;
        const mounted = this.bridge.findByToolId(toolId);
        if (mounted) {
            this.bridge.send(mounted.id, 'settings:update', { key, value });
        }
    }

    destroy() {
        this.bridge = null;
    }
}

export const bridgeManager = new BridgeManager();
