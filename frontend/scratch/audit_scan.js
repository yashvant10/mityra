const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'src');

function scanTodosAndLinks() {
    let todos = [];
    let links = new Set();
    const linkPattern = /href=["'](\/[^"']+)["']|href=\{`([^`]+)`\}/g;

    function walk(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(function(file) {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(walk(file));
            } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
                results.push(file);
            }
        });
        return results;
    }

    const files = walk(FRONTEND_DIR);
    
    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, i) => {
            if (line.includes('TODO') || line.includes('FIXME')) {
                todos.push({ file, line: i + 1, text: line.trim() });
            }
        });

        let match;
        while ((match = linkPattern.exec(content)) !== null) {
            let link = match[1] || match[2];
            if (link) {
                let cleanLink = link.split('?')[0];
                if (!cleanLink.includes('${')) {
                    links.add(cleanLink);
                } else {
                    links.add(cleanLink.substring(0, cleanLink.indexOf('${')));
                }
            }
        }
    });

    return { todos, links: Array.from(links) };
}

function getActualRoutes() {
    let routes = new Set();
    const appDir = path.join(FRONTEND_DIR, 'app');

    function walkApp(dir) {
        const list = fs.readdirSync(dir);
        list.forEach(function(file) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                walkApp(filePath);
            } else if (file === 'page.tsx' || file === 'page.js') {
                let relPath = path.relative(appDir, dir);
                if (relPath === '') {
                    routes.add('/');
                } else {
                    let parts = relPath.split(path.sep);
                    let cleanParts = parts.filter(p => !(p.startsWith('(') && p.endsWith(')')));
                    let cleanPath = '/' + cleanParts.join('/');
                    if (cleanPath === '/') cleanPath = '/';
                    else cleanPath = cleanPath.replace(/\/\//g, '/').replace(/\/$/, '');
                    routes.add(cleanPath);
                }
            }
        });
    }

    walkApp(appDir);
    return Array.from(routes);
}

const { todos, links } = scanTodosAndLinks();
const actualRoutes = getActualRoutes();

console.log("=== TODOs ===");
todos.forEach(t => console.log(`${t.file}:${t.line} - ${t.text}`));

console.log("\n=== DEAD LINKS ===");
let deadLinks = [];
links.forEach(link => {
    link = link.replace(/\/$/, '');
    if (!link) link = '/';
    let found = false;
    for (let route of actualRoutes) {
        if (route === link || (route !== '/' && link.startsWith(route))) {
            found = true;
            break;
        }
    }
    if (!found && !link.startsWith('http') && !link.startsWith('mailto') && !link.startsWith('tel') && !link.startsWith('#')) {
        deadLinks.push(link);
    }
});

deadLinks.sort().forEach(dl => console.log(dl));

console.log("\n=== ACTUAL ROUTES ===");
actualRoutes.sort().forEach(ar => console.log(ar));
