import type { AiKnowledgeArticle } from '../../settings/types.js';
import { DEFAULT_KNOWLEDGE_ARTICLES } from '../../../../../../shared-utils/whatsappAiAgentSchemas.js';
import { normalizeRuleText } from './whatsappAiRuleEngine.js';

export const SITUATION_CATEGORY_AFFINITY: Record<string, string> = {
  consulta_formas_pagamento: 'pagamentos',
  duvida_entrega: 'politica_entrega',
  duvida_montagem: 'politica_montagem',
  reclamacao_avaria: 'garantia',
  horario_localizacao: 'loja_horarios',
  orcamento_produto: 'faq',
};

/**
 * Seleciona os artigos da base de conhecimento mais relevantes para a mensagem do cliente
 * e para a situação identificada.
 */
export function retrieveRelevantKnowledge(
  userText: string,
  situationKey: string | null = null,
  articles: readonly AiKnowledgeArticle[] = DEFAULT_KNOWLEDGE_ARTICLES,
  maxArticles = 3
): AiKnowledgeArticle[] {
  if (!Array.isArray(articles) || articles.length === 0) {
    return [];
  }

  const activeArticles = articles.filter((a) => a.active !== false);
  if (activeArticles.length === 0) {
    return [];
  }

  const normalizedQuery = normalizeRuleText(userText || '');
  const preferredCategory = situationKey ? SITUATION_CATEGORY_AFFINITY[situationKey] : null;

  const scoredArticles = activeArticles.map((article) => {
    let score = (article.priority ?? 5) * 0.5; // Base pela prioridade (0.5 a 5.0)

    // Afinidade direta com a situação identificada
    if (preferredCategory && article.category === preferredCategory) {
      score += 10;
    }

    // Coincidência com palavras-chave do artigo
    if (normalizedQuery && Array.isArray(article.keywords)) {
      for (const kw of article.keywords) {
        const normalizedKw = normalizeRuleText(kw);
        if (normalizedKw && normalizedQuery.includes(normalizedKw)) {
          score += 3;
        }
      }
    }

    // Coincidência no título
    if (normalizedQuery && normalizeRuleText(article.title).split(/\s+/).some((w) => w.length > 3 && normalizedQuery.includes(w))) {
      score += 2;
    }

    return { article, score };
  });

  // Ordena por score decrescente
  scoredArticles.sort((a, b) => b.score - a.score);

  // Retorna os top N que tenham relevância mínima
  return scoredArticles.slice(0, maxArticles).map((item) => item.article);
}

/**
 * Formata os artigos de conhecimento oficiais para o prompt do agente OpenAI
 */
export function formatKnowledgeForPrompt(articles: readonly AiKnowledgeArticle[]): string {
  if (!articles || articles.length === 0) {
    return '';
  }

  const blocks: string[] = [
    '\n--- BASE DE CONHECIMENTO OFICIAL (POLÍTICAS E DADOS CONFIÁVEIS DA MÓVEIS MORANTE) ---',
    'DIRETRIZ CRÍTICA DE PRIORIDADE DE FONTES:',
    '1. A Base de Conhecimento fornece políticas institucionais estáveis (garantia, montagem própria, horário e regras gerais de parcelamento).',
    '2. A Base de Conhecimento NÃO contém e NUNCA substitui dados de produtos individuais, preços de venda dinâmicos, saldos de estoque ou status de pedidos.',
    '3. Preços de venda, promoções, medidas de modelos e disponibilidade DEVEM ser consultados exclusivamente via ferramentas do ERP (buscarProdutos, obterDetalhesProduto).',
    '4. NUNCA invente preços, descontos individuais ou estoque que não venham diretamente do retorno das ferramentas.',
    '\nPolíticas Oficiais:',
  ];

  articles.forEach((art, index) => {
    blocks.push(
      `[Artigo ${index + 1} - ${art.title} (v${art.version})]:\n${art.content}`
    );
  });

  blocks.push('--- FIM DA BASE DE CONHECIMENTO OFICIAL ---\n');

  return blocks.join('\n');
}
