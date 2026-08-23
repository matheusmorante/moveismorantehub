// Helper para pré-agrupamento determinístico e geração do Resumo Inteligente de Entregas por IA

import { simplifyProductName } from './orderUtils';

export interface SpokenDeliveryItem {
  city: string;
  isColombo: boolean;
  distNum: number | null;
  distCategory: 'close' | 'far';
  distNatural: string;
  hasAssembly: boolean;
  assemblyItems: string[];
  noAssemblyItems: string[];
  allProductsWithArticles: string[];
  timeNatural: string;
  notices: string[];
}

// Converte horários técnicos em linguagem falada natural (ex: "10:00 às 12:00" -> "entre dez e meio-dia")
export const formatTimeNatural = (timeStr: string, endTimeStr?: string): string => {
  if (!timeStr) return '';
  const cleanStart = timeStr.trim().replace(/[^\d:]/g, '');
  const cleanEnd = endTimeStr ? endTimeStr.trim().replace(/[^\d:]/g, '') : '';

  const parseHourMin = (t: string) => {
    const p = t.split(':');
    const h = parseInt(p[0], 10);
    const m = p[1] ? parseInt(p[1], 10) : 0;
    return { h, m };
  };

  const hourToWord = (h: number): string => {
    if (h === 0 || h === 24) return 'meia-noite';
    if (h === 12) return 'meio-dia';
    if (h === 1 || h === 13) return 'uma';
    if (h === 2 || h === 14) return 'duas';
    const words: Record<number, string> = {
      3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
      8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 15: 'três',
      16: 'quatro', 17: 'cinco', 18: 'seis', 19: 'sete', 20: 'oito',
      21: 'nove', 22: 'dez', 23: 'onze'
    };
    return words[h] || String(h);
  };

  if (cleanStart && cleanEnd) {
    const s = parseHourMin(cleanStart);
    const e = parseHourMin(cleanEnd);

    if (s.h === 10 && e.h === 12) return 'entre dez e meio-dia';
    if (s.h === 13 && e.h === 17) return 'entre uma e cinco da tarde';
    if (s.h === 8 && e.h === 12) return 'entre oito da manhã e meio-dia';
    if (s.h === 13 && e.h === 18) return 'entre uma e seis da tarde';

    const sPeriod = s.h >= 12 ? 'da tarde' : 'da manhã';
    const ePeriod = e.h >= 12 ? 'da tarde' : 'da manhã';

    if (e.h === 12) {
      return `entre ${hourToWord(s.h)} ${sPeriod} e meio-dia`;
    }
    if (sPeriod === ePeriod) {
      return `entre ${hourToWord(s.h)} e ${hourToWord(e.h)} ${sPeriod}`;
    }
    return `entre ${hourToWord(s.h)} ${sPeriod} e ${hourToWord(e.h)} ${ePeriod}`;
  }

  if (cleanStart) {
    const s = parseHourMin(cleanStart);
    if (s.h === 12) return 'ao meio-dia';
    const period = s.h >= 12 ? 'da tarde' : 'da manhã';
    return `às ${hourToWord(s.h)} ${period}`;
  }

  return '';
};

// Converte distâncias numéricas em linguagem falada natural (ex: 26.8 -> "cerca de vinte e sete quilômetros")
export const formatDistanceNatural = (distNum: number | null): string => {
  if (distNum === null || isNaN(distNum) || distNum <= 8) return 'próxima';

  const rounded = Math.round(distNum);
  const words: Record<number, string> = {
    9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze',
    15: 'quinze', 16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove',
    20: 'vinte', 21: 'vinte e um', 22: 'vinte e dois', 23: 'vinte e três',
    24: 'vinte e quatro', 25: 'vinte e cinco', 26: 'vinte e seis', 27: 'vinte e sete',
    28: 'vinte e oito', 29: 'vinte e nove', 30: 'trinta', 35: 'trinta e cinco',
    40: 'quarenta', 50: 'cinquenta'
  };
  const distWord = words[rounded] || `${rounded}`;
  return `a cerca de ${distWord} quilômetros`;
};

// Formata o nome do produto com artigo gramatical correto
export const formatProductNameWithArticle = (rawName: string, itemQty: number = 1): string => {
  const short = simplifyProductName(rawName).toLowerCase();
  const firstWord = short.split(' ')[0];

  const feminineFirstWords = [
    'escrivaninha', 'cômoda', 'comoda', 'pia', 'mesa', 'cadeira',
    'poltrona', 'cozinha', 'cama', 'sapateira', 'cristaleira', 'bancada',
    'prateleira', 'estante', 'estação', 'banheira', 'penteadeira'
  ];
  const isFeminine = feminineFirstWords.some(fw => firstWord === fw || firstWord.startsWith(fw));

  if (itemQty === 1) {
    return `${isFeminine ? 'uma' : 'um'} ${short}`;
  } else if (itemQty === 2) {
    return `${isFeminine ? 'duas' : 'dois'} ${short}s`;
  } else {
    return `${itemQty} ${short}s`;
  }
};

// Verifica se um tipo de manuseio/entrega requer montagem fora no cliente
export const isAssemblyOutsideType = (handlingType?: string, optionsConfig?: any[]): boolean => {
  if (!handlingType) return false;
  const h = handlingType.trim().toLowerCase();
  if (!h || h === 'sem montagem' || h.includes('sem montagem') || h.includes('sem_montagem') || h.includes('apenas entrega') || h.includes('não necessita') || h.includes('nao necessita')) {
    return false;
  }

  if (Array.isArray(optionsConfig) && optionsConfig.length > 0) {
    const matched = optionsConfig.find(opt => (opt?.label || '').trim().toLowerCase() === h);
    if (matched) {
      return matched.isAssemblyOutside === true;
    }
  }

  return (
    h.includes('montagem_fora') ||
    h.includes('montagem fora') ||
    h.includes('montador') ||
    h.includes('montagem externa') ||
    h.includes('montagem no cliente') ||
    h.includes('assembly_outside') ||
    (h.includes('fora') && !h.includes('sem'))
  );
};

// Verifica se um tipo de manuseio/entrega é de montagem na loja ou depósito
export const isAssemblyInternalType = (handlingType?: string, optionsConfig?: any[]): boolean => {
  if (!handlingType) return false;
  const h = handlingType.trim().toLowerCase();
  if (!h || h === 'sem montagem' || h.includes('sem montagem') || h.includes('sem_montagem') || h.includes('apenas entrega') || h.includes('não necessita') || h.includes('nao necessita')) {
    return false;
  }

  if (Array.isArray(optionsConfig) && optionsConfig.length > 0) {
    const matched = optionsConfig.find(opt => (opt?.label || '').trim().toLowerCase() === h);
    if (matched) {
      return matched.includeInAssemblySchedule === true && !matched.isAssemblyOutside;
    }
  }

  if (isAssemblyOutsideType(handlingType, optionsConfig)) return false;

  return (
    h.includes('loja') ||
    h.includes('deposito') ||
    h.includes('depósito') ||
    h.includes('montagem_loja') ||
    h.includes('montagem na loja') ||
    h.includes('interna') ||
    h.includes('montado')
  );
};

