import {
    ProductPendency,
    ReconciliationProductItem,
    ReconciliationVariationItem,
    RequiredCategoryAttribute,
    ReconciliationSummary
} from '../types/reconciliation.types';

/**
 * Detecta pendências em um produto e em suas variações.
 *
 * Princípio da Menor Alteração & DRY:
 * - Não duplica regras de cadastro; respeita os requisitos de ERP Legibility.
 * - Identifica oportunidades de herança ("Corrigir aqui resolverá X variações").
 */
export function detectProductPendencies(
    product: Omit<ReconciliationProductItem, 'pendencies' | 'hasParentPendencies' | 'hasVariationPendencies'>,
    requiredCategoryAttributes: RequiredCategoryAttribute[] = []
): {
    pendencies: ProductPendency[];
    variationsWithPendencies: ReconciliationVariationItem[];
    hasParentPendencies: boolean;
    hasVariationPendencies: boolean;
} {
    const parentPendencies: ProductPendency[] = [];
    const variationsWithPendencies: ReconciliationVariationItem[] = [];

    // 1. Fornecedores (Pai)
    const hasSupplier = Boolean(
        product.mainSupplierId?.trim() ||
        product.supplierId?.trim() ||
        (Array.isArray(product.supplierIds) && product.supplierIds.length > 0)
    );
    if (!hasSupplier) {
        parentPendencies.push({
            id: `${product.id}-supplier`,
            type: 'supplier',
            level: 'parent',
            field: 'mainSupplierId',
            label: 'Fornecedores',
            isCritical: true,
            currentValue: null
        });
    }

    // 2. Categoria (Pai)
    const hasCategory = Boolean(
        product.category?.trim() ||
        product.categoryId?.trim() ||
        (Array.isArray(product.categoryIds) && product.categoryIds.length > 0)
    );
    if (!hasCategory) {
        parentPendencies.push({
            id: `${product.id}-category`,
            type: 'category',
            level: 'parent',
            field: 'categoryId',
            label: 'Categoria',
            isCritical: true,
            currentValue: null
        });
    }

    // 3. NCM (Pai)
    const ncm = product.fiscal?.ncm?.trim() || '';
    const hasValidNcm = Boolean(ncm && ncm.length >= 4);
    if (!hasValidNcm) {
        parentPendencies.push({
            id: `${product.id}-ncm`,
            type: 'ncm',
            level: 'parent',
            field: 'fiscal.ncm',
            label: 'NCM (Fiscal)',
            isCritical: true,
            currentValue: ncm
        });
    }

    // 4. Nome Interno (Pai)
    const name = product.name?.trim() || '';
    if (!name || name.length < 2) {
        parentPendencies.push({
            id: `${product.id}-name`,
            type: 'name',
            level: 'parent',
            field: 'name',
            label: 'Nome do Produto',
            isCritical: true,
            currentValue: name
        });
    }

    // Identificar atributos obrigatórios das categorias associadas
    const currentCategoryIds = new Set<string>();
    if (product.categoryId) currentCategoryIds.add(product.categoryId);
    if (Array.isArray(product.categoryIds)) {
        product.categoryIds.forEach(id => currentCategoryIds.add(id));
    }

    const applicableRequiredAttributes = requiredCategoryAttributes.filter(
        req => req.isRequired && currentCategoryIds.has(req.categoryId) && req.attribute
    );

    // 5. Preço de Venda Base & Variações
    const parentPrice = Number(product.price || 0);
    const hasParentPrice = parentPrice > 0;
    const variations = product.variations || [];
    const hasVariations = variations.length > 0;

    const anyVariationHasPrice = variations.some(v => Number(v.price || 0) > 0);

    // Se nem o pai nem nenhuma variação tem preço, isso é uma pendência crítica de preço
    if (!hasParentPrice && !anyVariationHasPrice) {
        const resolvesCount = hasVariations ? variations.length : 0;
        parentPendencies.push({
            id: `${product.id}-price`,
            type: 'price',
            level: 'parent',
            field: 'price',
            label: 'Preço de Venda',
            isCritical: true,
            currentValue: parentPrice,
            resolvesVariationsCount: resolvesCount > 0 ? resolvesCount : undefined
        });
    }

    // Verificar se atributos de categoria obrigatórios estão faltando em TODAS as variações
    // Se estiverem faltando em todas, podemos expor uma pendência no pai com o atalho "resolver todas"
    applicableRequiredAttributes.forEach(reqAttr => {
        const attrName = reqAttr.attribute!.name;
        const attrId = reqAttr.attributeId;

        if (hasVariations) {
            const missingInCount = variations.filter(v => {
                const found = (v.attributes || []).find(
                    a => a.name.toLowerCase().trim() === attrName.toLowerCase().trim()
                );
                return !found || !found.value || !found.value.trim();
            }).length;

            if (missingInCount === variations.length && variations.length > 1) {
                // Todas as variações estão sem esse atributo obrigatório!
                parentPendencies.push({
                    id: `${product.id}-shared-attr-${attrId}`,
                    type: 'category_attribute',
                    level: 'parent',
                    field: `shared_attribute_${attrId}`,
                    label: `Atributo: ${attrName}`,
                    isCritical: false,
                    resolvesVariationsCount: variations.length,
                    attributeId: attrId,
                    attributeName: attrName,
                    attributeDataType: reqAttr.attribute?.data_type || 'list',
                    attributeUnit: reqAttr.attribute?.unit
                });
            }
        }
    });

    // 6. Analisar Variações individualmente
    const allVariationPendencies: ProductPendency[] = [];

    variations.forEach(variation => {
        const vPendencies: ProductPendency[] = [];

        // Preço da variação se não sincroniza com pai e está zerado
        if (variation.useParentPrice === false && Number(variation.price || 0) <= 0) {
            vPendencies.push({
                id: `${variation.id}-price`,
                type: 'variation_price',
                level: 'variation',
                variationId: variation.id,
                variationName: variation.name,
                field: 'price',
                label: `Preço (${variation.name || variation.sku})`,
                isCritical: true,
                currentValue: variation.price
            });
        }

        // Atributos obrigatórios de categoria na variação
        applicableRequiredAttributes.forEach(reqAttr => {
            const attrName = reqAttr.attribute!.name;
            const attrId = reqAttr.attributeId;
            const existing = (variation.attributes || []).find(
                a => a.name.toLowerCase().trim() === attrName.toLowerCase().trim()
            );

            if (!existing || !existing.value || !existing.value.trim()) {
                vPendencies.push({
                    id: `${variation.id}-attr-${attrId}`,
                    type: 'category_attribute',
                    level: 'variation',
                    variationId: variation.id,
                    variationName: variation.name,
                    field: `attribute_${attrId}`,
                    label: attrName,
                    isCritical: false,
                    attributeId: attrId,
                    attributeName: attrName,
                    attributeDataType: reqAttr.attribute?.data_type || 'list',
                    attributeUnit: reqAttr.attribute?.unit,
                    currentValue: existing?.value || ''
                });
            }
        });

        // Atributos existentes na variação mas com valor vazio
        (variation.attributes || []).forEach((attr, idx) => {
            const isAlreadyReported = vPendencies.some(
                p => p.attributeName?.toLowerCase().trim() === attr.name.toLowerCase().trim()
            );
            if (!isAlreadyReported && (!attr.value || !attr.value.trim())) {
                vPendencies.push({
                    id: `${variation.id}-incomplete-${idx}`,
                    type: 'incomplete_attribute',
                    level: 'variation',
                    variationId: variation.id,
                    variationName: variation.name,
                    field: `incomplete_attribute_${idx}`,
                    label: attr.name || `Atributo #${idx + 1}`,
                    isCritical: false,
                    currentValue: ''
                });
            }
        });

        if (vPendencies.length > 0) {
            allVariationPendencies.push(...vPendencies);
            variationsWithPendencies.push({
                ...variation,
                pendencies: vPendencies
            });
        }
    });

    const totalPendencies = [...parentPendencies, ...allVariationPendencies];

    return {
        pendencies: totalPendencies,
        variationsWithPendencies,
        hasParentPendencies: parentPendencies.length > 0,
        hasVariationPendencies: allVariationPendencies.length > 0
    };
}

