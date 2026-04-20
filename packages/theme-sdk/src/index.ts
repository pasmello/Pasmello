import { Channel, Storage, Settings } from '@pasmello/sdk';
import { Tokens } from './tokens.js';
import { ChromeAPI } from './chrome.js';
import { WorkspaceAPI } from './workspace.js';
import { AmbientAPI } from './ambient.js';

export type ThemeLayerKind = 'chrome' | 'workspace' | 'ambient';

export interface ThemeSDK {
    readonly layer: ThemeLayerKind;
    readonly channel: Channel;
    readonly storage: Storage;
    readonly settings: Settings;
    readonly tokens: Tokens;
    readonly chrome?: ChromeAPI;
    readonly workspace?: WorkspaceAPI;
    readonly ambient?: AmbientAPI;
    destroy(): void;
}

/**
 * Initialize the theme SDK. The host sends `{ type: 'init', port, layer }`
 * via `postMessage` with the MessagePort transferred. This function captures
 * the layer, opens the channel, and exposes the per-layer API.
 */
export async function initThemeSDK(): Promise<ThemeSDK> {
    const layerPromise = captureLayer();

    const channel = new Channel();
    await channel.ready();

    const layer = await layerPromise;

    const storage = new Storage(channel);
    const settings = new Settings(channel);
    const tokens = new Tokens(channel);

    await tokens.initial().catch(() => undefined);

    let chrome: ChromeAPI | undefined;
    let workspace: WorkspaceAPI | undefined;
    let ambient: AmbientAPI | undefined;

    if (layer === 'chrome') chrome = new ChromeAPI(channel);
    else if (layer === 'workspace') workspace = new WorkspaceAPI(channel);
    else if (layer === 'ambient') ambient = new AmbientAPI(channel);

    return {
        layer,
        channel,
        storage,
        settings,
        tokens,
        chrome,
        workspace,
        ambient,
        destroy: () => channel.destroy(),
    };
}

function captureLayer(): Promise<ThemeLayerKind> {
    return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
            const data = event.data;
            if (data?.type === 'init' && typeof data.layer === 'string') {
                window.removeEventListener('message', handler);
                resolve(data.layer as ThemeLayerKind);
            }
        };
        window.addEventListener('message', handler);
    });
}

export { Tokens, ChromeAPI, WorkspaceAPI, AmbientAPI };
export type { PlaceArgs, DragEvent, LayoutTool } from './workspace.js';
export type { CurrentView, ColorScheme } from './chrome.js';
