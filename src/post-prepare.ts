import { rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async (): Promise<void> => {
    try {
        await rm(path.join(__dirname, '/lib/no-styles/'), {
            recursive: true,
            force: true
        });
        console.log('Successfully removed /lib/no-styles/ directory');
    } catch (error) {
        console.error('Error removing directory:', error);
        process.exit(1);
    }
})();