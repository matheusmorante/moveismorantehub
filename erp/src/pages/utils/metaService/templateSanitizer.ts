/**
 * Utilitários de sanitização e normalização de dados para o WhatsApp Cloud API / Meta Graph API.
 */
export const templateSanitizer = {
  /**
   * Sanitiza valores de parâmetros de modelo conforme regras rígidas da Meta (#132018):
   * - Não pode conter quebras de linha (\r, \n) nem tabulações (\t)
   * - Não pode conter 4 ou mais espaços consecutivos
   * - Não pode ser vazio (fallback para '-')
   * - Limite máximo de 1000 caracteres (limite técnico da Meta é 1024)
   */
  sanitizeTemplateParam: (val: unknown): string => {
    if (val == null) return '-';
    const str = String(val);
    const cleaned = str
      .replace(/[\r\n\t]+/g, ' • ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!cleaned) return '-';
    return cleaned.length > 1000 ? `${cleaned.slice(0, 997)}...` : cleaned;
  },

  /**
   * Normaliza número de telefone para o padrão E.164 exigido pela Meta Cloud API
   */
  formatRecipientPhone: (to: string): string => {
    const cleanPhone = to.replace(/\D/g, '');
    return cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  },
};
