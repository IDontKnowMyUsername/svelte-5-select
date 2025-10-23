import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore - find-in-files doesn't have types
import { find } from 'find-in-files';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_PATTERN = /((.|\n)*)(?=<style)/;
const SOURCE_FOLDER = path.join(__dirname, 'lib');

interface SearchResult {
    matches: string[];
}

interface SearchResults {
    [key: string]: SearchResult;
}

(async () => {
    const searchResults: SearchResults = await find(USAGE_PATTERN, SOURCE_FOLDER, '.svelte$');
    const promises: Promise<void | string>[] = [
        mkdir(path.join(__dirname, '/lib/no-styles'), { recursive: true })
    ];

    Object.keys(searchResults).forEach((key) => {
        const fileName = key.split('/').pop();
        if (fileName === 'Select.svelte') {
            searchResults[key].matches[0] = searchResults[key].matches[0].replace('./filter', '../filter');
            searchResults[key].matches[0] = searchResults[key].matches[0].replace('./get-items', '../get-items');
        }
        promises.push(writeFile(path.join(__dirname, '/lib/no-styles', fileName!), searchResults[key].matches[0]));
    });

    await Promise.all(promises);
})();