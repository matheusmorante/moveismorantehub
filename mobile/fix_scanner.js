const fs = require('fs');
const path = 'src/features/stock/inventory/screens/InventoryScannerScreen.tsx';
let c = fs.readFileSync(path, 'utf8');

// fix bottom padding
c = c.replace(/paddingBottom: 48,/, 'paddingBottom: 80,'); // using 80 for safety (iPhone bottom bar)

// fix button transform
c = c.replace(/transform: \[\{ translateY: -10 \}\],/, 'marginBottom: 16,');

// inject import
if (!c.includes('playInventoryCountSound')) {
  c = c.replace(/import \{ View, Text, StyleSheet, TouchableOpacity, Alert \} from 'react-native';/, "import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';\nimport { playInventoryCountSound } from '../../../../services/inventoryCountSound';");
  
  // inject sound play
  c = c.replace(/triggerFrameBorder\('success'\);/, "triggerFrameBorder('success');\n          playInventoryCountSound();");
}

fs.writeFileSync(path, c);
console.log('Done fixes');
