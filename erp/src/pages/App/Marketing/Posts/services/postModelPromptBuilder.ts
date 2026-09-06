export interface ProductPromptContext {
  name: string;
  price: string;
  oldPrice?: string;
  installment?: string;
  opportunity?: string;
  category?: string;
  description?: string;
  aspectRatio?: string;
}

export function assertNoUnresolvedPlaceholders(text: string): void {
  const unresolved = text.match(/{{[\s\S]*?}}/g);
  if (unresolved && unresolved.length > 0) {
    throw new Error(
      `Existem variáveis não resolvidas no prompt: ${unresolved.join(', ')}`
    );
  }
}

export function resolveOpportunityRules(opportunityName?: string): {
  normalized: string;
  allowedTerms: string[];
  strictlyProhibitedTerms: string[];
  instruction: string;
} {
  const raw = (opportunityName || '').trim();
  const isQueima = /queima|salvados/i.test(raw);
  const isUltimaUnidade = /última\s+unidade|ultimas?\s+unidades?/i.test(raw);
  const isLiquidacao = /liquida[çc][ãa]o/i.test(raw);

  if (isQueima) {
    return {
      normalized: 'QUEIMA_DOS_SALVADOS',
      allowedTerms: ['Queima dos Salvados', 'Queima'],
      strictlyProhibitedTerms: [
        'Última unidade',
        'Últimas unidades',
        'Ultima unidade',
        'Liquidação',
        'Liquidacao',
      ],
      instruction:
        'OPORTUNIDADE EXCLUSIVA: QUEIMA DOS SALVADOS. Use exclusivamente o selo oficial e a linguagem visual da Queima dos Salvados. É EXPRESSAMENTE PROIBIDO escrever ou sugerir "Última unidade", "Últimas unidades" ou "Liquidação". Nunca misture identidades de campanhas.',
    };
  }

  if (isUltimaUnidade) {
    return {
      normalized: 'ULTIMA_UNIDADE',
      allowedTerms: ['Última Unidade'],
      strictlyProhibitedTerms: ['Queima dos Salvados', 'Liquidação', 'Liquidacao'],
      instruction:
        'OPORTUNIDADE EXCLUSIVA: ÚLTIMA UNIDADE. Use somente a linguagem de última unidade. É expressamente proibido citar "Queima dos Salvados" ou "Liquidação".',
    };
  }

  if (isLiquidacao) {
    return {
      normalized: 'LIQUIDACAO',
      allowedTerms: ['Liquidação'],
      strictlyProhibitedTerms: ['Queima dos Salvados', 'Última unidade', 'Últimas unidades'],
      instruction:
        'OPORTUNIDADE EXCLUSIVA: LIQUIDAÇÃO. Use somente linguagem de liquidação. É expressamente proibido citar "Queima dos Salvados" ou "Última unidade".',
    };
  }

  return {
    normalized: 'SEM_OPORTUNIDADE',
    allowedTerms: [],
    strictlyProhibitedTerms: [
      'Queima dos Salvados',
      'Última unidade',
      'Últimas unidades',
      'Liquidação',
    ],
    instruction:
      'NENHUMA OPORTUNIDADE SELECIONADA. Não exiba nenhum selo de campanha nem chamadas como "Queima dos Salvados", "Última unidade" ou "Liquidação".',
  };
}

export function interpolateTemplatePrompt(rawPrompt: string, context: ProductPromptContext): string {
  let resolved = rawPrompt;

  const map: Record<string, string> = {
    'product.name': context.name || '',
    'product.price': context.price || '',
    'product.oldPrice': context.oldPrice || '',
    'product.installment': context.installment || '',
    'product.opportunity': context.opportunity || '',
    'product.category': context.category || '',
    'product.description': context.description || '',
    'template.aspectRatio': context.aspectRatio || '4:5',
  };

  for (const [key, value] of Object.entries(map)) {
    const regex = new RegExp(`{{\\s*${key.replace('.', '\\.')}\\s*}}`, 'gi');
    resolved = resolved.replace(regex, value);
  }

  // Remove espaços redundantes caso oldPrice esteja vazio
  resolved = resolved.replace(/\s{2,}/g, ' ').trim();

  return resolved;
}

export const ANTI_HALLUCINATION_COMMERCIAL_RULES = `
REGRA GLOBAL ANTI-ALUCINAÇÃO DE CÓPIA COMERCIAL:
Do not invent any promotional claims or commercial text.
Only render commercial text explicitly supplied in the structured data or required by an attached official asset.
Você NÃO PODE inventar:
- Promoção
- Última unidade / Últimas unidades
- Oferta imperdível
- Compre agora! / Garanta já!
- Frete grátis
- À vista
- Porcentagens (%)
- Prazos
- Estoque
- Descontos
- Condições comerciais
- Chamadas promocionais extras
Use somente textos comerciais fornecidos pelo sistema.
`.trim();
