import type { Channel } from '@pasmello/sdk';
import type { CurrentView } from './chrome.js';

type RouteListener = (view: CurrentView) => void;

/**
 * Ambient layer API. Available only when the theme iframe is mounted as the
 * ambient layer. Read-only — ambient layers can't send events to the host.
 */
export class AmbientAPI {
    private _currentRoute: CurrentView = 'home';
    private listeners = new Set<RouteListener>();

    constructor(private channel: Channel) {
        this.channel.onMessage('route:change', (data) => {
            const payload = (data ?? {}) as { view?: CurrentView };
            if (payload.view && payload.view !== this._currentRoute) {
                this._currentRoute = payload.view;
                for (const cb of this.listeners) {
                    try { cb(this._currentRoute); }
                    catch (err) { console.warn('[theme-sdk] route listener failed', err); }
                }
            }
        });
    }

    get currentRoute(): CurrentView {
        return this._currentRoute;
    }

    onRouteChange(cb: RouteListener): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }
}
