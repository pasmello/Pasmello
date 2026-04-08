import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Inline all JS/CSS into the HTML for sandboxed iframe CSP compatibility.
// CSP: script-src 'unsafe-inline' blocks external <script src="...">.
function inlineAssets(): Plugin {
    return {
        name: 'inline-assets',
        enforce: 'post',
        generateBundle(_, bundle) {
            const htmlFile = Object.values(bundle).find(
                (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.html')
            );
            if (!htmlFile || htmlFile.type !== 'asset') return;

            let html = typeof htmlFile.source === 'string'
                ? htmlFile.source
                : new TextDecoder().decode(htmlFile.source);

            // Collect all JS chunks to inline
            const scripts: string[] = [];
            for (const [name, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk' && name.endsWith('.js')) {
                    // Remove the script tag from <head>
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

            // Insert inline script before </body> so DOM is ready
            if (scripts.length > 0) {
                const inline = `<script>${scripts.join('\n')}</script>`;
                html = html.replace('</body>', `${inline}\n</body>`);
            }

            // Inline CSS
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

export default defineConfig({
    base: './',
    plugins: [inlineAssets()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: 'index.html',
        },
    },
});
