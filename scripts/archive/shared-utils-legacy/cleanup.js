
const fs = require('fs');
const path = require('path');

const files = [
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
    "cleanup.py"
];

files.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f);
            console.log(`Deleted: ${f}`);
        }
    } catch (e) {
        console.error(`Error deleting ${f}: ${e.message}`);
    }
});

const dirs = ["pdv"];
dirs.forEach(d => {
    try {
        if (fs.existsSync(d)) {
            fs.rmSync(d, { recursive: true, force: true });
            console.log(`Deleted Dir: ${d}`);
        }
    } catch (e) {
        console.error(`Error deleting dir ${d}: ${e.message}`);
    }
});
