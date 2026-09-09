import { supabase } from '../supabaseConfig';

export const PRODUCT_RESOLUTION_DECISIONS = ['accepted', 'rejected', 'corrected'] as const;
export const PRODUCT_RESOLUTION_RELATIONS = ['existing_variation', 'new_variation', 'same_nf_product_family', 'new_product', 'different_parent_products'] as const;

export type ProductResolutionDecision = typeof PRODUCT_RESOLUTION_DECISIONS[number];
export type ProductResolutionRelation = typeof PRODUCT_RESOLUTION_RELATIONS[number];

export type ProductResolutionFeedbackInput = {
    supplierId: string;
    nfItemDescription: string;
    supplierProductCode?: string;
    supplierCodeFamily?: string | null;
    normalizedParentName?: string;
    detectedAttributes?: Record<string, string | undefined>;
    unitCost?: number;
    aiSuggestion?: Record<string, unknown>;
    userDecision: ProductResolutionDecision;
    finalProductId?: string;
    finalVariationId?: string;
    relationType: ProductResolutionRelation;
};

export type ProductResolutionExample = Pick<ProductResolutionFeedbackInput,
    'supplierProductCode' | 'supplierCodeFamily' | 'nfItemDescription' | 'normalizedParentName' |
    'detectedAttributes' | 'userDecision' | 'finalProductId' | 'finalVariationId' | 'relationType'>;

export const MAX_PRODUCT_RESOLUTION_EXAMPLES = 10;

const clean = (value?: string | null) => value?.trim() || undefined;
const normalizeCode = (value?: string | null) => clean(value)?.toLocaleUpperCase('pt-BR');

export function validateProductResolutionFeedback(input: ProductResolutionFeedbackInput): void {
    if (!clean(input.supplierId) || !clean(input.nfItemDescription)) throw new Error('Fornecedor e descrição do item são obrigatórios para registrar a decisão.');
    if (!PRODUCT_RESOLUTION_DECISIONS.includes(input.userDecision)) throw new Error('Decisão de resolução inválida.');
    if (!PRODUCT_RESOLUTION_RELATIONS.includes(input.relationType)) throw new Error('Tipo de relação inválido.');
    if (input.userDecision !== 'rejected' && !clean(input.finalProductId)) throw new Error('Uma decisão confirmada ou corrigida precisa indicar o produto final.');
}

export async function recordProductResolutionFeedback(input: ProductResolutionFeedbackInput): Promise<void> {
    validateProductResolutionFeedback(input);
    const { error } = await supabase.from('product_resolution_feedback').insert({
        supplier_id: clean(input.supplierId),
        supplier_product_code: normalizeCode(input.supplierProductCode) || null,
        supplier_code_family: clean(input.supplierCodeFamily) || null,
        nf_item_description: clean(input.nfItemDescription),
        normalized_parent_name: clean(input.normalizedParentName) || null,
        detected_attributes: input.detectedAttributes || {},
        unit_cost: Number.isFinite(input.unitCost) ? input.unitCost : null,
        ai_suggestion: input.aiSuggestion || {},
        user_decision: input.userDecision,
        final_product_id: clean(input.finalProductId) || null,
        final_variation_id: clean(input.finalVariationId) || null,
        relation_type: input.relationType,
    });
    if (error) throw error;
}

const asExample = (row: any): ProductResolutionExample => ({
    supplierProductCode: row.supplier_product_code || undefined,
    supplierCodeFamily: row.supplier_code_family || undefined,
    nfItemDescription: row.nf_item_description,
    normalizedParentName: row.normalized_parent_name || undefined,
    detectedAttributes: row.detected_attributes || {},
    userDecision: row.user_decision,
    finalProductId: row.final_product_id || undefined,
    finalVariationId: row.final_variation_id || undefined,
    relationType: row.relation_type,
});

// Recuperação determinística: código exato, família já identificada ou nome-pai
// normalizado. A semelhança semântica continua sendo responsabilidade do Gemini.
export async function findProductResolutionExamples(input: {
    supplierId: string;
    supplierProductCode?: string;
    supplierCodeFamily?: string | null;
    normalizedParentName?: string;
}): Promise<ProductResolutionExample[]> {
    if (!clean(input.supplierId)) return [];
    const { data, error } = await supabase
        .from('product_resolution_feedback')
        .select('supplier_product_code, supplier_code_family, nf_item_description, normalized_parent_name, detected_attributes, user_decision, final_product_id, final_variation_id, relation_type, created_at')
        .eq('supplier_id', input.supplierId)
        .order('created_at', { ascending: false })
        .limit(80);
    if (error) throw error;

    const code = normalizeCode(input.supplierProductCode);
    const family = clean(input.supplierCodeFamily);
    const parent = clean(input.normalizedParentName)?.toLocaleUpperCase('pt-BR');
    const relevant = (data || []).filter((row: any) =>
        (code && normalizeCode(row.supplier_product_code) === code) ||
        (family && row.supplier_code_family === family) ||
        (parent && String(row.normalized_parent_name || '').toLocaleUpperCase('pt-BR') === parent),
    );
    return relevant.slice(0, MAX_PRODUCT_RESOLUTION_EXAMPLES).map(asExample);
}

export function shouldActivateSupplierPattern(confirmationCount: number, contradictionCount: number): boolean {
    return confirmationCount >= 3 && contradictionCount === 0;
}
