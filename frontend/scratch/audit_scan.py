import os
import re

FRONTEND_DIR = r"c:\Users\LENOVO\Desktop\PROJECT_COMPLETE_BACKUP\frontend\src"
BACKEND_DIR = r"c:\Users\LENOVO\Desktop\PROJECT_COMPLETE_BACKUP\backend\src"

def scan_todos_and_links():
    todos = []
    links = set()
    link_pattern = re.compile(r'href=["\'](/[^"\']+)["\']|href=\{`([^`]+)`\}')
    
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                    # Find TODOs
                    for i, line in enumerate(content.splitlines()):
                        if 'TODO' in line or 'FIXME' in line:
                            todos.append((path, i + 1, line.strip()))
                            
                    # Find links
                    for match in link_pattern.finditer(content):
                        link = match.group(1) or match.group(2)
                        if link:
                            # Clean up dynamic links
                            clean_link = link.split('?')[0]
                            if '${' not in clean_link:
                                links.add(clean_link)
                            else:
                                # basic replacement for dynamic links like /admin/users/${id} to /admin/users/[id]
                                links.add(clean_link[:clean_link.find('${')])
                                
    return todos, links

def get_actual_routes():
    routes = set()
    app_dir = os.path.join(FRONTEND_DIR, 'app')
    for root, dirs, files in os.walk(app_dir):
        if 'page.tsx' in files:
            rel_path = os.path.relpath(root, app_dir)
            if rel_path == '.':
                routes.add('/')
            else:
                # Remove route groups like (dashboard)
                clean_path = '/' + '/'.join(p for p in rel_path.split(os.sep) if not (p.startswith('(') and p.endswith(')')))
                if clean_path == '/': # if it was just /(dashboard)
                    clean_path = '/'
                clean_path = clean_path.replace('//', '/')
                routes.add(clean_path.rstrip('/'))
    return routes

if __name__ == '__main__':
    todos, links = scan_todos_and_links()
    actual_routes = get_actual_routes()
    
    print("=== TODOs ===")
    for t in todos:
        print(f"{t[0]}:{t[1]} - {t[2]}")
        
    print("\n=== DEAD LINKS ===")
    dead_links = []
    for link in links:
        link = link.rstrip('/')
        if not link:
            link = '/'
        # Handle dynamic routes matching
        # if link is /admin/users/detail, we check if it exists in actual_routes
        # Very rudimentary check
        found = False
        for route in actual_routes:
            # simple prefix check for dynamic routes or exact match
            if route == link or (route != '/' and link.startswith(route)):
                found = True
                break
        if not found and not link.startswith(('http', 'mailto', 'tel', '#')):
            dead_links.append(link)
            
    for dl in sorted(dead_links):
        print(dl)
        
    print("\n=== AVAILABLE ROUTES ===")
    for r in sorted(actual_routes):
        print(r)
