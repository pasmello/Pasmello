/** Common plugin types shared by tools and themes. */

export type PluginKind = 'tool' | 'theme';

export interface PluginPermissions {
    network: string[];
    storage: 'none' | 'read' | 'read-write';
    clipboard: 'none' | 'read' | 'read-write';
    notifications: boolean;
    camera: boolean;
    geolocation: boolean;
}
