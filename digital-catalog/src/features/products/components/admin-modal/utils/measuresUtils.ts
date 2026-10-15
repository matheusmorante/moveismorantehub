export function parseLegacyMeasures(measures: string | null) {
  if (!measures) return { width: '', depth: '', height: '', thickness: '' };
  const labelled = {
    width: measures.match(/(?:largura|largura\s*total):\s*([^|]+)/i)?.[1]?.trim() || '',
    depth: measures.match(/(?:profundidade|profundidade\s*total|comprimento|comprimento\s*total):\s*([^|]+)/i)?.[1]?.trim() || '',
    height: measures.match(/(?:altura|altura\s*total):\s*([^|]+)/i)?.[1]?.trim() || '',
    thickness: measures.match(/(?:espessura|espessura\s*do\s*colchão):\s*([^|]+)/i)?.[1]?.trim() || '',
  };
  if (labelled.width || labelled.depth || labelled.height || labelled.thickness) return labelled;
  const values = measures.split(/\s*x\s*/i);
  return { width: values[0] || '', depth: values[1] || '', height: values[2] || '', thickness: values[3] || '' };
}

export function formatMeasures(product: {
  width?: string;
  depth?: string;
  height?: string;
  thickness?: string;
  depth_use_length?: boolean;
}) {
  const values = [
    product.width && `Largura total: ${product.width}`,
    product.depth &&
      `${product.depth_use_length ? 'Comprimento total' : 'Profundidade total'}: ${product.depth}`,
    product.height && `Altura total: ${product.height}`,
    product.thickness && `Espessura: ${product.thickness}`,
  ].filter(Boolean);
  return values.join(' | ');
}
