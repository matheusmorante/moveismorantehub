export type InboundProductDecision = 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT_GROUP' | 'NEW_PRODUCT' | 'UNSURE';

export type InboundProductClassification = {
  decision: InboundProductDecision;
  normalizedParentName: string;
  extractedAttributes: { color: string | null; measure: string | null; doors: string | null; material: string | null; feet: string | null; mirror: string | null };
  supplierCode: string | null;
  detectedSupplierCodeFamily: string | null;
  matchedProductId: string | null;
  matchedVariationId: string | null;
  confidence: number;
  reasons: string[];
  source: 'confirmed_mapping' | 'deterministic' | 'gemini' | 'manual';
};

export const INBOUND_PRODUCT_CONFIDENCE = {
  preselect: 0.9,
  suggest: 0.7,
} as const;

export function validateInboundProductClassification(value: unknown): InboundProductClassification {
  const raw = value as any;
  const decisions: InboundProductDecision[] = ['EXISTING_VARIATION', 'NEW_VARIATION_OF_EXISTING_PRODUCT', 'NEW_PRODUCT_GROUP', 'NEW_PRODUCT', 'UNSURE'];
  if (!raw || typeof raw !== 'object' || !decisions.includes(raw.decision)) throw new Error('Classificação de produto inválida.');
  const attributes = raw.extractedAttributes || {};
  const nullable = (field: unknown) => field === null || field === undefined || String(field).trim() === '' ? null : String(field).trim();
  const confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Confiança da classificação inválida.');
  return {
    decision: raw.decision,
    normalizedParentName: String(raw.normalizedParentName || '').trim(),
    extractedAttributes: { color: nullable(attributes.color), measure: nullable(attributes.measure), doors: nullable(attributes.doors), material: nullable(attributes.material), feet: nullable(attributes.feet), mirror: nullable(attributes.mirror) },
    supplierCode: nullable(raw.supplierCode), detectedSupplierCodeFamily: nullable(raw.detectedSupplierCodeFamily),
    matchedProductId: nullable(raw.matchedProductId), matchedVariationId: nullable(raw.matchedVariationId),
    confidence, reasons: Array.isArray(raw.reasons) ? raw.reasons.map(String).filter(Boolean).slice(0, 8) : [],
    source: raw.source === 'confirmed_mapping' || raw.source === 'deterministic' || raw.source === 'manual' ? raw.source : 'gemini',
  };
}

export function requiresManualProductConfirmation(classification: InboundProductClassification): boolean {
  return classification.decision === 'UNSURE' || classification.confidence < INBOUND_PRODUCT_CONFIDENCE.suggest;
}
