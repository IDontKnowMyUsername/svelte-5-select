// Creates the GitHub release for the tag release-it just pushed, using that
// version's hand-written CHANGELOG section as the body. Runs from release-it's
// after:release hook, so the tag is already on the remote by the time it fires.
//
// Why a hook instead of release-it's own github.release: this machine keeps no
// PAT, so there is no GITHUB_TOKEN for release-it to use — it warns and degrades
// to printing a "create it in your browser" URL, which reads like success. gh
// authenticates with its own OAuth token, so shelling out to it needs no secret
// in the environment. The notes travel over stdin (--notes-file -) because gh is
// installed as a snap and cannot read files under /tmp.
//
// Safe to re-run: an existing release for the tag is left alone.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [version, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');

if (!version) {
    console.error('usage: node scripts/gh-release.mjs <version> [--dry-run]');
    process.exit(1);
}

const tag = `v${version}`;
const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const start = lines.findIndex((line) => new RegExp(`^## ${escaped} \\(`).test(line));
if (start === -1) {
    console.error(`CHANGELOG.md has no "## ${version} (yyyy-mm-dd)" section to use as release notes.`);
    process.exit(1);
}
const end = lines.findIndex((line, i) => i > start && /^## /.test(line));
const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();

const notes = [body, compareLink()].filter(Boolean).join('\n\n');

if (dryRun) {
    console.log(`gh release create ${tag} --title "Release ${version}" --verify-tag --notes-file -`);
    console.log('--- notes ---');
    console.log(notes);
    process.exit(0);
}

if (spawnSync('gh', ['release', 'view', tag], { stdio: 'ignore' }).status === 0) {
    console.log(`GitHub release ${tag} already exists — leaving it as is.`);
    process.exit(0);
}

const created = spawnSync(
    'gh',
    ['release', 'create', tag, '--title', `Release ${version}`, '--verify-tag', '--notes-file', '-'],
    { input: notes, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] },
);

if (created.error || created.status !== 0) {
    console.error(
        `\ngh could not create the GitHub release for ${tag}. The npm publish and the tag itself are ` +
            `unaffected — only the release page is missing. Retry it on its own with:\n\n` +
            `  node scripts/gh-release.mjs ${version}\n`,
    );
    process.exit(1);
}

// "**Full changelog**: <repo>/compare/<previous tag>...<tag>", or '' when either
// half is unavailable (first release, shallow clone, missing repository field).
function compareLink() {
    const previous = spawnSync('git', ['describe', '--tags', '--abbrev=0', `${tag}^`], { encoding: 'utf8' });
    if (previous.status !== 0) return '';

    const { repository } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const repo = repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '');
    if (!repo) return '';

    return `**Full changelog**: ${repo}/compare/${previous.stdout.trim()}...${tag}`;
}
