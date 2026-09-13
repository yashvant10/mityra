import os
import sys

def search_text(path, text):
    matches = []
    exclude_dirs = {".git", "node_modules", ".next", "__pycache__", ".agents"}
    for root, dirs, files in os.walk(path):
        # Modify dirs in-place to prevent os.walk from entering them
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        if text.lower() in line.lower():
                            matches.append((file_path, line_num, line.strip()))
            except Exception:
                pass
    return matches

if __name__ == "__main__":
    workspace = r"c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main"
    for term in ["AI Canvas Offline", "rate-limited"]:
        print(f"Searching for '{term}':")
        results = search_text(workspace, term)
        for r in results:
            print(f"File: {r[0]} (Line {r[1]}): {r[2]}")
