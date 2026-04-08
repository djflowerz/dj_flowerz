import fs from 'fs';
import path from 'path';

function buildTree(data, hubName, prefixRemoveCount = 1) {
    const root = {};
    
    data.forEach(item => {
        if (!item.key) return;
        const parts = item.key.split('/');
        
        // Skip hidden/system files and root level files
        if (parts.length <= prefixRemoveCount + 1) return;
        
        // Remove the source bucket prefix (e.g. 'Remix & Mashups Hub/') and the filename
        const folderParts = parts.slice(prefixRemoveCount, -1);
        
        // Some vicknick files have no subfolders like 'Riddim Videos/track.mp4'
        if (folderParts.length === 0) return;

        let current = root;
        folderParts.forEach(part => {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        });
    });

    return root;
}

function printTree(node, indent = '') {
    let output = '';
    const keys = Object.keys(node).sort();
    keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        output += `${indent}${branch}${key}\n`;
        
        const nextIndent = indent + (isLast ? '    ' : '│   ');
        output += printTree(node[key], nextIndent);
    });
    return output;
}

const remixFile = '/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/worker/scripts/remix_mashups.json';
const vicknickFile = '/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/worker/scripts/vicknick_tracks.json';

let finalOutput = '# Proposed Music Pool Folder Hierarchy\n\n';

if (fs.existsSync(remixFile)) {
    const remixData = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
    // Remix keys start with "Remix & Mashups Hub/"
    const remixTree = buildTree(remixData, 'Remix & Mashups Hub', 1);
    finalOutput += '## 🎧 Remix & Mashups Hub\n```\n';
    finalOutput += printTree(remixTree);
    finalOutput += '```\n\n';
}

if (fs.existsSync(vicknickFile)) {
    const vicknickData = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
    // Vicknick keys start with "Video Pool Edits/", "Riddim Videos/", etc.
    // For Vicknick, we map them all under "Video Pool" conceptually, but the paths usually just start with the category.
    // We will build a tree assuming 0 prefix elements removed for the general pool folders.
    const vicknickTree = buildTree(vicknickData, 'Video Pool', 0);
    finalOutput += '## 📺 Video Pool\n```\n';
    finalOutput += printTree(vicknickTree);
    finalOutput += '```\n';
}

fs.writeFileSync('/Users/DJFLOWERZ/.gemini/antigravity/brain/183a0bed-b33a-443b-9732-7e46f0dc275b/proposed_hierarchy.md', finalOutput);
console.log('Hierarchy generated.');
