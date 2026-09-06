/**
 * Conversor determinístico offline de numerais e expressões por extenso em Português BR.
 * Converte falas como:
 * - "duzentos e trinta e sete reais e oitenta e nove centavos" -> 237.89
 * - "um milhão e meio" -> 1500000
 * - "vinte mil" -> 20000
 * - "dois mil e quinhentos" -> 2500
 */

const wordValueMap: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  cincoenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

export function parsePtBrWrittenNumbers(text: string): number | null {
  const lower = text.toLowerCase().trim();

  // 1. Caso especial: "um milhão e meio" / "1 milhão e meio" / "2 milhões e meio"
  const millionHalfMatch = lower.match(/(?:(\d+|um|uma|dois|duas|três|tres|quatro|cinco)\s*)?(?:milhão|milhao|milhões|milhoes)\s*(?:e\s*)?meio/i);
  if (millionHalfMatch) {
    const rawQ = (millionHalfMatch[1] || 'um').toLowerCase();
    const qty = !isNaN(parseInt(rawQ, 10)) ? parseInt(rawQ, 10) : (wordValueMap[rawQ] || 1);
    return qty * 1000000 + 500000;
  }

  // 2. Caso especial: "mil e quinhentos" / "dois mil e quinhentos" / "vinte mil"
  const thousandHalfMatch = lower.match(/(?:(\d+|[a-zçãéêíóôõú]+)\s*)?mil\s*(?:e\s*)?([a-zçãéêíóôõú\s]+)?/i);
  if (thousandHalfMatch && !lower.includes('reais e') && !lower.includes('centavos')) {
    const rawMultiplier = (thousandHalfMatch[1] || 'um').trim().toLowerCase();
    const multiplier = !isNaN(parseInt(rawMultiplier, 10)) ? parseInt(rawMultiplier, 10) : (wordValueMap[rawMultiplier] || (rawMultiplier === '' ? 1 : null));

    if (multiplier !== null) {
      let remainder = 0;
      const rest = (thousandHalfMatch[2] || '').trim();
      if (rest) {
        remainder = parseSimpleWordsToNumber(rest);
      }
      return multiplier * 1000 + remainder;
    }
  }

  // 3. Processamento de Reais e Centavos escritos por extenso (ex: "duzentos e trinta e sete reais e oitenta e nove centavos")
  const reaisCentavosMatch = lower.match(/(?:([a-zçãéêíóôõú\s]+)\s*(?:reais|real))?\s*(?:e\s*)?(?:([a-zçãéêíóôõú\s]+)\s*centavos?)?/i);

  if (reaisCentavosMatch && (reaisCentavosMatch[1] || reaisCentavosMatch[2])) {
    const reaisWords = (reaisCentavosMatch[1] || '').trim();
    const centavosWords = (reaisCentavosMatch[2] || '').trim();

    let total = 0;
    if (reaisWords) {
      total += parseSimpleWordsToNumber(reaisWords);
    }
    if (centavosWords) {
      total += parseSimpleWordsToNumber(centavosWords) / 100;
    }

    if (total > 0) return total;
  }

  // 4. Fallback simples por palavras encadeadas (ex: "duzentos e trinta e sete")
  const simpleNum = parseSimpleWordsToNumber(lower);
  return simpleNum > 0 ? simpleNum : null;
}

function parseSimpleWordsToNumber(wordsStr: string): number {
  const words = wordsStr.split(/\s+|e\s+/).map(w => w.trim()).filter(Boolean);
  let total = 0;

  for (const w of words) {
    if (wordValueMap[w] !== undefined) {
      total += wordValueMap[w];
    } else if (w === 'mil') {
      total = total === 0 ? 1000 : total * 1000;
    } else if (w === 'milhão' || w === 'milhao') {
      total = total === 0 ? 1000000 : total * 1000000;
    }
  }

  return total;
}
