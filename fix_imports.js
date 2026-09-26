const fs = require('fs');
const path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// add supabase if not exists
if (!content.includes('supabaseClient')) {
    content = content.replace(/import { saveComposition } from '\.\.\/services\/mobileCompositionService';/, "import { saveComposition } from '../services/mobileCompositionService';\nimport { supabase } from '../../../../services/supabaseClient';");
}

fs.writeFileSync(path, content, 'utf8');
