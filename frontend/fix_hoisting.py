import re
import os

files = [
    r"src\app\admin\activity\page.tsx",
    r"src\app\admin\ai-analytics\page.tsx",
    r"src\app\admin\credits\page.tsx",
    r"src\app\admin\orders\page.tsx",
    r"src\app\admin\products\page.tsx",
    r"src\app\admin\recommendations\page.tsx",
    r"src\app\admin\subscriptions\page.tsx",
    r"src\app\admin\trends\page.tsx",
    r"src\app\admin\users\detail\page.tsx"
]

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the useEffect block
    # It usually looks like:
    #   useEffect(() => {
    #     fetchSomething();
    #   }, []);
    
    use_effect_pattern = re.compile(r'(\s*useEffect\(\(\) => \{\n\s*fetch[a-zA-Z0-9_]+\(\);\n\s*\}, \[\]\);\n)')
    
    match = use_effect_pattern.search(content)
    if not match:
        print(f"useEffect not found in {filepath}")
        return
        
    use_effect_block = match.group(1)
    
    # Remove the useEffect block
    content_without_effect = content.replace(use_effect_block, '\n')
    
    # Find the fetch function definition
    fetch_func_pattern = re.compile(r'(\s*const fetch[a-zA-Z0-9_]+ = async \(\) => \{)')
    fetch_match = fetch_func_pattern.search(content_without_effect)
    
    if not fetch_match:
        print(f"fetch function not found in {filepath}")
        return
        
    # Insert the useEffect block AFTER the fetch function block
    # Actually it's easier to insert it at the end of the fetch function or just before the return statement
    # A better approach: 
    # Just move the useEffect to right before the first return statement of the component
    return_pattern = re.compile(r'(\s*return \()')
    return_match = return_pattern.search(content_without_effect)
    
    if not return_match:
        print(f"return statement not found in {filepath}")
        return
        
    # Insert useEffect right above the return statement
    final_content = content_without_effect[:return_match.start()] + use_effect_block + content_without_effect[return_match.start():]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"Fixed {filepath}")

for f in files:
    fix_file(f)
