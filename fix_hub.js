const fs = require('fs');
const file = 'mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('Filtro Global'));
if (startIndex !== -1) {
  // Line with {activeTab !== 'assemblies' && (
  lines.splice(startIndex + 1, 1);
  
  // Find closing )}
  const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes(')}'));
  if (endIndex !== -1) {
    lines.splice(endIndex, 1);
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Done');
