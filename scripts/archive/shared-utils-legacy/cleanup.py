
import os
import shutil

files_to_delete = [
    "PIA DE INOX.csv",
    "console.log(JSON.stringify(d",
    "contatos_2026-03-11-14-18-33.csv",
    "contatos_2026-03-11-14-19-01.csv",
    "contatos_2026-03-11-14-19-26.csv",
    "firebase.json",
    "firestore.rules",
    ".firebaserc",
    "apps/erp/scripts/diagnostico_fotos.js",
    "apps/erp/scripts/diagnostico_puro.cjs",
    "apps/erp/scripts/get_products.ps1",
    "apps/erp/scripts/list_florenca.cjs",
    "apps/erp/scripts/map_mesas_fix.cjs",
    "apps/erp/scripts/map_mesas_fix2.cjs",
    "apps/server/test_address.js",
    "apps/server/copy-avatar.js",
    "sem_match.json",
    "sync_log.txt"
]

dirs_to_delete = [
    "pdv"
]

for f in files_to_delete:
    if os.path.exists(f):
        try:
            os.remove(f)
            print(f"Deleted file: {f}")
        except Exception as e:
            print(f"Error deleting file {f}: {e}")

for d in dirs_to_delete:
    if os.path.exists(d):
        try:
            shutil.rmtree(d)
            print(f"Deleted directory: {d}")
        except Exception as e:
            print(f"Error deleting directory {d}: {e}")
