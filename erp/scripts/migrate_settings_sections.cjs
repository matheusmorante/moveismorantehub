const fs = require('fs');
const path = require('path');

const SETTINGS_COMPONENTS_DIR = path.resolve(__dirname, '../src/pages/App/Settings/components');

const SECTION_GROUPS = {
    fiscal: [
        'CompanyFiscalDataSection.tsx',
        'FiscalSettingsSection.tsx',
    ],
    integrations: [
        'WhatsAppConfigSection.tsx',
        'WhatsAppTemplatesSection.tsx',
        'BlingConfigSection.tsx',
    ],
    ai: [
        'AIPromptsSection.tsx',
        'AiQualityFeedbackSection.tsx',
        'AiUsageDashboardPanel.tsx',
    ],
    operations: [
        'InventoryAutomationSection.tsx',
        'InventoryNotificationsSection.tsx',
        'LogisticsSection.tsx',
        'HandlingSection.tsx',
        'OrderAutomationSection.tsx',
        'OrderNotificationTestSection.tsx',
        'ReceiptConfigSection.tsx',
        'ScannerConfigSection.tsx',
    ],
    general: [
        'AppearanceSection.tsx',
        'CompanySettingsSection.tsx',
        'AccessManagementSection.tsx',
        'BusinessRulesSection.tsx',
        'AutoScrollSection.tsx',
        'CardFlagSettings.tsx',
        'ChannelDescriptionsSection.tsx',
        'ProductMaterialsSection.tsx',
        'StatusLabelsSection.tsx',
        'ValidationConfigSection.tsx',
    ],
};

console.log('--- Migrando seções de Settings para subpastas semânticas ---');

for (const [group, files] of Object.entries(SECTION_GROUPS)) {
    const targetDir = path.join(SETTINGS_COMPONENTS_DIR, group);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const fileName of files) {
        const srcPath = path.join(SETTINGS_COMPONENTS_DIR, fileName);
        const destPath = path.join(targetDir, fileName);

        if (!fs.existsSync(srcPath)) {
            console.warn(`Arquivo não encontrado: ${fileName}`);
            continue;
        }

        let content = fs.readFileSync(srcPath, 'utf-8');

        // Ajustar imports relativos que apontavam para o mesmo nível (./) para subir um nível (../)
        content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, "from '../$1'");

        fs.writeFileSync(destPath, content, 'utf-8');
        console.log(`Copiado: ${group}/${fileName}`);

        // Criar barrel proxy no local original
        const baseName = fileName.replace(/\.tsx$/, '');
        const proxyContent = `// Re-export para retrocompatibilidade arquitetural (Skill: organizacao-arquivos-diretorios)\nexport * from './${group}/${baseName}';\nexport { default } from './${group}/${baseName}';\n`;
        fs.writeFileSync(srcPath, proxyContent, 'utf-8');
        console.log(`Barrel proxy criado: ${fileName}`);
    }
}

console.log('--- Migração de seções de Settings concluída! ---');
