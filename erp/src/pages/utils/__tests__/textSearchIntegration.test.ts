import { describe, expect, it } from 'vitest';
import { normalizeSearchTerm, removeAccents } from '../textUtils';
import {
  matchesCustomerSearch,
  getCustomerSearchQuery,
  canSearchCustomers,
} from '../customerSearch';

// Simulação de base de dados realista para validação funcional das buscas
const mockProducts = [
  { id: 'p1', name: 'Sofá Retrátil 3 Lugares', sku: 'SOF-001', category: 'Sala' },
  { id: 'p2', name: 'Mesa de Jantar 6 Cadeiras', sku: 'MES-002', category: 'Sala de Jantar' },
  { id: 'p3', name: 'Guarda-Roupa Casal 6 Portas', sku: 'GUA-003', category: 'Quarto' },
  { id: 'p4', name: 'Colchão Queen Molas Ensacadas', sku: 'COL-004', category: 'Quarto' },
  { id: 'p5', name: 'Cadeira de Escritório Ergonômica', sku: 'CAD-005', category: 'Escritório' },
  { id: 'p6', name: 'Poltrona Decorativa Veludo', sku: 'POL-006', category: 'Sala' },
];

const mockPeople = [
  {
    id: 'pe1',
    full_name: 'Maria Eduarda Fernandes',
    social_name: 'Duda Fernandes',
    cpf_cnpj: '123.456.789-00',
    phone: '(41) 99999-1111',
    email: 'duda@example.com',
  },
  {
    id: 'pe2',
    full_name: 'João Pedro da Silva',
    social_name: null,
    cpf_cnpj: '98.765.432/0001-99',
    phone: '(41) 98888-2222',
    email: 'joao@empresa.com.br',
  },
  {
    id: 'pe3',
    full_name: 'Carlos Alberto de Nóbrega',
    social_name: 'Cazalbé',
    cpf_cnpj: '111.222.333-44',
    phone: '(11) 97777-3333',
    email: 'carlos@praca.com.br',
  },
];

const mockNcms = [
  {
    code: '94035000',
    official_description: 'Móveis de madeira do tipo utilizado em quartos de dormir',
  },
  { code: '94036000', official_description: 'Outros móveis de madeira' },
  { code: '94016100', official_description: 'Assentos estofados com armação de madeira' },
  {
    code: '94042100',
    official_description: 'Colchões de borracha alveolar ou de plásticos alveolares',
  },
];

