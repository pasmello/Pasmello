import { browser } from '$app/environment';

class ThemeState {
    current = $state<'light' | 'dark'>('dark');

    constructor() {
        if (browser) {
            const saved = localStorage.getItem('pm-theme');
            if (saved === 'light' || saved === 'dark') {
                this.current = saved;
            }
            this.apply();
        }
    }

    toggle() {
        this.current = this.current === 'light' ? 'dark' : 'light';
        if (browser) {
            localStorage.setItem('pm-theme', this.current);
            this.apply();
        }
    }

    private apply() {
        document.documentElement.setAttribute('data-theme', this.current);
    }
}

export const theme = new ThemeState();
