const fs = require('fs');
const path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');
let replacement = fs.readFileSync('replace.txt', 'utf8');

content = content.replace(/    const renderItemsTab = \(\) => \([\s\S]*?<\/TouchableOpacity>\s*<\/View>/, replacement);

fs.writeFileSync(path, content, 'utf8');
