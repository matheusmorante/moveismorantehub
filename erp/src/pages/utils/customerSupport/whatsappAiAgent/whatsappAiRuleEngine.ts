import type { AiSituationRule } from '../../settings/types.js';
import { DEFAULT_SITUATION_RULES } from '../../../../../../shared-utils/whatsappAiAgentSchemas.js';

/**
 * Remove acentos e converte para minúsculas para comparações tolerantes e robustas
 */
export function normalizeRuleText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface SituationMatchResult {
  situation: AiSituationRule | null;
  matchedKeywords: string[];
}

/**
 * Identifica a situação/intenção do cliente com base no texto e nas regras configuradas
 */
export function detectCustomerSituation(
  userText: string,
  rules: readonly AiSituationRule[] = DEFAULT_SITUATION_RULES
): SituationMatchResult {
  if (!userText || !Array.isArray(rules) || rules.length === 0) {
    return { situation: null, matchedKeywords: [] };
  }

  const normalizedUserText = normalizeRuleText(userText);
  if (!normalizedUserText) {
    return { situation: null, matchedKeywords: [] };
  }

  // Ordena por prioridade decrescente para que regras mais prioritárias sejam testadas primeiro
  const sortedRules = [...rules]
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  for (const rule of sortedRules) {
    const matchedKeywords: string[] = [];
    for (const kw of rule.triggerKeywords || []) {
      const normalizedKw = normalizeRuleText(kw);
      if (!normalizedKw) continue;

      // Busca por correspondência de palavra inteira ou substring relevante
      if (normalizedUserText.includes(normalizedKw)) {
        matchedKeywords.push(kw);
      }
    }

    if (matchedKeywords.length > 0) {
      return {
        situation: rule,
        matchedKeywords,
      };
    }
  }

  return { situation: null, matchedKeywords: [] };
}

export interface MandatoryPhrasesEnforcementResult {
  text: string;
  enforcedPhrases: string[];
  alreadyPresentPhrases: string[];
  skippedConflictingPhrases?: string[];
}

/**
 * Termos que indicam que a resposta já tratou de uma condição específica ou cotação individualizada,
 * prevenindo que frases genéricas (ex: frete grátis) contradigam uma cobrança real ou endereço distante.
 */
const CONFLICT_INDICATORS_BY_KEYWORD: Record<string, string[]> = {
  frete: [
    'taxa de entrega',
    'taxa de frete',
    'valor do frete e de r$',
    'frete fica em r$',
    'frete e de r$',
    'acima de 5 km',
    'distancia superior',
    'fora da regiao',
    'fora da area',
    'nao entregamos',
  ],
  desconto: [
    'sem desconto adicional',
    'preco final',
    'ja com desconto aplicado',
  ],
};

/**
 * Garante deterministicamente que frases obrigatórias da situação constem na resposta final da IA,
 * com validação de coerência e prevenção contra desinformação ou afirmações contraditórias.
 */
export function enforceMandatoryPhrases(
  replyText: string,
  mandatoryPhrases: readonly string[] = [],
  userQuery = ''
): MandatoryPhrasesEnforcementResult {
  const currentText = (replyText || '').trim();
  if (!mandatoryPhrases || mandatoryPhrases.length === 0) {
    return {
      text: currentText,
      enforcedPhrases: [],
      alreadyPresentPhrases: [],
      skippedConflictingPhrases: [],
    };
  }

  const normalizedReply = normalizeRuleText(currentText);
  const normalizedQuery = normalizeRuleText(userQuery);
  const enforcedPhrases: string[] = [];
  const alreadyPresentPhrases: string[] = [];
  const skippedConflictingPhrases: string[] = [];
  const phrasesToAppend: string[] = [];

  for (const phrase of mandatoryPhrases) {
    const trimmedPhrase = phrase.trim();
    if (!trimmedPhrase) continue;

    const normalizedPhrase = normalizeRuleText(trimmedPhrase);

    // 1. Prevenção de Conflito: Se a frase afirma gratuidade de frete, mas a resposta da IA
    // já calculou uma taxa específica de frete para a distância ou o cliente perguntou de local distante
    if (normalizedPhrase.includes('frete') && normalizedPhrase.includes('gratis')) {
      const hasConflict = CONFLICT_INDICATORS_BY_KEYWORD.frete.some((conflictTerm) =>
        normalizedReply.includes(conflictTerm)
      );

      if (hasConflict) {
        // Não anexa a frase de frete grátis genérico para não gerar contradição ou desinformação
        skippedConflictingPhrases.push(trimmedPhrase);
        continue;
      }
    }

    // 2. Extrai palavras com mais de 3 letras da frase obrigatória
    const words = normalizedPhrase
      .split(/\s+/)
      .filter((w) => w.length >= 4);

    const matchesCount = words.filter((w) => normalizedReply.includes(w)).length;
    const isConsideredPresent =
      normalizedReply.includes(normalizedPhrase) ||
      (words.length > 0 && matchesCount / words.length >= 0.7);

    if (isConsideredPresent) {
      alreadyPresentPhrases.push(trimmedPhrase);
    } else {
      enforcedPhrases.push(trimmedPhrase);
      phrasesToAppend.push(trimmedPhrase);
    }
  }

  if (phrasesToAppend.length === 0) {
    return {
      text: currentText,
      enforcedPhrases: [],
      alreadyPresentPhrases,
      skippedConflictingPhrases,
    };
  }

  // Anexa as frases obrigatórias que faltavam de forma harmoniosa
  const appendedBlock = phrasesToAppend.join('\n\n');
  const finalText = currentText ? `${currentText}\n\n${appendedBlock}` : appendedBlock;

  return {
    text: finalText,
    enforcedPhrases,
    alreadyPresentPhrases,
    skippedConflictingPhrases,
  };
}

/**
 * Formata as diretrizes da situação ativa para o prompt do agente OpenAI
 */
export function formatSituationDirectivesForPrompt(
  situation: AiSituationRule | null
): string {
  if (!situation) return '';

  const lines: string[] = [
    `\nSITUAÇÃO DETECTADA NO ATENDIMENTO: "${situation.name}"`,
  ];

  if (situation.description) {
    lines.push(`Contexto da situação: ${situation.description}`);
  }

  if (situation.mandatoryPhrases && situation.mandatoryPhrases.length > 0) {
    lines.push('DIRETRIZES OBRIGATÓRIAS (Você DEVE incluir ou transmitir claramente estes pontos na resposta, sempre respeitando as condições reais):');
    situation.mandatoryPhrases.forEach((phrase) => {
      lines.push(`- "${phrase}"`);
    });
  }

  if (situation.preferentialPhrases && situation.preferentialPhrases.length > 0) {
    lines.push('SUGESTÕES PREFERENCIAIS DE COMUNICAÇÃO:');
    situation.preferentialPhrases.forEach((phrase) => {
      lines.push(`- "${phrase}"`);
    });
  }

  if (situation.action === 'handoff_human') {
    lines.push('AÇÃO MANDATÓRIA: Esta situação requer acionamento de atendente humano. Utilize a ferramenta "encaminharParaAtendimentoHumano" e informe o cliente com cordialidade.');
  }

  return lines.join('\n');
}
