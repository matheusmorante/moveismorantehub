export type RecipientIeIndicator = '1' | '2' | '9';

export function resolveEffectiveRecipientIeIndicator(input: {
  selected?: unknown;
  persisted?: unknown;
  customer?: unknown;
  ie?: unknown;
}): RecipientIeIndicator {
  for (const candidate of [input.selected, input.persisted, input.customer]) {
    const value = String(candidate ?? '').trim();
    if (value === '1' || value === '2' || value === '9') return value;
  }

  return String(input.ie ?? '').trim() ? '1' : '9';
}

export function getRecipientIeIndicatorConsistencyError(
  indicator: unknown,
  ie: unknown
): string | null {
  if (indicator !== '1' && indicator !== '2' && indicator !== '9') {
    return 'Selecione uma situação válida para a Inscrição Estadual do destinatário.';
  }

  const rawIe = typeof ie === 'string' ? ie.trim() : '';
  const digits = rawIe.replace(/\D/g, '');

  if (indicator === '1') {
    if (!digits) {
      return 'Destinatário contribuinte do ICMS (indIEDest=1) exige Inscrição Estadual.';
    }
    if (digits.length < 2 || digits.length > 14) {
      return 'A IE informada para indIEDest=1 deve conter de 2 a 14 dígitos.';
    }
    return null;
  }

  if (indicator === '2') {
    return rawIe
      ? 'Destinatário isento (indIEDest=2) não deve possuir Inscrição Estadual informada.'
      : null;
  }

  if (rawIe && (digits.length < 2 || digits.length > 14)) {
    return 'A IE informada para indIEDest=9 deve conter de 2 a 14 dígitos.';
  }

  return null;
}
