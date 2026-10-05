export function normalizeRecipientTaxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[.\-/\s]/g, '');
}

export function isValidRecipientTaxId(raw: string): boolean {
  const value = normalizeRecipientTaxId(raw);
  if (/^\d{11}$/.test(value)) {
    if (/^(\d)\1+$/.test(value)) return false;
    const digit = (base: string, weights: number[]) => {
      const rest = [...base].reduce((sum, char, i) => sum + Number(char) * weights[i], 0) % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return (
      digit(value.slice(0, -2), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(value.at(-2)) &&
      digit(value.slice(0, -1), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(value.at(-1))
    );
  }

  // Desde 2026, novos CNPJs podem ter letras nos 12 caracteres-base.
  // A Receita Federal define o valor de cada caractere como ASCII - 48.
  if (!/^[0-9A-Z]{12}\d{2}$/.test(value) || /^(.)\1+$/.test(value)) return false;
  const digit = (base: string, weights: number[]) => {
    const rest = [...base].reduce((sum, char, i) => sum + (char.charCodeAt(0) - 48) * weights[i], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    digit(value.slice(0, -2), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(value.at(-2)) &&
    digit(value.slice(0, -1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(value.at(-1))
  );
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
