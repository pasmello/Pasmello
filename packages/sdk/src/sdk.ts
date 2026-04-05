import { Channel } from './channel.js';
import { Storage } from './storage.js';
import { Http } from './http.js';
import { Actions } from './actions.js';
import { UI } from './ui.js';

/**
 * The Pasmello Tool SDK.
 * Tools import this and call `initSDK()` to get access to
 * storage, HTTP, actions, and UI capabilities.
 */
export class PasmelloSDK {
    readonly channel: Channel;
    readonly storage: Storage;
    readonly http: Http;
    readonly actions: Actions;
    readonly ui: UI;

    constructor() {
        this.channel = new Channel();
        this.storage = new Storage(this.channel);
        this.http = new Http(this.channel);
        this.actions = new Actions(this.channel);
        this.ui = new UI(this.channel);
    }

    /** Wait for the SDK to be ready (MessagePort received from host). */
    async ready(): Promise<void> {
        await this.channel.ready();

        // Request initial theme
        const vars = await this.ui.getTheme();
        // Apply theme variables
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
    }
}

/** Initialize the Pasmello SDK. Call this at the top of your tool. */
export async function initSDK(): Promise<PasmelloSDK> {
    const sdk = new PasmelloSDK();
    await sdk.ready();
    return sdk;
}
