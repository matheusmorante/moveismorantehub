export type VariationAttribute = { name?: string; value?: string };
export type ExistingVariation = { id: string; attributes?: VariationAttribute[] | Record<string, string> };

/** Normalização técnica para valores já interpretados pela IA; não interpreta linguagem. */
export function normalizeInboundAttributeValue(value: string): string {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
}

function normalizeAttributeName(name: string): string {
  const normalized = normalizeInboundAttributeValue(name);
  return ({ COLOR: 'COR', MEASURE: 'MEDIDA', DOORS: 'PORTAS', MATERIAL: 'MATERIAL', FEET: 'PES', MIRROR: 'ESPELHO' } as Record<string, string>)[normalized] || normalized;
}

export function findEquivalentAttributeValue(values: string[], detectedValue: string): string | undefined {
  const normalized = normalizeInboundAttributeValue(detectedValue);
  return values.find((value) => normalizeInboundAttributeValue(value) === normalized);
}

export function findEquivalentVariation(variations: ExistingVariation[], attributes: Record<string, string | null | undefined>): ExistingVariation | undefined {
  const expected = Object.entries(attributes)
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([name, value]) => [normalizeAttributeName(name), normalizeInboundAttributeValue(String(value))] as const);
  if (!expected.length) return undefined;

  return variations.find((variation) => {
    const source = Array.isArray(variation.attributes)
      ? Object.fromEntries(variation.attributes.filter((attribute) => attribute.name && attribute.value).map((attribute) => [attribute.name!, attribute.value!]))
      : variation.attributes || {};
    return expected.every(([name, value]) => Object.entries(source).some(([candidateName, candidateValue]) => normalizeAttributeName(candidateName) === name && normalizeInboundAttributeValue(candidateValue) === value));
  });
}

export function resolveInboundVariationAction(variations: ExistingVariation[], attributes: Record<string, string | null | undefined>): 'LINK_EXISTING_VARIATION' | 'CREATE_NEW_VARIATION' | 'REQUIRE_ATTRIBUTE_CONFIRMATION' {
  if (!attributes.color?.trim()) return 'REQUIRE_ATTRIBUTE_CONFIRMATION';
  return findEquivalentVariation(variations, attributes) ? 'LINK_EXISTING_VARIATION' : 'CREATE_NEW_VARIATION';
}
