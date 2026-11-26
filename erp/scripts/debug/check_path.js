import fs from 'fs';
const ROOT_PATH = 'H:\\owner';

try {
    if (fs.existsSync(ROOT_PATH)) {
        const folders = fs.readdirSync(ROOT_PATH);
        console.log(`FOUND_ROOT: ${ROOT_PATH}`);
        console.log(`TOTAL_FOLDERS: ${folders.length}`);
        console.log('SAMPLES:', folders.slice(0, 5));
    } else {
        console.log(`NOT_FOUND: ${ROOT_PATH}`);
    }
} catch (e) {
    console.error('ERROR:', e.message);
}
process.exit(0);
