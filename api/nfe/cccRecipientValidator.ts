/**
 * CCC (Cadastro Centralizado de Contribuinte) Recipient IE Validation Helper & Extension Hook.
 * Implements guidelines for NT 2025.001 v1.03 regarding indIEDest and IE.
 */

export interface CccRecipientValidationInput {
  uf?: string;
  ie?: string;
  ieIndicator: '1' | '2' | '9';
}

export interface CccRecipientValidationResult {
  valid: boolean;
  sanitizedIe?: string;
  ieIndicator: '1' | '2' | '9';
  requiresFutureCccCheck: boolean;
  cccStatus: 'ACTIVE_TAXPAYER' | 'NON_TAXPAYER_CONFIRMED' | 'NOT_APPLICABLE' | 'PENDING_SERVICE_ACTIVATION';
  message?: string;
}

export type CccLookupHandler = (
  uf: string,
  ie: string
) => Promise<{ isRegisteredAsNonTaxpayer: boolean; isActive: boolean }>;

let customCccLookupHandler: CccLookupHandler | null = null;

/**
 * Register a real-time CCC lookup handler for asynchronous or future validation
 * when SEFAZ enables the strict NT 2025.001 rule.
 */
export function registerCccLookupHandler(handler: CccLookupHandler | null): void {
  customCccLookupHandler = handler;
}

export function getRegisteredCccLookupHandler(): CccLookupHandler | null {
  return customCccLookupHandler;
}

/**
 * Validates the recipient's IE according to indIEDest (1, 2, 9) and NT 2025.001.
 * - indIEDest = '1' (Contribuinte): IE is mandatory, must have 2-14 digits.
 * - indIEDest = '2' (Isento): IE must not be sent.
 * - indIEDest = '9' (Não Contribuinte):
 *     - If no IE: valid, no CCC check needed.
 *     - If IE provided: validates minimum digit structure (2-14 digits),
 *       and marks for future CCC verification per NT 2025.001 v1.03.
 */
export function validateRecipientIeWithCcc(input: CccRecipientValidationInput): CccRecipientValidationResult {
  const { uf, ie, ieIndicator } = input;
  const rawIe = typeof ie === 'string' ? ie.trim() : '';
  const sanitizedIe = rawIe.replace(/\D/g, '');

  if (!['1', '2', '9'].includes(ieIndicator)) {
    throw new Error(`Indicador de IE inválido: "${ieIndicator}". Valores permitidos: 1, 2 ou 9.`);
  }

  // 1 — Contribuinte do ICMS
  if (ieIndicator === '1') {
    if (!sanitizedIe) {
      throw new Error('Destinatário contribuinte do ICMS (indIEDest=1) exige Inscrição Estadual válida.');
    }
    if (sanitizedIe.length < 2 || sanitizedIe.length > 14) {
      throw new Error(`Inscrição Estadual do contribuinte inválida: ${sanitizedIe} deve conter entre 2 e 14 dígitos.`);
    }
    return {
      valid: true,
      sanitizedIe,
      ieIndicator: '1',
      requiresFutureCccCheck: false,
      cccStatus: 'ACTIVE_TAXPAYER',
    };
  }

  // 2 — Contribuinte Isento
  if (ieIndicator === '2') {
    if (sanitizedIe) {
      throw new Error('Destinatário isento de inscrição (indIEDest=2) não deve possuir Inscrição Estadual informada.');
    }
    return {
      valid: true,
      ieIndicator: '2',
      requiresFutureCccCheck: false,
      cccStatus: 'NOT_APPLICABLE',
    };
  }

  // 9 — Não Contribuinte
  if (!sanitizedIe) {
    return {
      valid: true,
      ieIndicator: '9',
      requiresFutureCccCheck: false,
      cccStatus: 'NOT_APPLICABLE',
    };
  }

  // Se não contribuinte possui IE informada (NF-e modelo 55)
  if (sanitizedIe.length < 2 || sanitizedIe.length > 14) {
    throw new Error(`Inscrição Estadual de não contribuinte com formato inválido: "${sanitizedIe}".`);
  }

  // Ponto de extensão / log de auditoria para NT 2025.001 v1.03:
  // A SEFAZ validará se esta IE está cadastrada no CCC como "Não Contribuinte" na UF do destinatário.
  if (process.env.NODE_ENV !== 'test') {
    console.info(
      `[NT 2025.001 / CCC Audit] IE informada para destinatário não contribuinte (indIEDest=9). ` +
      `Validação futura via CCC pendente de ativação na SEFAZ. UF: ${uf || 'N/A'}, IE: ${sanitizedIe}`
    );
  }

  return {
    valid: true,
    sanitizedIe,
    ieIndicator: '9',
    requiresFutureCccCheck: true,
    cccStatus: 'PENDING_SERVICE_ACTIVATION',
    message: 'IE de não contribuinte aceita; sujeita à futura validação cadastral CCC pela SEFAZ (NT 2025.001).',
  };
}
