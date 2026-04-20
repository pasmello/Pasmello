import type { Channel } from '@pasmello/sdk';

export type CurrentView = 'workspace' | 'tools' | 'themes' | 'workflows' | 'settings';

type ViewListener = (view: CurrentView) => void;
type NameListener = (name: string) => void;

/**
 * Chrome layer API. Available only when the theme iframe is mounted as the
 * chrome layer. Provides nav state + navigation helpers.
 */
export class ChromeAPI {
    private _currentView: CurrentView = 'workspace';
    private _workspaceName = '';
    private viewListeners = new Set<ViewListener>();
    private nameListeners = new Set<NameListener>();

    constructor(private channel: Channel) {
        this.channel.onMessage('nav:update', (data) => {
            const payload = (data ?? {}) as { currentView?: CurrentView; workspaceName?: string };
            if (payload.currentView && payload.currentView !== this._currentView) {
                this._currentView = payload.currentView;
                for (const cb of this.viewListeners) {
                    try { cb(this._currentView); }
                    catch (err) { console.warn('[theme-sdk] nav listener failed', err); }
                }
            }
            if (typeof payload.workspaceName === 'string' && payload.workspaceName !== this._workspaceName) {
                this._workspaceName = payload.workspaceName;
                for (const cb of this.nameListeners) {
                    try { cb(this._workspaceName); }
                    catch (err) { console.warn('[theme-sdk] workspace-name listener failed', err); }
                }
            }
        });
    }

    get currentView(): CurrentView {
        return this._currentView;
    }

    get workspaceName(): string {
        return this._workspaceName;
    }

    /** Navigate the host to another top-level view. Non-allowlisted targets are silently rejected by the host. */
    navigate(to: CurrentView): void {
        this.channel.send('ui:navigate', { to });
    }

    /** Report a new chrome region size to the host (e.g., collapsed sidebar). */
    resize(size: number): void {
        this.channel.send('chrome:resize', { size });
    }

    onViewChange(cb: ViewListener): () => void {
        this.viewListeners.add(cb);
        return () => this.viewListeners.delete(cb);
    }

    onWorkspaceNameChange(cb: NameListener): () => void {
        this.nameListeners.add(cb);
        return () => this.nameListeners.delete(cb);
    }
}