/**
 * Calcula os contadores do resumo no topo da tela e os números dos chips rápidos.
 */
export function calculateReconciliationSummary(
    products: ReconciliationProductItem[]
): ReconciliationSummary {
    let totalPendingProducts = 0;
    let totalPendencies = 0;
    let totalCritical = 0;

    const chipCounts = {
        all: 0,
        supplier: 0,
        category: 0,
        ncm: 0,
        attributes: 0,
        price: 0
    };

    products.forEach(p => {
        if (p.pendencies && p.pendencies.length > 0) {
            totalPendingProducts++;
            totalPendencies += p.pendencies.length;

            const seenTypesInProduct = new Set<string>();

            p.pendencies.forEach(pend => {
                if (pend.isCritical) totalCritical++;

                if (pend.type === 'supplier') {
                    chipCounts.supplier++;
                } else if (pend.type === 'category') {
                    chipCounts.category++;
                } else if (pend.type === 'ncm') {
                    chipCounts.ncm++;
                } else if (pend.type === 'category_attribute' || pend.type === 'incomplete_attribute') {
                    chipCounts.attributes++;
                } else if (pend.type === 'price' || pend.type === 'variation_price') {
                    chipCounts.price++;
                }
            });
        }
    });

    chipCounts.all = totalPendencies;

    return {
        totalPendingProducts,
        totalPendencies,
        totalCritical,
        chipCounts
    };
}
