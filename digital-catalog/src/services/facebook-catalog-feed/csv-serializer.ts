/**
 * Cabeçalhos oficiais do feed CSV da Meta (conforme modelo Wix / Commerce Manager)
 */
export const META_CATALOG_CSV_HEADERS: readonly string[] = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'availability',
  'rich_text_description',
  'price',
  'sale_price',
  'brand',
  'condition',
  'color',
  'gender',
  'material',
  'size',
  'item_group_id',
  'identifier_exists',
  'quantity_to_sell_on_facebook',
  'product_type',
  'custom_label_0',
  'custom_label_1',
  'custom_label_2',
  'custom_label_3',
] as const;

/**
 * Formata campo CSV preservando quebras de parágrafo dentro de aspas duplas.
 * Campos com \n, \r, vírgulas ou aspas são sempre envoltos em "..."
 * garantindo que o WhatsApp e o Meta recebam os parágrafos corretos.
 */
export function formatCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  // Normaliza quebras de linha para \n simples
  let str = String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Se contiver quebra de linha, vírgula ou aspas duplas → obrigatório envolver em aspas
  if (/["\n,]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializa linhas de dados em uma string CSV válida com cabeçalhos.
 */
export function serializeFeedRowsToCsv(rows: string[][]): string {
  const headerLine = META_CATALOG_CSV_HEADERS.join(',');
  const dataLines = rows.map((row) => row.map(formatCsvValue).join(','));
  return [headerLine, ...dataLines].join('\n');
}
