#!/usr/bin/env bash
# Packs the library and builds a minimal consumer app against the tarball,
# exercising the main export, the no-styles subpath, and export resolution
# of the css subpaths. Catches broken exports/dist before publish.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -d "$ROOT/dist/no-styles" ]; then
    echo "dist/no-styles missing - run 'pnpm run package' first" >&2
    exit 1
fi

cd "$ROOT"
TARBALL="$(pnpm pack --pack-destination "$WORK" | tail -n1)"
echo "packed: $TARBALL"

APP="$WORK/app"
mkdir -p "$APP/src"

cat > "$APP/package.json" <<EOF
{
    "name": "smoke-app",
    "private": true,
    "type": "module",
    "dependencies": {
        "svelte-5-select": "file:$TARBALL"
    },
    "devDependencies": {
        "@sveltejs/vite-plugin-svelte": "^7.0.0",
        "svelte": "^5.55.2",
        "vite": "^8.0.7"
    }
}
EOF

cat > "$APP/vite.config.js" <<'EOF'
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default {
    plugins: [svelte()],
};
EOF

cat > "$APP/index.html" <<'EOF'
<!doctype html>
<html>
    <body>
        <div id="app"></div>
        <script type="module" src="/src/main.js"></script>
    </body>
</html>
EOF

cat > "$APP/src/main.js" <<'EOF'
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
EOF

cat > "$APP/src/App.svelte" <<'EOF'
<script>
    import { Select } from 'svelte-5-select';
    import NoStylesSelect from 'svelte-5-select/no-styles/Select.svelte';

    const items = ['one', 'two', 'three'];
</script>

<Select {items} />
<NoStylesSelect {items} />
EOF

cd "$APP"
pnpm install --silent
pnpm exec vite build

node --conditions=svelte --input-type=module -e "
import.meta.resolve('svelte-5-select/tailwind.css');
import.meta.resolve('svelte-5-select/styles/default.css');
console.log('css subpaths resolve');
"

echo "SMOKE TEST PASSED"
