export function buildProductIdentificationLabelUrl(
  webUrl: string,
  productId: string,
  variationId?: string | null
): string {
  const params = new URLSearchParams({
    cat: 'identificacao',
    productId,
    ...(variationId ? { variationId } : {}),
    fillSheet: '1',
    autoAddProduct: 'true',
  });

  return `${webUrl}/estoque/etiquetas?${params.toString()}`;
}