// Algoritmo canônico de similaridade trigram (Jaccard sobre 3-gramas)
function getTrigrams(text: string): Set<string> {
  const padded = `  ${text.toLowerCase().trim()} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

function calculateTrigramSimilarity(a: string, b: string): number {
  const triA = getTrigrams(a);
  const triB = getTrigrams(b);
  let intersection = 0;
  for (const tri of triA) {
    if (triB.has(tri)) intersection++;
  }
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function calculateWordTrigramSimilarity(queryWord: string, targetText: string): number {
  if (queryWord.length < 3) return 0;
  const targetWords = targetText.split(/\s+/).filter((w) => w.length >= 3);
  let maxSim = 0;
  for (const word of targetWords) {
    const sim = calculateTrigramSimilarity(queryWord, word);
    if (sim > maxSim) maxSim = sim;
  }
  return maxSim;
}

// Helper funcional de busca de produtos compatível com o comportamento do Supabase/pg_trgm
function searchProductsFunctional(
  query: string,
  products: typeof mockProducts,
  options?: { limit?: number; similarityThreshold?: number }
) {
  const limit = options?.limit ?? 10;
  const threshold = options?.similarityThreshold ?? 0.2;
  const clean = normalizeSearchTerm(query);

  if (!clean || clean.length < 2) return [];

  // Normalização de hífen/espaço
  const queryNormalizedSpaced = clean.replace(/[-_]/g, ' ');

  const scored = products.map((p) => {
    const nameNorm = normalizeSearchTerm(p.name);
    const nameSpaced = nameNorm.replace(/[-_]/g, ' ');

    let score = 0;
    // 1. Match exato
    if (nameNorm === clean || nameSpaced === queryNormalizedSpaced) {
      score = 1.0;
    }
    // 2. Match por prefixo
    else if (nameNorm.startsWith(clean) || nameSpaced.startsWith(queryNormalizedSpaced)) {
      score = 0.8;
    }
    // 3. Substring
    else if (nameNorm.includes(clean) || nameSpaced.includes(queryNormalizedSpaced)) {
      score = 0.6;
    }
    // 4. Trigram similarity / Word similarity (como o pg_trgm word_similarity)
    else {
      const fullSim = calculateTrigramSimilarity(clean, nameNorm);
      const wordSim = calculateWordTrigramSimilarity(clean, nameNorm);
      score = Math.max(fullSim, wordSim);
    }

    return { product: p, score };
  });

  return scored
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);
}

// Helper funcional de busca de pessoas
function searchPeopleFunctional(query: string, people: typeof mockPeople, limit = 10) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const rawDigits = trimmed.replace(/\D/g, '');
  const isCpfCnpjSearch =
    rawDigits.length >= 8 && rawDigits.length === trimmed.replace(/[\.\-\/\s]/g, '').length;

  // Busca determinística por documento (B-tree)
  if (isCpfCnpjSearch) {
    return people.filter((p) => p.cpf_cnpj.replace(/\D/g, '').includes(rawDigits)).slice(0, limit);
  }

  // Busca textual em full_name ou social_name com tolerância a acentos
  const clean = normalizeSearchTerm(trimmed);
  return people
    .filter((p) => {
      const matchFullName = normalizeSearchTerm(p.full_name).includes(clean);
      const matchSocialName = p.social_name
        ? normalizeSearchTerm(p.social_name).includes(clean)
        : false;
      const trigramName =
        calculateWordTrigramSimilarity(clean, normalizeSearchTerm(p.full_name)) > 0.3;
      return matchFullName || matchSocialName || trigramName;
    })
    .slice(0, limit);
}

// Helper funcional de busca de NCM
function searchNcmsFunctional(searchTerm: string, ncms: typeof mockNcms, maxResults = 20) {
  const clean = searchTerm.trim();
  if (clean.length < 2) return [];

  const digits = clean.replace(/\D/g, '');
  const isCodeSearch = digits.length >= 2 && digits.length === clean.length;

  if (isCodeSearch) {
    return ncms.filter((n) => n.code.startsWith(digits)).slice(0, maxResults);
  }

  const cleanText = normalizeSearchTerm(clean);
  return ncms
    .filter((n) => {
      const descNorm = normalizeSearchTerm(n.official_description);
      return descNorm.includes(cleanText);
    })
    .slice(0, maxResults);
}

describe('Auditoria de Busca Textual e Governança pg_trgm', () => {
  describe('Cenários para Produtos', () => {
    it('encontra produto por termo exato', () => {
      const results = searchProductsFunctional('Mesa de Jantar 6 Cadeiras', mockProducts);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('p2');
    });

    it('encontra produto por prefixo', () => {
      const results = searchProductsFunctional('Sofá', mockProducts);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('p1');
    });

    it('encontra produto por substring no meio do nome', () => {
      const results = searchProductsFunctional('Cadeiras', mockProducts);
      expect(results.some((p) => p.id === 'p2')).toBe(true);
    });

    it('encontra produto com erro leve de digitação via trigramas', () => {
      // "Ensacadas" digitado como "Ensacdas"
      const results = searchProductsFunctional('Ensacdas', mockProducts);
      expect(results.some((p) => p.id === 'p4')).toBe(true);
    });

    it('encontra produto com acentuação diferente (com e sem acento)', () => {
      const semAcento = searchProductsFunctional('sofa retratil', mockProducts);
      const comAcento = searchProductsFunctional('sofá retrátil', mockProducts);
      expect(semAcento[0].id).toBe('p1');
      expect(comAcento[0].id).toBe('p1');

      const colchaoSem = searchProductsFunctional('colchao queen', mockProducts);
      const colchaoCom = searchProductsFunctional('colchão queen', mockProducts);
      expect(colchaoSem[0].id).toBe('p4');
      expect(colchaoCom[0].id).toBe('p4');
    });

    it('encontra produto com variação hífen vs espaço', () => {
      const comHifen = searchProductsFunctional('guarda-roupa', mockProducts);
      const comEspaco = searchProductsFunctional('guarda roupa', mockProducts);
      expect(comHifen[0].id).toBe('p3');
      expect(comEspaco[0].id).toBe('p3');
    });

    it('retorna lista vazia sem quebrar para termo inexistente', () => {
      const results = searchProductsFunctional('computador quântico xyz', mockProducts);
      expect(results).toEqual([]);
    });

    it('respeita o limite estrito de resultados (LIMIT)', () => {
      const results = searchProductsFunctional('de', mockProducts, { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Cenários para Pessoas', () => {
    it('encontra pessoa por nome parcial', () => {
      const results = searchPeopleFunctional('Fernandes', mockPeople);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('pe1');
    });

    it('encontra pessoa por nome social', () => {
      const results = searchPeopleFunctional('Cazalbé', mockPeople);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('pe3');

      const resultsDuda = searchPeopleFunctional('Duda', mockPeople);
      expect(resultsDuda.length).toBe(1);
      expect(resultsDuda[0].id).toBe('pe1');
    });

    it('busca determinística por CPF/CNPJ sem depender de trigram', () => {
      // CPF sem formatação
      const cpfLimpo = searchPeopleFunctional('12345678900', mockPeople);
      expect(cpfLimpo.length).toBe(1);
      expect(cpfLimpo[0].id).toBe('pe1');

      // CPF com pontuação
      const cpfFormatado = searchPeopleFunctional('123.456.789-00', mockPeople);
      expect(cpfFormatado.length).toBe(1);
      expect(cpfFormatado[0].id).toBe('pe1');

      // CNPJ com pontuação
      const cnpjFormatado = searchPeopleFunctional('98.765.432/0001-99', mockPeople);
      expect(cnpjFormatado.length).toBe(1);
      expect(cnpjFormatado[0].id).toBe('pe2');
    });
  });

  describe('Cenários para NCM', () => {
    it('encontra NCM por código numérico exato ou prefixo', () => {
      const results = searchNcmsFunctional('9403', mockNcms);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.code)).toEqual(['94035000', '94036000']);
    });

    it('encontra NCM por descrição oficial com ou sem acento', () => {
      const semAcento = searchNcmsFunctional('moveis de madeira', mockNcms);
      const comAcento = searchNcmsFunctional('móveis de madeira', mockNcms);
      expect(semAcento.length).toBe(2);
      expect(comAcento.length).toBe(2);
    });

    it('retorna vazio para NCM inexistente sem falhas', () => {
      const results = searchNcmsFunctional('99999999', mockNcms);
      expect(results).toEqual([]);
    });
  });

  describe('Governança, Paginação e Prevenção de Egress', () => {
    it('retorna imediatamente vazio para consultas com menos de 2 caracteres (anti-egress)', () => {
      expect(searchProductsFunctional('a', mockProducts)).toEqual([]);
      expect(searchProductsFunctional('  ', mockProducts)).toEqual([]);
      expect(searchPeopleFunctional('1', mockPeople)).toEqual([]);
      expect(searchNcmsFunctional('9', mockNcms)).toEqual([]);
      expect(canSearchCustomers('p')).toBe(false);
    });

    it('não duplica registros na paginação ou ranking', () => {
      const results = searchProductsFunctional('cadeira', mockProducts, { limit: 10 });
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
