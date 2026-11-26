export interface ParsedAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export const parseAddressString = (addressStr: string): ParsedAddress => {
  const result: ParsedAddress = {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'PR',
    cep: '',
  };

  if (!addressStr) return result;

  // Pattern: "Street, Number, Neighborhood, City/State CEP: 00000-000"
  // Pattern: "Street, Number - Neighborhood, City"

  // Extract CEP
  const cepMatch = addressStr.match(/(\d{5}-?\d{3})/);
  if (cepMatch) {
    result.cep = cepMatch[1];
    addressStr = addressStr.replace(cepMatch[0], '').replace('CEP:', '');
  }

  // Split by commas or dashes
  const parts = addressStr
    .split(/[,/-]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 1) result.street = parts[0];
  if (parts.length >= 2) {
    // Check if part[1] is a number
    if (/^\d+$/.test(parts[1]) || parts[1].toLowerCase().includes('nº')) {
      result.number = parts[1].replace(/nº/i, '').trim();
      if (parts.length >= 3) result.neighborhood = parts[2];
      if (parts.length >= 4) result.city = parts[3];
    } else {
      result.neighborhood = parts[1];
      if (parts.length >= 3) result.city = parts[2];
    }
  }

  return result;
};
