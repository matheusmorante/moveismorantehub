export function normalizeRecipientTaxId(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidRecipientTaxId(raw: string): boolean {
  const value = normalizeRecipientTaxId(raw);
  if (!/^(?:\d{11}|\d{14})$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const digit = (base: string, weights: number[]) => {
    const rest = [...base].reduce((sum, char, i) => sum + Number(char) * weights[i], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const cpf = value.length === 11;
  const first = cpf ? [10,9,8,7,6,5,4,3,2] : [5,4,3,2,9,8,7,6,5,4,3,2];
  const second = cpf ? [11,10,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
  return digit(value.slice(0,-2),first) === Number(value.at(-2)) &&
    digit(value.slice(0,-1),second) === Number(value.at(-1));
}

export function recipientTaxIdKind(raw: string): 'CPF' | 'CNPJ' | null {
  const length = normalizeRecipientTaxId(raw).length;
  return length === 11 ? 'CPF' : length === 14 ? 'CNPJ' : null;
}
