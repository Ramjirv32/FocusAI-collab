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
        return content.replace(/\/\*[\s\S]*?\*\
    }
    if (ext === '.html') {
        return content.replace(/<!--[\s\S]*?-->/g, '');
    }

    
    
    
    
    
    
    
    
    return content.replace(/("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\\\])*`|\/\*[\s\S]*?\*\/|(?<!:)\/\/.*)/g, (match) => {
        if (match.startsWith('//') || match.startsWith('/*')) {
            return '';
        }
        return match; // Return strings as-is
    });
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }

        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build' && file !== '.next' && file !== '.cache') {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (extensions.includes(ext)) {
                console.log(`Cleaning: ${fullPath}`);
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const stripped = stripComments(content, ext);
                    // Optional: further cleanup like removing lines that became entirely empty/whitespace
                    const finalContent = stripped.split('\n')
                        .filter(line => line.trim().length > 0 || line.length === 0) // Basic empty line preservation but can be adjusted
                        .join('\n');

                    fs.writeFileSync(fullPath, stripped, 'utf8');
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
