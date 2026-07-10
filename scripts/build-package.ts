import { mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'svelte/compiler';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib');
const NO_STYLES = path.join(LIB, 'no-styles');

interface StyleSpan {
    start: number;
    end: number;
}

function findStyleSpan(source: string, filename: string): StyleSpan | null {
    const ast = parse(source, { filename, modern: true }) as unknown as { css: StyleSpan | null };
    return ast.css;
}

// Relative value imports must move up one directory unless they point at a
// sibling component that also gets a no-styles copy.
function rewriteRelativeImports(source: string, siblings: Set<string>): string {
    return source.replace(
        /((?:from|import)\s+['"])\.\/([^'"]+)(['"])/g,
        (match, pre: string, spec: string, post: string) => (siblings.has(spec) ? match : `${pre}../${spec}${post}`),
    );
}

async function generateNoStyles(): Promise<void> {
    const componentFiles = (await readdir(LIB)).filter((f) => f.endsWith('.svelte'));

    const stripped = new Map<string, string>();
    for (const file of componentFiles) {
        const source = await readFile(path.join(LIB, file), 'utf-8');
        const css = findStyleSpan(source, file);
        if (!css) continue;
        stripped.set(file, source.slice(0, css.start) + source.slice(css.end));
    }

    const siblings = new Set(stripped.keys());
    await mkdir(NO_STYLES, { recursive: true });
    for (const [file, source] of stripped) {
        await writeFile(path.join(NO_STYLES, file), rewriteRelativeImports(source, siblings));
    }
}

(async () => {
    try {
        await generateNoStyles();
        execSync('pnpm exec svelte-package', { cwd: ROOT, stdio: 'inherit' });
    } finally {
        await rm(NO_STYLES, { recursive: true, force: true });
    }
})();
