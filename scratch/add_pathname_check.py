import os
import glob

# Path to the src directory
src_dir = r"e:\App\ird-budget\src\pages"

def fix_file(filepath):
    # Determine the expected path string for the check
    rel_path = os.path.relpath(filepath, src_dir).replace('\\', '/')
    
    # Special cases:
    if rel_path == "index.astro":
        # index could be just '/' or '/index'
        path_check = "if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') return;"
    else:
        # e.g. office/form-2.astro -> /office/form-2
        route = "/" + rel_path.replace(".astro", "")
        # For routes like /office/form-2, the path will be exactly that (or with trailing slash)
        path_check = f"if (!window.location.pathname.includes('{route}')) return;"

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the astro:page-load line
    # We might have both single and double quotes
    target_1 = "document.addEventListener('astro:page-load', async () => {"
    target_2 = 'document.addEventListener("astro:page-load", async () => {'
    target_3 = "document.addEventListener('astro:page-load', () => {"
    
    lines = content.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        if target_1 in line or target_2 in line or target_3 in line:
            # Check if we already inserted a pathname check right after
            if i + 1 < len(lines) and "window.location.pathname" in lines[i+1]:
                continue
            
            # Insert the path check on the next line
            indent = line[:len(line) - len(line.lstrip())]
            lines.insert(i + 1, f"{indent}  {path_check}")
            modified = True
            break
            
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"Updated {filepath}")

# Iterate over all .astro files in pages
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.astro'):
            fix_file(os.path.join(root, file))

print("Done!")
