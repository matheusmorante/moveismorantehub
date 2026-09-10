import { AiGateway } from '@/services/aiGateway/AiGateway';

export interface HtmlPostThemeStyle {
  titleColor: string;
  titleGlow?: string;
  priceCardBg: string;
  priceCardBorder: string;
  priceTextColor: string;
  priceOldTextColor: string;
  installmentTextColor: string;
  sloganColor: string;
  benefitsTextColor: string;
  cardBorderColor: string;
  backgroundLightingOverlay?: string;
  contrastGrade: string;
  rationale?: string;
}

export const DEFAULT_THEME_STYLE: HtmlPostThemeStyle = {
  titleColor: '#F7B731', // Amarelo ouro vibrante institucional
  titleGlow: '0 2px 8px rgba(0,0,0,0.8)',
  priceCardBg: 'linear-gradient(135deg, #001f35 0%, #002B49 100%)', // Azul institucional sofisticado com borda e destaque amarelo
  priceCardBorder: 'rgba(247, 183, 49, 0.6)',
  priceTextColor: '#F7B731', // Amarelo vibrante de alto destaque
  priceOldTextColor: '#94a3b8',
  installmentTextColor: '#ffffff', // Branco puro
  sloganColor: '#ffffff', // Branco elegante de alto contraste
  benefitsTextColor: '#F7B731', // Amarelo ouro
  cardBorderColor: '#ffffff', // Borda branca sólida solicitada pelo usuário
  backgroundLightingOverlay: 'radial-gradient(ellipse at center, rgba(247,183,49,0.3) 0%, rgba(0,43,73,0.3) 60%, transparent 85%)',
  contrastGrade: 'WCAG_AAA (Padrão Azul Institucional + Amarelo & Branco)',
  rationale: 'Paleta oficial institucional da Móveis Morante: fundo azul escuro com tipografia branca e amarelo ouro.',
};

export const WHITE_STUDIO_THEME_STYLE: HtmlPostThemeStyle = {
  titleColor: '#1e3a8a', // Azul royal escuro de alto contraste
  titleGlow: 'none',
  priceCardBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', // Vermelho varejo vibrante
  priceCardBorder: 'rgba(220, 38, 38, 0.8)',
  priceTextColor: '#ffffff',
  priceOldTextColor: '#fecaca',
  installmentTextColor: '#ffffff',
  sloganColor: '#1e293b', // Grafite escuro caligráfico elegante
  benefitsTextColor: '#334155', // Slate escuro legível
  cardBorderColor: '#ffffff', // Borda branca sólida
  backgroundLightingOverlay: 'none',
  contrastGrade: 'WCAG_AAA (Fundo Branco Limpo)',
  rationale: 'Tipografia escura e card de preço contrastante sobre fundo branco puro.',
};

interface HarmonizeParams {
  productName: string;
  category?: string;
  opportunityName?: string;
  hasCustomBackground?: boolean;
  isWhiteBackground?: boolean;
}

export async function harmonizePostStylesWithGeminiFlash(
  params: HarmonizeParams
): Promise<HtmlPostThemeStyle> {
  const { productName, category = 'Móvel', opportunityName, hasCustomBackground, isWhiteBackground } = params;

  const bgDescription = isWhiteBackground
    ? 'um fundo branco puro (#ffffff) limpo e minimalista de estúdio fotográfico'
    : hasCustomBackground
    ? 'uma imagem fotográfica de showroom contemporâneo com piso e parede'
    : 'um estúdio sofisticado com tons escuros institucionais (grafite, amadeirado escuro e iluminação âmbar)';

  const prompt = `Você é um Diretor de Arte e Especialista em Cores & Tipografia Publicitária.
O sistema renderiza um post comercial de varejo de móveis em HTML/CSS para Instagram (formato 4:5 ou 9:16).
O fundo do post é ${bgDescription}.
O produto é: "${productName}" (Categoria: ${category}).
${opportunityName ? `Campanha Comercial ativa: "${opportunityName}".` : 'Sem campanha de oportunidade restritiva.'}

OBJETIVO:
Gere uma estilização CSS dos elementos HTML com CONTRASTE PERFEITO (legibilidade comercial máxima, sem elementos sumindo no fundo).
REGRAS OBRIGATÓRIAS:
- Identidade visual da Móveis Morante: fundo azul institucional (#002B49), textos em branco puro (#ffffff) e detalhes/título/destaques em amarelo ouro (#F7B731).
- Somente as miniaturas das variações adicionais devem manter cardBorderColor: "#ffffff" (borda branca pura sólida). A imagem principal e a imagem secundária da Variação 1 ficam sem borda.
- O bloco de preço deve ser vibrante, de varejo premium e chamativo (fundo azul institucional ou gradiente escuro com texto e valores em amarelo e branco).
- Se o fundo for branco puro (#ffffff), o título, slogan e textos devem ter tons escuros (ex: azul marinho escuro #002B49, preto grafite) para manter contraste total.
- Se o fundo for azul/escuro, o slogan deve ser branco puro (#ffffff), o título amarelo ouro (#F7B731) e o preço em amarelo vibrante.

Retorne ESTRITAMENTE um JSON no seguinte formato (sem markdown em volta):
{
  "titleColor": "#hex",
  "titleGlow": "css text-shadow",
  "priceCardBg": "css background gradient or solid",
  "priceCardBorder": "css border rgba",
  "priceTextColor": "#hex",
  "priceOldTextColor": "#hex",
  "installmentTextColor": "#hex",
  "sloganColor": "#hex",
  "benefitsTextColor": "#hex",
  "cardBorderColor": "#ffffff",
  "contrastGrade": "ex: Alto Contraste Ouro/Rubi",
  "rationale": "breve justificativa da combinação de cores em 1 frase"
}`;

  const defaultFallback = isWhiteBackground ? WHITE_STUDIO_THEME_STYLE : DEFAULT_THEME_STYLE;

  try {
    const response = await AiGateway.requestText({
      operation: 'marketing_post_color_harmonization',
      payload: prompt,
    });

    if (!response.success || !response.data) {
      return defaultFallback;
    }

    const cleanJson = response.data
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      titleColor: parsed.titleColor || defaultFallback.titleColor,
      titleGlow: parsed.titleGlow || defaultFallback.titleGlow,
      priceCardBg: parsed.priceCardBg || defaultFallback.priceCardBg,
      priceCardBorder: parsed.priceCardBorder || defaultFallback.priceCardBorder,
      priceTextColor: parsed.priceTextColor || defaultFallback.priceTextColor,
      priceOldTextColor: parsed.priceOldTextColor || defaultFallback.priceOldTextColor,
      installmentTextColor: parsed.installmentTextColor || defaultFallback.installmentTextColor,
      sloganColor: parsed.sloganColor || defaultFallback.sloganColor,
      benefitsTextColor: parsed.benefitsTextColor || defaultFallback.benefitsTextColor,
      cardBorderColor: '#ffffff', // Força borda branca sempre conforme regra do usuário
      backgroundLightingOverlay: defaultFallback.backgroundLightingOverlay,
      contrastGrade: parsed.contrastGrade || 'Contraste Otimizado por Gemini Flash',
      rationale: parsed.rationale || 'Cores harmonizadas para contraste máximo com o cenário.',
    };
  } catch (err) {
    console.warn('[postHtmlStyleOptimizer] Fallback para paleta de contraste:', err);
    return defaultFallback;
  }
}
