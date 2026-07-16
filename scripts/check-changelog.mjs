// Release gate: fails when CHANGELOG.md was not retitled for the version being
// released. Runs from release-it's after:bump hook, so a forgotten retitle
// aborts the release before any commit or tag is created; publish.yml re-checks
// the same invariant on the tag as the authoritative gate.
import { readFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
    console.error('usage: node scripts/check-changelog.mjs <version>');
    process.exit(1);
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (!new RegExp(`^## ${escaped} \\(`, 'm').test(changelog)) {
    console.error(
        `CHANGELOG.md has no "## ${version} (yyyy-mm-dd)" heading — retitle the Unreleased section before releasing.`,
    );
    process.exit(1);
}
if (/^## Unreleased/m.test(changelog)) {
    console.error(`CHANGELOG.md still contains an "## Unreleased" section — fold it into ${version} before releasing.`);
    process.exit(1);
}
