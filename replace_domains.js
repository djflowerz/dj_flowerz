const fs = require('fs');
const path = require('path');

function replaceInFolder(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceInFolder(fullPath);
        } else {
            const ext = path.extname(file);
            if (['.js', '.tsx', '.ts', '.jsx', '.cjs', '.html', '.sh', '.json', '.dev', '.prod'].includes(ext) || file === 'index.html') {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('api.djflowerz.co.ke')) {
                    content = content.replace(/djflowerz-worker\.ianmuriithiflowerz\.workers\.dev/g, 'api.djflowerz.co.ke');
                    fs.writeFileSync(fullPath, content);
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}

replaceInFolder('.');
console.log("Replacement complete.");
