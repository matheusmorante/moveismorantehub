/**
 * Formatadores de dados para a integração Meta Catalog.
 * Responsabilidade única: transformação e normalização de strings/preços/HTML.
 */

/**
 * Normaliza e codifica URL de imagem para o crawler da Meta.
 * Evita dupla codificação (%2520) e substitui espaços por %20.
 */
export function normalizeMetaImageUrl(urlStr: unknown): string {
  if (!urlStr) return '';
  const str = String(urlStr).trim();
  try {
    const decoded = decodeURI(str);
    return encodeURI(decoded).replace(/%2520/g, '%20').replace(/\s+/g, '%20');
  } catch {
    return str.replace(/\s+/g, '%20');
  }
}

/**
 * Formata um valor numérico como preço decimal brasileiro.
 * Retorna string vazia para valores inválidos ou ausentes.
 */
export function formatDecimalPrice(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

/**
 * Remove tags HTML e normaliza espaços/entidades HTML para texto puro.
 * Preserva quebras de parágrafo convertendo <br>, </p>, </div>, </li>.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
