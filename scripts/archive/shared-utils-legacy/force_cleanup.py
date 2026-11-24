import os
import shutil

p1 = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub\apps\erp\node_modules"
p2 = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub\apps\erp\package-lock.json"
log = r"c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub\cleanup_log.txt"

with open(log, "w") as f:
    try:
        if os.path.exists(p1):
            shutil.rmtree(p1)
            f.write(f"Deleted {p1}\n")
        else:
            f.write(f"Not found {p1}\n")
            
        if os.path.exists(p2):
            os.remove(p2)
            f.write(f"Deleted {p2}\n")
        else:
            f.write(f"Not found {p2}\n")
    except Exception as e:
        f.write(f"Error: {str(e)}\n")
