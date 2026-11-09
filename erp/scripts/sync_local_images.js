
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
if (!OPENAI_API_KEY) throw new Error('Configure OPENAI_API_KEY no ambiente antes de executar.');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROOT_PATH = 'H:\\owner';

async function analyzeImage(imagePath, productName) {
    try {
        const imageData = fs.readFileSync(imagePath);
        const mimeType = /\.png$/i.test(imagePath) ? 'image/png' : 'image/jpeg';
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-6-luna',
                input: [{ role: 'user', content: [
                    { type: 'input_image', image_url: `data:${mimeType};base64,${imageData.toString('base64')}` },
                    { type: 'input_text', text: `Este é um produto da loja Móveis Morante. O nome provável é "${productName}". 
            Analise esta imagem e retorne apenas um JSON:
            {
                "is_good_main_photo": boolean,
                "color_detected": "string",
                "certainty": 0 to 1,
                "description": "descrição curta"
            }` },
                ] }],
                text: { format: { type: 'json_object' } },
                reasoning: { effort: 'low' },
                max_output_tokens: 500,
            }),
            signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) throw new Error(`OpenAI respondeu HTTP ${response.status}.`);
        const result = await response.json();
        const text = result.output_text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error(`Erro ao analisar ${imagePath}:`, e.message);
        return null;
    }
}

async function uploadToStorage(filePath, bucket, storagePath) {
    const fileData = fs.readFileSync(filePath);
    const contentType = /\.png$/i.test(filePath) ? 'image/png' : 'image/jpeg';
    const { data, error } = await supabase.storage.from(bucket).upload(storagePath, fileData, {
        upsert: true,
        contentType,
    });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return publicUrl;
}

async function run() {
    console.log("🚀 Iniciando Sincronização de Imagens Local -> Supabase...");
    
    // 1. Get all products
    const { data: dbProducts } = await supabase.from('products').select('id, name').eq('deleted', false);
    console.log(`📦 Encontrados ${dbProducts.length} produtos no banco.`);

    const folders = fs.readdirSync(ROOT_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => name === 'BALCAO PARA PIA GRECIA'); // TEST MODE

    for (const folderName of folders) {
        console.log(`\n📂 Processando pasta: ${folderName}`);
        
        // Match simple (ignore case)
        const product = dbProducts.find(p => p.name.toLowerCase().trim() === folderName.toLowerCase().trim());
        
        if (!product) {
            console.log(`⚠️ Produto não encontrado no banco para a pasta: ${folderName}`);
            continue;
        }

        const folderPath = path.join(ROOT_PATH, folderName);
        const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

        if (files.length === 0) continue;

        let mainImageUrl = null;
        let imagesList = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            console.log(`  📸 Analisando arquivo: ${file}`);
            
            const analysis = await analyzeImage(filePath, product.name);
            if (!analysis) continue;

            const storagePath = `products/${product.id}/${file}`;
            const publicUrl = await uploadToStorage(filePath, 'product-images', storagePath);

            imagesList.push({
                url: publicUrl,
                color: analysis.color_detected,
                is_main: analysis.is_good_main_photo
            });

            if (analysis.is_good_main_photo && !mainImageUrl) {
                mainImageUrl = publicUrl;
            }
        }

        // Se não achou nenhuma "good main", pega a primeira
        if (!mainImageUrl && imagesList.length > 0) mainImageUrl = imagesList[0].url;

        // Update DB
        const { error: updateError } = await supabase.from('products').update({
            main_image_url: mainImageUrl,
            images: imagesList,
            updated_at: new Date().toISOString()
        }).eq('id', product.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar produto ${product.name}:`, updateError);
        } else {
            console.log(`✅ Produto ${product.name} atualizado com ${imagesList.length} imagens.`);
        }
    }

    console.log("\n✨ Sincronização concluída!");
}

run();
