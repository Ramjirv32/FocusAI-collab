const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Please provide a target directory: node remove-comments.js <directory>');
    process.exit(1);
}

const extensions = ['.js', '.ts', '.jsx', '.tsx', '.css', '.html'];

function stripComments(content, ext) {
    if (ext === '.css') {
        return content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    if (ext === '.html') {
        return content.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Use a more conservative regex that won't break itself easily
    // Match strings first to avoid stripping content inside them
    return content.replace(/("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\\\])*`|\/\*[\s\S]*?\*\/|(?<!:)\/\/.*)/g, (match) => {
        if (match.startsWith('//') || match.startsWith('/*')) {
            return '';
        }
        return match;
    });
}

function processDirectory(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        return;
    }

    for (const file of files) {
        const fullPath = path.resolve(dir, file);
        if (fullPath === path.resolve(__filename)) continue;

        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }

        if (stats.isDirectory()) {
            const skip = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '__pycache__', 'venv'];
            if (!skip.includes(file)) {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (extensions.includes(ext)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const stripped = stripComments(content, ext);
                    // Optional: filter out empty lines to make it look "human-coded"
                    const final = stripped.split('\n')
                        .filter(line => line.trim().length > 0)
                        .join('\n');
                    fs.writeFileSync(fullPath, final, 'utf8');
                } catch (err) {
                    console.error(`Error processing ${fullPath}: ${err.message}`);
                }
            }
        }
    }
}

const absoluteTarget = path.resolve(targetDir);
console.log(`🧹 Removing comments in: ${absoluteTarget}`);
processDirectory(absoluteTarget);
console.log('✨ Cleanup complete!');
