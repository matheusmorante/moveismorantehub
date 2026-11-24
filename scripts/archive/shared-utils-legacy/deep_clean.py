import os
import shutil
import subprocess
import time

def kill_node():
    print("Killing node processes...")
    try:
        subprocess.run(["taskkill", "/F", "/IM", "node.exe", "/T"], capture_output=True)
    except:
        pass
    time.sleep(2)

def remove_path(path):
    if not os.path.exists(path):
        print(f"Path not found: {path}")
        return
    
    print(f"Handling {path}...")
    try:
        if os.path.isfile(path):
            os.remove(path)
            print(f"Deleted file {path}")
        else:
            # Atomic rename trick for locked folders
            temp_path = path + "_old_" + str(int(time.time()))
            try:
                os.rename(path, temp_path)
                print(f"Renamed {path} to {temp_path}")
                path_to_del = temp_path
            except:
                print(f"Could not rename {path}, will try direct deletion")
                path_to_del = path

            subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", path_to_del], capture_output=True)
            if not os.path.exists(path_to_del):
                print(f"Successfully deleted {path_to_del}")
            else:
                print(f"Failed to delete {path_to_del} - still locked.")
    except Exception as e:
        print(f"Error handling {path}: {e}")

if __name__ == "__main__":
    base_dir = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub"
    
    kill_node()
    
    paths_to_clean = [
        os.path.join(base_dir, "node_modules"),
        os.path.join(base_dir, "package-lock.json"),
        os.path.join(base_dir, "apps", "erp", "node_modules"),
        os.path.join(base_dir, "apps", "erp", "package-lock.json"),
    ]
    
    for p in paths_to_clean:
        remove_path(p)
    
    print("\nCleanup cycle finished. Running install...")
    try:
        # Run install in root
        subprocess.run(["npm", "install", "--legacy-peer-deps"], cwd=base_dir, shell=True)
    except Exception as e:
        print(f"Install failed: {e}")
