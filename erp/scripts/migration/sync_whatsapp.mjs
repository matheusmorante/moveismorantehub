import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SETTINGS_ID = 'app';
const SUPABASE_SETTINGS_TABLE = 'settings';
const GRAPH_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';

const whatsappConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1066355739889368',
    wabaId: process.env.WHATSAPP_WABA_ID || '3798949667074041',
    catalogId: process.env.WHATSAPP_CATALOG_ID || '2724095204403240',
};

async function main() {
    console.log("=== INICIANDO SINCRONIZAÇÃO AUTOMÁTICA WHATSAPP ===");
    
    // 1. Atualizar Configurações no Supabase
    console.log("1. Atualizando chaves de API no banco de dados...");
    const { data: currentSettingsRes } = await supabase.from(SUPABASE_SETTINGS_TABLE).select('data').eq('id', SETTINGS_ID).single();
    let settingsData = currentSettingsRes?.data || {};
    settingsData.whatsappConfig = whatsappConfig;
    
    const { error: saveError } = await supabase.from(SUPABASE_SETTINGS_TABLE).upsert({ id: SETTINGS_ID, data: settingsData });
    if (saveError) {
        console.error("Erro ao salvar configurações:", saveError);
        return;
    }
    console.log("✅ Chaves de API salvas com sucesso!");

    // 2. Fetch Catalog Products
    console.log("2. Buscando produtos do Catálogo do WhatsApp...");
    const catalogUrl = `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.catalogId}/products?fields=id,retailer_id,name,description,price,currency,image_url,url,visibility,is_hidden`;
    const response = await fetch(catalogUrl, {
        headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    if (data.error) {
        console.error("Erro na API da Meta:", data.error.message);
        return;
    }

    const allProducts = data.data || [];
    const validProducts = allProducts.filter(p => p.visibility !== 'staging' && p.is_hidden !== true);
    
    console.log(`✅ ${validProducts.length} produtos válidos encontrados no Catálogo.`);

    // 3. Sincronizar com ERP
    console.log("3. Iniciando sincronização com ERP...");
    let successCount = 0;
    
    for (const wp of validProducts) {
        console.log(`   Sincronizando: ${wp.name}...`);
        try {
            let existingProduct = null;

            if (wp.retailer_id) {
                const { data } = await supabase.from('products').select('*').eq('code', wp.retailer_id).eq('deleted', false).limit(1);
                if (data && data.length > 0) existingProduct = data[0];
            }

            if (!existingProduct && wp.name) {
                let { data } = await supabase.from('products').select('*').ilike('description', `%${wp.name}%`).eq('deleted', false).limit(1);
                if (data && data.length > 0) existingProduct = data[0];
                else {
                    const words = wp.name.split(' ').filter(w => w.length > 2);
                    if (words.length >= 2) {
                        const partialPattern = `%${words[0]}%${words[1]}%`;
                        const { data: partialData } = await supabase.from('products').select('*').ilike('description', partialPattern).eq('deleted', false).limit(1);
                        if (partialData && partialData.length > 0) existingProduct = partialData[0];
                    }
                }
            }

            if (existingProduct) {
                let currentImages = existingProduct.images || [];
                if (wp.image_url && !currentImages.includes(wp.image_url)) {
                    currentImages = [wp.image_url, ...currentImages];
                }
                
                await supabase.from('products').update({
                    images: currentImages,
                    whatsapp_description: wp.description || existingProduct.whatsapp_description,
                    updated_at: new Date().toISOString()
                }).eq('id', existingProduct.id);
                successCount++;
            } else {
                const newProduct = {
                    description: wp.name,
                    unit_price: Number(wp.price.replace(/[^0-9.-]+/g, "")),
                    images: wp.image_url ? [wp.image_url] : [],
                    whatsapp_description: wp.description,
                    is_draft: true,
                    active: true,
                    item_type: 'product',
                    brand: 'Móveis Morante',
                    condition: 'novo',
                    code: wp.retailer_id,
                    updated_at: new Date().toISOString()
                };
                await supabase.from('products').insert([newProduct]);
                successCount++;
            }
        } catch (e) {
            console.error(`   ❌ Falha ao sincronizar ${wp.name}:`, e.message);
        }
    }

    console.log(`\n=== SINCRONIZAÇÃO CONCLUÍDA! ===`);
    console.log(`✨ ${successCount} produtos importados/atualizados com sucesso!`);
}

main();
