/**
 * Helper para extrair lista de imagens a partir de fontes diversas do Supabase
 */
export const extractProductImages = (data: any): string[] => {
    let productImages: string[] = [];
    if (Array.isArray(data.product_images) && data.product_images.length > 0) {
        const sortedImages = [...data.product_images].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
        productImages = sortedImages.map((img: any) => img.image_url ? String(img.image_url).trim() : '').filter(Boolean);
    }

    if (productImages.length === 0) {
        if (Array.isArray(data.images)) {
            productImages = data.images.map((img: any) => typeof img === 'string' ? img.trim() : String(img)).filter(Boolean);
        } else if (typeof data.images === 'string' && data.images.trim()) {
            const trimmed = data.images.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        productImages = parsed.map((img: any) => String(img).trim()).filter(Boolean);
                    }
                } catch (e) {
                    productImages = [trimmed];
                }
            } else if (trimmed.includes(',')) {
                productImages = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else {
                productImages = [trimmed];
            }
        }
    }

    return productImages;
};

/**
 * Helper para extrair dimensões (largura, altura, profundidade) a partir de colunas e texto de medidas
 */
export const extractProductDimensions = (data: any): { width?: number; height?: number; depth?: number } => {
    let parsedWidth = data.width !== null && data.width !== undefined && String(data.width).trim() !== '' ? parseFloat(String(data.width).replace(',', '.')) : undefined;
    let parsedHeight = data.height !== null && data.height !== undefined && String(data.height).trim() !== '' ? parseFloat(String(data.height).replace(',', '.')) : undefined;
    let parsedDepth = data.depth !== null && data.depth !== undefined && String(data.depth).trim() !== '' ? parseFloat(String(data.depth).replace(',', '.')) : undefined;

    const measuresText = data.measures || '';
    if (measuresText) {
        const wMatch = measuresText.match(/larg(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*larg/i);
        if (wMatch) {
            const val = parseFloat(wMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedWidth = val;
        }

        const hMatch = measuresText.match(/alt(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*alt/i);
        if (hMatch) {
            const val = parseFloat(hMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedHeight = val;
        }

        const dMatch = measuresText.match(/prof(?:undidade)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*prof/i);
        if (dMatch) {
            const val = parseFloat(dMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedDepth = val;
        }
    }

    return {
        width: parsedWidth,
        height: parsedHeight,
        depth: parsedDepth,
    };
};
