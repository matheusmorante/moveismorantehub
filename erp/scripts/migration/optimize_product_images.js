import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import pLimit from 'p-limit'; // Para controlar a concorrência

dotenv.config({ path: '.env' }); // Lê do diretório atual (erp root)
// fallback to env.local if needed
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Obtém a API do catálogo ou usa padrão local
const getCatalogApiUrl = () => {
    if (process.env.VITE_CATALOG_API_URL) {
        return process.env.VITE_CATALOG_API_URL.replace(/\/$/, "");
    }
    return "https://www.moveismorante.com.br";
};

// Faz o upload de um buffer de arquivo para o R2 via catálogo API
const uploadBufferToR2 = async (buffer, path, contentType) => {
    const catalogApiUrl = getCatalogApiUrl();
    const credentialResponse = await fetch(`${catalogApiUrl}/api/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: path.replace(/^\/+/, ""), contentType }),
    });

    if (!credentialResponse.ok) {
        const details = await credentialResponse.json().catch(() => ({}));
        throw new Error(details.error || "Não foi possível preparar o envio da imagem para o R2.");
    }

    const { uploadUrl, fileUrl } = await credentialResponse.json();
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: buffer,
    });

    if (!uploadResponse.ok) throw new Error(`Falha ao enviar a imagem ${path} para o R2.`);
    return fileUrl;
};

// Verifica se a URL existe via HEAD request
const checkFileExists = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
};

const processImage = async (originalUrl) => {
    if (!originalUrl || !originalUrl.startsWith('http')) return { status: 'skipped', url: originalUrl, reason: 'Invalid URL' };

    // Determinar nomes derivados
    const lastDotIndex = originalUrl.lastIndexOf('.');
    if (lastDotIndex === -1) return { status: 'skipped', url: originalUrl, reason: 'No extension' };
    
    const baseUrl = originalUrl.substring(0, lastDotIndex);
    const thumbUrl = `${baseUrl}_thumb.webp`;
    const mediumUrl = `${baseUrl}_medium.webp`;

    // Verifica idempotência
    const thumbExists = await checkFileExists(thumbUrl);
    const mediumExists = await checkFileExists(mediumUrl);

    if (thumbExists && mediumExists) {
        return { status: 'skipped', url: originalUrl, reason: 'Already optimized' };
    }

    // Baixa o original
    console.log(`Downloading original: ${originalUrl}`);
    const imgResponse = await fetch(originalUrl);
    if (!imgResponse.ok) return { status: 'failed', url: originalUrl, reason: `Original return ${imgResponse.status}` };
    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extrair o path do R2 (ex: "products/foo")
    try {
        const urlObj = new URL(originalUrl);
        // O path no R2 é o pathname sem a primeira barra
        const relativePath = urlObj.pathname.replace(/^\/+/, '');
        
        if (!relativePath) return { status: 'failed', url: originalUrl, reason: 'Empty path' };
        
        const lastDotIndex = relativePath.lastIndexOf('.');
        const relativeBase = lastDotIndex !== -1 ? relativePath.substring(0, lastDotIndex) : relativePath;

        // Processar Thumb
        if (!thumbExists) {
            console.log(`Generating thumb for: ${originalUrl}`);
            const thumbBuffer = await sharp(buffer)
                .resize({ width: 200, withoutEnlargement: true })
                .webp({ quality: 75 })
                .toBuffer();
            await uploadBufferToR2(thumbBuffer, `${relativeBase}_thumb.webp`, 'image/webp');
        }

        // Processar Medium
        if (!mediumExists) {
            console.log(`Generating medium for: ${originalUrl}`);
            const mediumBuffer = await sharp(buffer)
                .resize({ width: 1000, withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            await uploadBufferToR2(mediumBuffer, `${relativeBase}_medium.webp`, 'image/webp');
        }

        return { status: 'success', url: originalUrl };
    } catch (e) {
        return { status: 'error', url: originalUrl, reason: e.message };
    }
};

const runMigration = async () => {
    console.log('--- Iniciando Migração de Otimização de Imagens ---');
    
    const { data: records, error } = await supabase.from('product_images').select('image_url');
    if (error) {
        console.error("Erro ao buscar URLs", error);
        process.exit(1);
    }

    let uniqueUrls = [...new Set(records.map(r => r.image_url))].filter(Boolean);
    
    // Suporte a lote piloto
    if (process.argv.includes('--pilot')) {
        console.log('Modo PILOTO ativado. Limitando a 10 imagens para testes.');
        uniqueUrls = uniqueUrls.slice(0, 10);
    }
    
    console.log(`Total de URLs únicas a processar: ${uniqueUrls.length}`);

    // Limitar concorrência para não estourar memória do node nem limites do R2
    const limit = pLimit(5);
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const tasks = uniqueUrls.map((url, i) => limit(async () => {
        const result = await processImage(url);
        if (result.status === 'success') successCount++;
        else if (result.status === 'skipped') skippedCount++;
        else {
            failedCount++;
            console.error(`Falha: ${result.url} - ${result.reason}`);
        }
        
        if ((i + 1) % 10 === 0) {
            console.log(`Progresso: ${i + 1}/${uniqueUrls.length} (Sucesso: ${successCount}, Ignorados: ${skippedCount}, Falhas: ${failedCount})`);
        }
    }));

    await Promise.all(tasks);

    console.log('--- Migração Concluída ---');
    console.log(`Total: ${uniqueUrls.length} | Sucesso: ${successCount} | Ignorados: ${skippedCount} | Falhas: ${failedCount}`);
};

runMigration().catch(console.error);
