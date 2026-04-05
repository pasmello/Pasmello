import type { RequestHandler } from './host-bridge.js';

/**
 * Returns current CSS custom properties (--pm-*) to tools.
 * Tools use these to stay visually consistent with the active theme.
 */
export function createThemeHandler(): RequestHandler {
    return async () => {
        const vars: Record<string, string> = {};
        const root = document.documentElement;
        const computed = getComputedStyle(root);

        // Extract all --pm-* custom properties
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === "[data-theme='dark']")) {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--pm-')) {
                                vars[prop] = computed.getPropertyValue(prop).trim();
                            }
                        }
                    }
                }
            } catch {
                // Cross-origin stylesheet, skip
            }
        }

        return vars;
    };
}
