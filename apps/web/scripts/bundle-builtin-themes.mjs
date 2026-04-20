#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const BUILTINS_SRC = join(REPO_ROOT, 'themes', 'builtin');
const OUT_DIR = join(REPO_ROOT, 'apps', 'web', 'static', 'builtin-themes');

function walk(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

async function bundleTheme(themeDir, outFile) {
    const zip = new JSZip();
    zip.file('theme.manifest.json', readFileSync(join(themeDir, 'theme.manifest.json')));

    const distDir = join(themeDir, 'dist');
    if (!existsSync(distDir)) {
        throw new Error(`missing dist: ${distDir} (run the theme's build first)`);
    }
    for (const filePath of walk(distDir)) {
        const rel = relative(distDir, filePath).split(/[\\/]+/).join('/');
        zip.file(rel, readFileSync(filePath));
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    writeFileSync(outFile, buffer);
}

async function main() {
    mkdirSync(OUT_DIR, { recursive: true });
    const builtins = readdirSync(BUILTINS_SRC).filter((name) => {
        try {
            return statSync(join(BUILTINS_SRC, name, 'theme.manifest.json')).isFile();
        } catch {
            return false;
        }
    });
    if (builtins.length === 0) {
        console.warn('no theme builtins found under themes/builtin');
        return;
    }
    for (const id of builtins) {
        const out = join(OUT_DIR, `${id}.zip`);
        await bundleTheme(join(BUILTINS_SRC, id), out);
        console.log(`bundled theme ${id} -> ${relative(REPO_ROOT, out)}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
