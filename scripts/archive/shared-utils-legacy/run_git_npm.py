import subprocess
import os

repo_path = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub"
log_file = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub\git_npm_log.txt"

def run_cmd(cmd):
    with open(log_file, "a") as f:
        f.write(f"\nRunning: {cmd}\n")
        try:
            result = subprocess.run(cmd, shell=True, cwd=repo_path, capture_output=True, text=True)
            f.write("STDOUT:\n")
            f.write(result.stdout)
            f.write("\nSTDERR:\n")
            f.write(result.stderr)
            return result.returncode == 0
        except Exception as e:
            f.write(f"Exception: {str(e)}\n")
            return False

if os.path.exists(log_file):
    os.remove(log_file)

if run_cmd("git fetch --all"):
    run_cmd("git reset --hard @{u}")
    run_cmd("npm install")
else:
    run_cmd("git status") # Try to see what's wrong
