export function buildProductPriceLabelUrl(webUrl: string, productId: string): string {
  const params = new URLSearchParams({
    cat: 'precos',
    productId,
    autoAddProduct: 'true',
  });

  return `${webUrl}/estoque/etiquetas?${params.toString()}`;
}

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
