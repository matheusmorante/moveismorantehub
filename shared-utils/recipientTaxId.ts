export function normalizeRecipientTaxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[.\-/\s]/g, '');
}

/** Valida apenas o formato e os caracteres; não calcula dígitos verificadores. */
export function isValidRecipientTaxId(raw: string): boolean {
  const value = normalizeRecipientTaxId(raw);
  return /^\d{11}$/.test(value) || /^[0-9A-Z]{12}\d{2}$/.test(value);
}

export function recipientTaxIdKind(raw: string): 'CPF' | 'CNPJ' | null {
  const length = normalizeRecipientTaxId(raw).length;
  return length === 11 ? 'CPF' : length === 14 ? 'CNPJ' : null;
}

export function recipientTaxIdMatchesPersonType(
  raw: string,
  personType?: string
): boolean {
  const kind = recipientTaxIdKind(raw);
  if (!kind || !['PF', 'PJ'].includes(String(personType || ''))) return true;
  return (personType === 'PF' && kind === 'CPF') || (personType === 'PJ' && kind === 'CNPJ');
}

export function getRecipientTaxIdValidationMessage(
  raw: string,
  personType?: string
): string | null {
  const value = normalizeRecipientTaxId(raw);
  if (!value) return null;

  const isCpf = /^\d{11}$/.test(value);
  const isCnpj = /^[0-9A-Z]{12}\d{2}$/.test(value);
  if (!isCpf && !isCnpj) {
    if (personType === 'PF') return 'CPF inválido: informe 11 dígitos numéricos.';
    if (personType === 'PJ') return 'CNPJ inválido: informe 12 caracteres e 2 dígitos verificadores.';
    return 'Documento inválido: informe um CPF com 11 dígitos ou um CNPJ com 14 caracteres.';
  }

  const kind = isCpf ? 'CPF' : 'CNPJ';
  if ((personType === 'PF' && kind === 'CNPJ') || (personType === 'PJ' && kind === 'CPF')) {
    return kind === 'CPF'
      ? 'Tipo de documento incompatível: cliente PJ precisa de um CNPJ.'
      : 'Tipo de documento incompatível: cliente PF precisa de um CPF.';
  }
  return null;
}

export function formatRecipientTaxId(raw: string, personType?: string): string {
  const compact = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const isCnpj = personType === 'PJ' || /[A-Z]/.test(compact) || compact.length > 11;
  const value = isCnpj
    ? compact.slice(0, 14)
    : compact.replace(/\D/g, '').slice(0, 11);
  if (isCnpj) {
    if (value.length > 12)
      return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) +
        '/' + value.slice(8, 12) + '-' + value.slice(12);
    if (value.length > 8)
      return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) +
        '/' + value.slice(8);
    if (value.length > 5) return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5);
    if (value.length > 2) return value.slice(0, 2) + '.' + value.slice(2);
    return value;
  }
  if (value.length > 9)
    return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6, 9) +
      '-' + value.slice(9);
  if (value.length > 6) return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6);
  if (value.length > 3) return value.slice(0, 3) + '.' + value.slice(3);
  return value;
}
