import { HostBridge } from './host-bridge.js';
import { createStorageHandlers } from './storage-handler.js';
import { createHttpHandler } from './http-handler.js';
import { createThemeHandler } from './theme-handler.js';

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

    destroy() {
        this.bridge = null;
    }
}

export const bridgeManager = new BridgeManager();
