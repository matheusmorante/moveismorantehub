
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROOT_PATH = 'H:\\owner';
const FLORENCA_PATH = path.join(ROOT_PATH, 'COZINHA FLORENCA');

const COMPONENT_NAMES = {
    'BALCAO': 'Balcão para Pia 1,20m 3 Gavetas',
    'AEREO_PIA': 'Armário Aéreo 3 Portas 1,20m',
    'AEREO_80': 'Armário Aéreo 1 Porta Basculante 80cm',
    'PANELEIRO': 'Paneleiro com Vidro 2 Portas',
    'TORRE': 'Torre Quente para Forno e Microondas',
    'COOKTOP': 'Balcão para Cooktop 2 Portas 80cm'
};

async function uploadFile(filePath, storagePath) {
    const fileData = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage.from('product-images').upload(storagePath, fileData, {
        upsert: true
    });
    if (error) {
        if (error.message === 'The resource already exists') {
            const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
            return publicData.publicUrl;
        }
        throw error;
    }
    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
    return publicData.publicUrl;
}

async function syncFlorenca() {
    console.log("🚀 Iniciando Sincronização Premium da Linha Florença (Logica Profissional)...");
    
    // 1. Pegar todos os produtos Florença do Banco
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, description, images, main_image_url')
        .ilike('name', '%FLORENCA%')
        .eq('deleted', false);

    if (error) {
        console.error("Erro ao buscar produtos:", error);
        return;
    }

    // 2. Mapear arquivos da pasta COZINHA FLORENCA
    const files = fs.readdirSync(FLORENCA_PATH).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    const productsToUpdate = new Map();
    
    for (const file of files) {
        const filePath = path.join(FLORENCA_PATH, file);
        const fileName = file.toUpperCase();
        
        // Detectar Cor
        let colorMatch = null;
        if (fileName.includes('ANGELIN') && fileName.includes('CINZA')) colorMatch = 'Angelin/Cinza';
        else if (fileName.includes('CANARY') || fileName.includes('OFFWHITE')) colorMatch = 'Canary/Off White';
        
        // Match com Produtos do Banco
        let targetProduct = null;
        let componentsInCombo = [];

        // Identificar componentes no combo pelo nome do arquivo
        if (fileName.includes('CENA') || fileName.includes('PCS')) {
            const piecesMatch = fileName.match(/(\d+)PCS/);
            const numPieces = piecesMatch ? piecesMatch[1] : null;

            // Determinar quais componentes compõem este combo com base no número de peças (Exemplo padrão)
            if (numPieces === '4') componentsInCombo = [COMPONENT_NAMES.BALCAO, COMPONENT_NAMES.AEREO_PIA, COMPONENT_NAMES.PANELEIRO, COMPONENT_NAMES.AEREO_80];
            else if (numPieces === '5') componentsInCombo = [COMPONENT_NAMES.BALCAO, COMPONENT_NAMES.AEREO_PIA, COMPONENT_NAMES.PANELEIRO, COMPONENT_NAMES.AEREO_80, COMPONENT_NAMES.TORRE];
            else if (numPieces === '6') componentsInCombo = [COMPONENT_NAMES.BALCAO, COMPONENT_NAMES.AEREO_PIA, COMPONENT_NAMES.PANELEIRO, COMPONENT_NAMES.AEREO_80, COMPONENT_NAMES.TORRE, COMPONENT_NAMES.COOKTOP];

            targetProduct = dbProducts.find(p => {
                const name = p.name.toUpperCase();
                return (name.includes('JOGO') || name.includes('CONJUNTO') || name.includes('COZINHA COMPACTA')) && 
                       (numPieces ? (name.includes(numPieces) || name.includes(`${numPieces} PECAS`)) : true);
            });
        } else {
            // Módulos individuais
            if (fileName.includes('BALCAO') && fileName.includes('PIA')) {
                targetProduct = dbProducts.find(p => p.name.toUpperCase().includes('BALCAO') && p.name.toUpperCase().includes('PIA'));
            } else if (fileName.includes('AEREO') && fileName.includes('80')) {
                targetProduct = dbProducts.find(p => p.name.toUpperCase().includes('AEREO') && p.name.toUpperCase().includes('80'));
            } else if (fileName.includes('AEREO') && fileName.includes('PIA')) {
                targetProduct = dbProducts.find(p => p.name.toUpperCase().includes('AEREO') && p.name.toUpperCase().includes('1,20'));
            } else if (fileName.includes('PANELEIRO')) {
                targetProduct = dbProducts.find(p => p.name.toUpperCase().includes('PANELEIRO'));
            } else if (fileName.includes('TORRE')) {
                targetProduct = dbProducts.find(p => p.name.toUpperCase().includes('TORRE'));
            }
        }

        if (targetProduct) {
            console.log(`✅ Match: ${targetProduct.name} - Cor: ${colorMatch}`);
            
            // Renomear produto se for combo para seguir o padrão Magalu/Mercado Livre
            let newTitle = targetProduct.name;
            if (componentsInCombo.length > 0) {
                newTitle = `Conjunto Florença 100% MDF (${componentsInCombo.join(' + ')})`;
                if (colorMatch) newTitle += ` - ${colorMatch}`;
            }

            try {
                const storagePath = `products/${targetProduct.id}/${file}`;
                const publicUrl = await uploadFile(filePath, storagePath);
                
                let images = targetProduct.images || [];
                if (!images.find(img => img.url === publicUrl)) {
                    images.push({ url: publicUrl, color: colorMatch, original_file: file });
                }

                let mainUrl = targetProduct.main_image_url;
                if (!mainUrl || fileName.includes('CENA')) mainUrl = publicUrl;

                // Atualizar o objeto local para o próximo loop (se o mesmo produto tiver várias fotos)
                targetProduct.name = newTitle;
                targetProduct.images = images;
                targetProduct.main_image_url = mainUrl;
                productsToUpdate.set(targetProduct.id, targetProduct);

            } catch (err) {
                console.error(`❌ Erro em ${file}:`, err.message);
            }
        }
    }

    // Persistir uma vez por produto, mantendo os metadados acumulados na ordem dos arquivos.
    for (const [productId, targetProduct] of productsToUpdate) {
        try {
            const { error: updateError } = await supabase.from('products').update({
                name: targetProduct.name,
                images: targetProduct.images || [],
                main_image_url: targetProduct.main_image_url,
                description: targetProduct.description || `Linha Florença 100% MDF da Móveis Morante. Design moderno e durabilidade para sua cozinha.`,
                updated_at: new Date().toISOString()
            }).eq('id', productId);

            if (updateError) {
                console.error(`❌ Erro ao atualizar ${targetProduct.name}:`, updateError.message);
            }
        } catch (err) {
            console.error(`❌ Erro ao atualizar ${targetProduct.name}:`, err.message);
        }
    }
    
    console.log("\n✨ Sincronização Linha Florença (Padrão Marketplace) Finalizada!");
}

syncFlorenca();
