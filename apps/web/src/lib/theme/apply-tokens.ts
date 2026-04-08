import type { ThemeManifest } from '@pasmello/shared';

// Track which properties were set by the theme so we can clean them up on switch
const appliedProps = new Set<string>();

export function applyThemeTokens(manifest: ThemeManifest, colorScheme: 'light' | 'dark'): void {
    const root = document.documentElement;

    // Clear previously applied overrides
    for (const prop of appliedProps) {
        root.style.removeProperty(prop);
    }
    appliedProps.clear();

    // Pick the right token set for the current color scheme.
    // In light mode: apply tokens only.
    // In dark mode: apply darkTokens only (falls back to base CSS [data-theme='dark'] rules).
    // This avoids inline styles from tokens blocking the CSS dark-mode rules.
    const activeTokens = colorScheme === 'dark'
        ? (manifest.darkTokens ?? {})
        : (manifest.tokens ?? {});

    for (const [prop, value] of Object.entries(activeTokens)) {
        root.style.setProperty(prop, value);
        appliedProps.add(prop);
    }
}

export function applyTokenOverride(prop: string, value: string): void {
    document.documentElement.style.setProperty(prop, value);
    appliedProps.add(prop);
}
