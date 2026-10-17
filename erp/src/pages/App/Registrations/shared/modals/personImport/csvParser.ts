export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const firstLine = text.split('\n')[0];
  const delimiter =
    (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f !== '')) rows.push(currentRow);
  }
  if (inQuotes) throw new Error('O CSV contém aspas sem fechamento.');
  return rows;
};

export const parseBoolean = (value?: string) => {
  const normalized = value?.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return undefined;
  if (['sim', 'true', '1', 'yes'].includes(normalized)) return true;
  if (['não', 'nao', 'false', '0', 'no'].includes(normalized)) return false;
  return value;
};

export const parseMarketingOrigin = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return fallback;
  if (['paid', 'pago', 'tráfego pago', 'trafego pago', 'sim'].includes(normalized)) return 'paid';
  if (['organic', 'orgânico', 'organico', 'não', 'nao'].includes(normalized)) return 'organic';
  return normalized;
};
