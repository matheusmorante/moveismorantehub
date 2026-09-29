const fs = require('fs');
const path = 'src/features/stock/inventory/screens/InventoryScannerScreen.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes("import { playInventoryCountSound }")) {
  c = c.replace(/import \{ X \} from 'lucide-react-native';/, "import { X } from 'lucide-react-native';\nimport { playInventoryCountSound } from '../../../../services/inventoryCountSound';");
  fs.writeFileSync(path, c);
}
console.log('Fixed imports');
