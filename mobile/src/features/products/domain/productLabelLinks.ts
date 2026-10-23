export function buildProductPriceLabelUrl(webUrl: string, productId: string): string {
  const params = new URLSearchParams({
    cat: 'precos',
    productId,
    autoAddProduct: 'true',
  });

  return `${webUrl}/estoque/etiquetas?${params.toString()}`;
}
