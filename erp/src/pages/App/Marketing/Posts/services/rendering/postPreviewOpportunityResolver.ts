// Mapeamento resiliente da oportunidade do produto para garantir o selo oficial no preview.
export function resolvePreviewOpportunity(product: any, opportunities: any[]) {
  if (!product) return null;

  const opportunityId =
    product.opportunity_id ||
    product.opportunityId ||
    (typeof product.opportunity === 'object' ? product.opportunity?.id : null);
  if (opportunityId) return opportunities.find((item) => item.id === opportunityId) || null;

  const opportunityName =
    product.opportunityName ||
    (typeof product.opportunity === 'object' ? product.opportunity?.name : null) ||
    (typeof product.opportunity === 'string' ? product.opportunity : '');
  if (!opportunityName) return null;

  return (
    opportunities.find(
      (item) =>
        item.name?.toLowerCase() === opportunityName.toLowerCase() ||
        item.slug === opportunityName
    ) || null
  );
}
