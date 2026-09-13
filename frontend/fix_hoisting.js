const fs = require('fs');
const path = require('path');

const files = [
    "src/app/admin/activity/page.tsx",
    "src/app/admin/ai-analytics/page.tsx",
    "src/app/admin/credits/page.tsx",
    "src/app/admin/orders/page.tsx",
    "src/app/admin/products/page.tsx",
    "src/app/admin/recommendations/page.tsx",
    "src/app/admin/subscriptions/page.tsx",
    "src/app/admin/trends/page.tsx",
    "src/app/admin/users/detail/page.tsx"
];

function fixFile(filepath) {
    if (!fs.existsSync(filepath)) {
        console.log(`File not found: ${filepath}`);
        return;
    }

    let content = fs.readFileSync(filepath, 'utf-8');

    const useEffectPattern = /(\s*useEffect\(\(\) => \{\n\s*fetch[a-zA-Z0-9_]+\(\);\n\s*\}, \[\]\);\n)/;
    const match = content.match(useEffectPattern);
    
    if (!match) {
        console.log(`useEffect not found in ${filepath}`);
        return;
    }
        
    const useEffectBlock = match[1];
    
    let contentWithoutEffect = content.replace(useEffectBlock, '\n');
    
    const returnPattern = /(\s*return \()/;
    const returnMatch = contentWithoutEffect.match(returnPattern);
    
    if (!returnMatch) {
        console.log(`return statement not found in ${filepath}`);
        return;
    }
        
    const index = returnMatch.index;
    const finalContent = contentWithoutEffect.slice(0, index) + useEffectBlock + contentWithoutEffect.slice(index);
    
    fs.writeFileSync(filepath, finalContent, 'utf-8');
    console.log(`Fixed ${filepath}`);
}

files.forEach(fixFile);
