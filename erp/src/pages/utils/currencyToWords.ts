/**
 * Conversor numérico determinístico de valores monetários para Português Brasileiro por extenso.
 * Compatível com o formato jurídico de títulos cambiais e notas promissórias (Decreto nº 57.663/1966).
 *
 * Exemplo: 1000.00 -> "mil reais"
 * Exemplo: 1500.50 -> "mil e quinhentos reais e cinquenta centavos"
 */

const UNIDADES = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
];

const DEZ_A_DEZENOVE = [
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];

const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];

const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

/**
 * Converte um número inteiro de 0 a 999 em palavras.
 */
function trioParaExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  const partes: string[] = [];

  if (c > 0) {
    partes.push(CENTENAS[c]);
  }

  if (d === 1) {
    partes.push(DEZ_A_DEZENOVE[u]);
  } else {
    if (d > 1) {
      partes.push(DEZENAS[d]);
    }
    if (u > 0) {
      partes.push(UNIDADES[u]);
    }
  }

  return partes.join(' e ');
}

/**
 * Converte um número inteiro (até 999.999.999) em palavras para a parte inteira (reais).
 */
function inteiroParaExtenso(valor: number): string {
  if (valor === 0) return 'zero';

  const milhoes = Math.floor(valor / 1_000_000);
  const milhares = Math.floor((valor % 1_000_000) / 1000);
  const resto = valor % 1000;

  const partes: string[] = [];

  if (milhoes > 0) {
    if (milhoes === 1) {
      partes.push('um milhão');
    } else {
      partes.push(`${trioParaExtenso(milhoes)} milhões`);
    }
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partes.push('mil');
    } else {
      partes.push(`${trioParaExtenso(milhares)} mil`);
    }
  }

  if (resto > 0) {
    partes.push(trioParaExtenso(resto));
  }

  // Regra de conjunção 'e' em português:
  // Se houver apenas milhões/milhares e resto < 100 ou resto múltiplo de 100, une com 'e'.
  if (partes.length === 1) {
    return partes[0];
  }

  if (partes.length === 2) {
    // Ex: 1.000 + 500 -> "mil e quinhentos", 1.000 + 20 -> "mil e vinte", 1.000 + 1 -> "mil e um"
    // Mas 1.000 + 250 -> "mil duzentos e cinquenta"
    if (resto > 0 && (resto < 100 || resto % 100 === 0)) {
      return `${partes[0]} e ${partes[1]}`;
    }
    return `${partes[0]} ${partes[1]}`;
  }

  // 3 partes (milhões, milhares, resto)
  const prefixo = partes.slice(0, -1).join(' ');
  const ultima = partes[partes.length - 1];
  if (resto > 0 && (resto < 100 || resto % 100 === 0)) {
    return `${prefixo} e ${ultima}`;
  }
  return `${prefixo} ${ultima}`;
}

/**
 * Converte um valor monetário em reais para texto por extenso em Português BR.
 *
 * @param amount Valor numérico em reais (ex: 1000, 1500.50)
 * @returns Texto por extenso formatado (ex: "mil reais", "mil e quinhentos reais e cinquenta centavos")
 */
export function currencyToWordsPtBr(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;

  if (!Number.isFinite(num) || num < 0) {
    return 'zero real';
  }

  const rounded = Math.round(num * 100) / 100;
  const inteiros = Math.floor(rounded);
  const centavos = Math.round((rounded - inteiros) * 100);

  const partesMoeda: string[] = [];

  if (inteiros > 0) {
    const textoInteiro = inteiroParaExtenso(inteiros);
    const terminaEmMilhaoOuMilhoes =
      inteiros >= 1_000_000 && inteiros % 1_000_000 === 0;
    const labelReais =
      inteiros === 1
        ? 'real'
        : terminaEmMilhaoOuMilhoes
          ? 'de reais'
          : 'reais';
    partesMoeda.push(`${textoInteiro} ${labelReais}`);
  }

  if (centavos > 0) {
    const textoCentavos = trioParaExtenso(centavos);
    const labelCentavos = centavos === 1 ? 'centavo' : 'centavos';
    partesMoeda.push(`${textoCentavos} ${labelCentavos}`);
  }

  if (partesMoeda.length === 0) {
    return 'zero real';
  }

  return partesMoeda.join(' e ');
}

export default currencyToWordsPtBr;
