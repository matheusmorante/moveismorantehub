import { describe, it, expect } from 'vitest';
import { renderSpecificationAsPrompt, buildSingleSpecification } from './postSpecificationBuilder';
import { GLOBAL_ART_DIRECTION_SECTION } from './postArtDirectionGuidelines';
import { PostCampaign } from '../types/postCreator';

describe('postArtDirectionGuidelines — Direção de Arte Global e Anti-Simplicidade', () => {
  const mockCampaign: PostCampaign = {
    id: 'camp-padrao',
    name: 'Campanha Varejo Premium',
    description: 'Campanha de marketing promocional',
    instructions: 'Siga a paleta de cores institucional.',
    aspectRatio: '4:5',
    active: true,
    created_at: '',
    updated_at: '',
  };

  const mockProduct = {
    id: 'prod-sofa',
    name: 'Sofá Retrátil 3 Lugares Confort',
    price: 1899.9,
    catalogUrl: 'https://moveismorante.com.br/produto/sofa-retratil-3-lugares',
    images: ['https://example.com/sofa-fechado.jpg'],
  };

  it('deve incluir a seção DIREÇÃO DE ARTE OBRIGATÓRIA no prompt final', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: mockProduct.catalogUrl,
      campaign: mockCampaign,
      activeModels: [],
      globalRules: 'Regras da marca',
      product: mockProduct,
    });

    const prompt = renderSpecificationAsPrompt(spec);

    // 1. Direção de Arte Obrigatória presente
    expect(prompt).toContain('DIREÇÃO DE ARTE OBRIGATÓRIA (QUALIDADE PUBLICITÁRIA PREMIUM)');
    expect(prompt).toContain('Crie uma peça publicitária visualmente rica, profissional e sofisticada');
    expect(prompt).toContain('O resultado NÃO deve parecer uma montagem simples de catálogo');

    // 2. Separação explícita de conceitos
    expect(prompt).toContain('AS IMAGENS DO PRODUTO FORNECIDAS ABAIXO SÃO A FONTE VISUAL DE VERDADE');
    expect(prompt).toContain('Separar conceitos: Fidelidade do Produto (estritamente fiel às fotos reais) vs. Direção de Arte');

    // 3. Ambientação inteligente
    expect(prompt).toContain('Ambientação comercial realista e elegante relacionada ao ambiente de uso do móvel');
    expect(prompt).toContain('Sofá: sala de estar elegante e acolhedora');

    // 4. Hierarquia visual comercial
    expect(prompt).toContain('HIERARQUIA VISUAL COMERCIAL (ORDEM DE ATENÇÃO):');
    expect(prompt).toContain('1. PRODUTO (Protagonista absoluto da peça)');
    expect(prompt).toContain('2. OFERTA / PREÇO');

    // 5. Identidade da marca Móveis Morante
    expect(prompt).toContain('IDENTIDADE VISUAL E PALETA DE CORES OBRIGATÓRIA DA MÓVEIS MORANTE:');
    expect(prompt).toContain('AZUL ESCURO (#002B49)');
    expect(prompt).toContain('AMARELO OURO (#F7B731 / #FFC107)');
    expect(prompt).toContain('BRANCO (#FFFFFF)');
    expect(prompt).toContain('Fundo do container/bloco de preço');
    expect(prompt).toContain('Fundo do rodapé contínuo');

    // 6. Anti-Simplicidade (proibição de montagem simplista de catálogo)
    expect(prompt).toContain('ANTI-SIMPLICIDADE (RESULTADO INSUFICIENTE PROIBIDO):');
    expect(prompt).toContain('Não produza uma composição semelhante a:');
    expect(prompt).toContain('produto recortado + fundo branco/liso + caixa branca simples + preço');

    // 7. Referência de qualidade
    expect(prompt).toContain('REFERÊNCIA DE QUALIDADE:');
    expect(prompt).toContain('Campanha publicitária premium de varejo de móveis para redes sociais');

    // 8. Regra Crítica de Grounding Visual (ancoragem como referência direta)
    expect(prompt).toContain('REGRA CRÍTICA — ANCORAGEM OBRIGATÓRIA DAS REFERÊNCIAS VISUAIS');
    expect(prompt).toContain('As imagens identificadas DEVEM ser efetivamente anexadas e utilizadas como REFERÊNCIAS VISUAIS DIRETAS');
    expect(prompt).toContain('É expressamente PROIBIDO gerar a arte apenas a partir de uma descrição textual');
    expect(prompt).toContain('Se o pacote contém um guarda-roupa, uma geração contendo relógio, carteira, sofá ou qualquer outro produto diferente é uma falha crítica');

    // 9. Fluxo Contínuo Direto (sem perguntar formato)
    expect(prompt).toContain('FORMATO PADRÃO SOLICITADO: FEED (Aspect Ratio 4:5 — 1080 × 1350)');
    expect(prompt).toContain('FLUXO CONTÍNUO EM UMA ÚNICA ETAPA:');
    expect(prompt).toContain('NÃO pare a execução para perguntar qual formato deseja');
  });

  it('deve restringir benefícios apenas aos autorizados e proibir expressamente slogans e rótulos genéricos', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: mockProduct.catalogUrl,
      campaign: mockCampaign,
      activeModels: [],
      globalRules: 'Regras da marca',
      product: mockProduct,
    });

    const prompt = renderSpecificationAsPrompt(spec);

    // 1. Benefícios comerciais reais autorizados
    expect(prompt).toContain('DIFERENCIAIS E BENEFÍCIOS COMERCIAIS');
    expect(prompt).toContain('Entrega Rápida');
    expect(prompt).toContain('1 a 5 dias úteis');
    expect(prompt).toContain('Montagem Inclusa');
    expect(prompt).toContain('Retirada ou Entrega');
    expect(prompt).toContain('Compra Segura');
    expect(prompt).toContain('Pague na Entrega');

    // 2. Conteúdo literal separado da liberdade visual dos ícones
    expect(prompt).toContain('CONTEÚDO LITERAL OBRIGATÓRIO — BENEFÍCIOS DO RODAPÉ');
    expect(prompt).toContain('LIBERDADE VISUAL LIMITADA');
    expect(prompt).toContain('A IA pode organizar visualmente os itens e desenhar ícones coerentes');

    // 3. Proibição expressa de clichês, frases genéricas e slogans vazios
    expect(prompt).toContain('TEXTOS, SLOGANS E RÓTULOS GENÉRICOS EXPRESSAMENTE PROIBIDOS:');
    expect(prompt).toContain('mais espaço para o seu dia a dia');
    expect(prompt).toContain('design moderno e elegante');
    expect(prompt).toContain('qualidade e durabilidade');
    expect(prompt).toContain('mais organização para o seu dia');
    expect(prompt).toContain('material de qualidade');
    expect(prompt).toContain('amplo espaço interno');
  });
});
