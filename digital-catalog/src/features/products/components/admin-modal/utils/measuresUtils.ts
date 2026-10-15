export function parseLegacyMeasures(measures: string | null) {
  if (!measures) return { width: '', depth: '', height: '' };
  const labelled = {
    width: measures.match(/largura:\s*([^|]+)/i)?.[1]?.trim() || '',
    depth: measures.match(/profundidade:\s*([^|]+)/i)?.[1]?.trim() || '',
    height: measures.match(/altura:\s*([^|]+)/i)?.[1]?.trim() || '',
  };
  if (labelled.width || labelled.depth || labelled.height) return labelled;
  const values = measures.split(/\s*x\s*/i);
  return { width: values[0] || '', depth: values[1] || '', height: values[2] || '' };
}

export function formatMeasures(product: {
  width?: string;
  depth?: string;
  height?: string;
  depth_use_length?: boolean;
}) {
  const values = [
    product.width && `Largura: ${product.width}`,
    product.depth &&
      `${product.depth_use_length ? 'Comprimento' : 'Profundidade'}: ${product.depth}`,
    product.height && `Altura: ${product.height}`,
  ].filter(Boolean);
  return values.join(' | ');
}
