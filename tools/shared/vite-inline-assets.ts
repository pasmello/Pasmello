import type { Plugin } from 'vite';

/**
 * Inline every JS chunk and CSS asset produced by Vite directly into the
 * emitted HTML so the output is a single self-contained file. Required for
 * Pasmello plugin iframes: they load via `sandbox="allow-scripts"` +
 * `srcdoc`, so external `<script src>` / `<link href>` cannot resolve.
 */
export function inlineAssets(): Plugin {
    return {
        name: 'inline-assets',
        enforce: 'post',
        generateBundle(_, bundle) {
            const htmlFile = Object.values(bundle).find(
                (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.html'),
            );
            if (!htmlFile || htmlFile.type !== 'asset') return;

            let html = typeof htmlFile.source === 'string'
                ? htmlFile.source
                : new TextDecoder().decode(htmlFile.source);

            const scripts: string[] = [];
            for (const [name, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk' && name.endsWith('.js')) {
                    const patterns = [
                        `<script type="module" crossorigin src="./${chunk.fileName}"></script>`,
                        `<script type="module" src="./${chunk.fileName}"></script>`,
                    ];
                    for (const tag of patterns) {
                        html = html.replace(tag, '');
                    }
                    scripts.push(chunk.code);
                    delete bundle[name];
                }
            }

            if (scripts.length > 0) {
                const inline = `<script>${scripts.join('\n')}</script>`;
                html = html.replace('</body>', `${inline}\n</body>`);
            }

            for (const [name, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'asset' && name.endsWith('.css')) {
                    const source = typeof chunk.source === 'string'
                        ? chunk.source
                        : new TextDecoder().decode(chunk.source);
                    const tag = `<link rel="stylesheet" crossorigin href="./${chunk.fileName}">`;
                    const inline = `<style>${source}</style>`;
                    html = html.replace(tag, inline);
                    delete bundle[name];
                }
            }

            htmlFile.source = html;
        },
    };
}
