/**
 * barcodeScannerUtils - Utilitários para extração e correspondência de códigos lidos por scanners e QR Codes no Mobile.
 */

export interface ScannableItem {
    id?: string;
    key?: string;
    productId?: string;
    variationId?: string;
    sku?: string;
    code?: string;
    barcode?: string;
    supplierRef?: string;
    name?: string;
}

export interface LabelIdentity {
    labelId?: string;
    code?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extrai a identidade canônica da unidade física (labelId) e o código/SKU da leitura bruta.
 */
export function extractLabelIdentity(rawCode: string): LabelIdentity {
    if (!rawCode) return {};
    const trimmed = rawCode.trim();
    if (!trimmed) return {};

    // 1. Formato explícito MH:L:<uuid> ou MH:L:<uuid>|<sku>
    if (trimmed.startsWith('MH:L:')) {
        const withoutPrefix = trimmed.substring(5).trim();
        if (withoutPrefix.includes('|')) {
            const parts = withoutPrefix.split('|').map(p => p.trim()).filter(Boolean);
            const uuidPart = parts.find(p => UUID_REGEX.test(p));
            const codePart = parts.find(p => !UUID_REGEX.test(p) && p !== '000XXX');
            return { labelId: uuidPart, code: codePart };
        }
        if (UUID_REGEX.test(withoutPrefix)) {
            return { labelId: withoutPrefix };
        }
        if (withoutPrefix !== '000XXX') {
            return { code: withoutPrefix };
        }
        return {};
    }

    // 2. Formato com pipe: SKU|UUID ou BARCODE|UUID
    if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean);
        const uuidPart = parts.find(p => UUID_REGEX.test(p) || (p.startsWith('MH:L:') && UUID_REGEX.test(p.substring(5).trim())));
        const cleanUuid = uuidPart ? (uuidPart.startsWith('MH:L:') ? uuidPart.substring(5).trim() : uuidPart) : undefined;
        const codePart = parts.find(p => !UUID_REGEX.test(p) && !p.startsWith('MH:L:') && p !== '000XXX');
        if (cleanUuid) {
            return { labelId: cleanUuid, code: codePart };
        }
        return { code: codePart || (parts[0] !== '000XXX' ? parts[0] : parts[1]) };
    }

    // 3. UUID direto
    if (UUID_REGEX.test(trimmed)) {
        return { labelId: trimmed };
    }

    // 4. Código simples (sem identidade de etiqueta individual)
    return { code: trimmed };
}

/**
 * Extrai todos os códigos candidatos a partir de uma leitura bruta de scanner ou QR code.
 */
export function extractScannedCodes(rawCode: string): string[] {
    if (!rawCode) return [];
    const trimmed = rawCode.trim();
    if (!trimmed) return [];

    const candidates = new Set<string>();
    if (trimmed !== '000XXX') {
        candidates.add(trimmed);
    }

    // Se tiver prefixo MH:L:
    if (trimmed.startsWith('MH:L:')) {
        const clean = trimmed.substring(5).trim();
        if (clean !== '000XXX') {
            candidates.add(clean);
        }
    }

    // 1. Tentar parsear JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === 'object' && parsed !== null) {
                const keys = ['sku', 'code', 'barcode', 'productId', 'variationId', 'scanId', 'id', 'product_id', 'variation_id', 'labelId', 'label_id'];
                for (const k of keys) {
                    if (parsed[k] && String(parsed[k]).trim() !== '000XXX') {
                        candidates.add(String(parsed[k]).trim());
                    }
                }
            }
        } catch {
            // Ignora se não for JSON válido
        }
    }

    // 2. Se contiver pipes "|", divide
    if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
            if (part !== '000XXX') {
                candidates.add(part);
            }
            if (part.startsWith('MH:L:')) {
                const sub = part.substring(5).trim();
                if (sub !== '000XXX') {
                    candidates.add(sub);
                }
            }
        }
    }

    // 3. Se for URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            const searchParams = url.searchParams;
            ['sku', 'code', 'barcode', 'id', 'productId', 'variationId'].forEach((param) => {
                const val = searchParams.get(param);
                if (val) candidates.add(val.trim());
            });
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                candidates.add(pathParts[pathParts.length - 1].trim());
            }
        } catch {
            // Ignora se URL for malformada
        }
    }

    return Array.from(candidates).filter(Boolean);
}

/**
 * Verifica se um item corresponde ao código lido pelo scanner.
 */
export function matchScannedProductItem<T extends ScannableItem>(
    item: T,
    rawCode: string,
    allProducts?: any[]
): boolean {
    const candidates = extractScannedCodes(rawCode);
    if (candidates.length === 0) return false;

    const norm = (val?: string | null) => (val ? String(val).trim().toLowerCase() : '');

    const itemTargetFields = [
        norm(item.sku),
        norm(item.code),
        norm(item.barcode),
        norm(item.supplierRef),
        norm(item.variationId),
        norm(item.productId),
        norm(item.key),
        norm(item.id),
    ].filter(Boolean);

    for (const cand of candidates) {
        const normCand = norm(cand);
        if (!normCand) continue;

        // 1. Match direto em qualquer um dos campos do item
        if (itemTargetFields.includes(normCand)) {
            return true;
        }

        // 2. Se temos o catálogo de produtos completo, cruzar para identificar o produto/variação
        if (allProducts && allProducts.length > 0) {
            for (const prod of allProducts) {
                const prodId = norm(prod.id);
                const prodCode = norm(prod.code);
                const prodBarcode = norm(prod.barcode);
                const prodSku = norm(prod.sku);

                const itemProductId = norm(item.productId);
                const itemVariationId = norm(item.variationId);

                // Se o candidato bate com uma variação
                if (prod.variations && Array.isArray(prod.variations)) {
                    for (const v of prod.variations) {
                        const vId = norm(v.id);
                        const vSku = norm(v.sku);
                        const vBarcode = norm(v.barcode);
                        const vCode = norm(v.code);

                        if ([vId, vSku, vBarcode, vCode].includes(normCand)) {
                            if (itemVariationId && itemVariationId === vId) return true;
                            if (itemProductId && itemProductId === prodId && (!itemVariationId || itemVariationId === vId)) return true;
                        }
                    }
                }

                // Se o candidato bate com o produto pai
                if ([prodId, prodCode, prodBarcode, prodSku].includes(normCand)) {
                    if (itemProductId && itemProductId === prodId) {
                        return true;
                    }
                }
            }
        }

        // 3. Fallback: match por inclusão no nome caso o candidato seja um nome de no mínimo 3 caracteres
        if (item.name && norm(item.name).includes(normCand) && normCand.length >= 3) {
            return true;
        }
    }

    return false;
}
