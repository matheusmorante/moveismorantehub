/**
 * Normaliza um texto para slug de URL: minúsculo, sem acentos ou caracteres especiais, e separado por hífens.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Espaços para -
    .replace(/-+/g, '-'); // Remove duplicados de -
}
