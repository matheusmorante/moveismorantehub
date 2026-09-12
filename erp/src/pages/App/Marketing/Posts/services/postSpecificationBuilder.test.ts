import { describe, it, expect } from 'vitest';
import {
  buildSingleSpecification,
  renderSpecificationAsPrompt,
} from './postSpecificationBuilder';

describe('postSpecificationBuilder — Prompt Estruturado de Posts para IA', () => {
  it('deve montar a especificação estruturada de 1 campanha de forma determinística', async () => {
    const mockCampaign: any = {
      id: 'camp-1',
      name: 'Campanha Sofás Premium',
      description: 'Campanha visual focada em sofás e salas',
      instructions: 'Usar luz quente de fim de tarde e piso de madeira',
      active: true,
      formats: ['4:5', '9:16'],
      createdAt: '2026-09-06T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    };

    const mockProduct: any = {
      id: 'prod-123',
      name: 'Sofá Retrátil 3 Lugares',
      price: 2490.0,
      oldPrice: 2990.0,
      opportunityId: null,
      photos: [['photo-1', 'https://example.com/sofa.jpg']],
    };

    const mockModels: any[] = [
      {
        id: 'mod-1',
        elementType: 'TITLE',
        prompt: 'Seu quarto merece o maior conforto',
        instructions: 'Fonte limpa e moderna',
        updatedAt: '2026-09-06T00:00:00Z',
        generationVersion: 1,
      },
      {
        id: 'mod-2',
        elementType: 'PRODUCT_SLOGAN_TITLE',
        prompt: 'O conforto que você sempre sonhou',
        instructions: 'Frase de destaque abaixo do título',
        updatedAt: '2026-09-06T00:00:00Z',
        generationVersion: 1,
      },
      {
        id: 'mod-3',
        elementType: 'PRODUCT_SLOGAN_SIDE',
        prompt: 'Design elegante para o seu ambiente',
        instructions: 'Caligráfico ao lado do móvel com traço amarelo',
        updatedAt: '2026-09-06T00:00:00Z',
        generationVersion: 1,
      },
      {
        id: 'mod-4',
        elementType: 'COLOR_THEME',
        prompt: 'Fundo azul institucional com detalhes em branco e amarelo ouro',
        instructions: 'Estilização e paleta oficial',
        updatedAt: '2026-09-06T00:00:00Z',
        generationVersion: 1,
      },
    ];

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/sofa-retratil',
      campaign: mockCampaign,
      activeModels: mockModels,
      globalRules: 'Regras de marca Móveis Morante',
    });

    spec.product = {
      id: 'prod-123',
      name: 'Sofá Retrátil 3 Lugares',
      price: 2490.0,
      oldPrice: 2990.0,
      installmentText: 'Em até 10x sem juros',
      catalogUrl: 'https://moveismorante.com.br/produto/sofa-retratil',
      photos: ['https://example.com/sofa.jpg'],
    };

    expect(spec.product.name).toBe('Sofá Retrátil 3 Lugares');
    expect(spec.product.price).toBe(2490.0);
    expect(spec.product.oldPrice).toBe(2990.0);
    expect(spec.campaign.name).toBe('Campanha Sofás Premium');

    const renderedPrompt = renderSpecificationAsPrompt(spec);

    expect(renderedPrompt).toContain('MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST');
    expect(renderedPrompt).toContain('AS IMAGENS DO PRODUTO FORNECIDAS ABAIXO SÃO A FONTE VISUAL DE VERDADE');
    expect(renderedPrompt).toContain('ELEMENTO: PRODUCT_SLOGAN_TITLE');
    expect(renderedPrompt).toContain('ELEMENTO: PRODUCT_SLOGAN_SIDE');
    expect(renderedPrompt).toContain('ELEMENTO: COLOR_THEME');
    expect(renderedPrompt).toContain('Design elegante para o seu ambiente');
  });

  it('deve incluir a seção IMAGENS OFICIAIS DO PRODUTO com papéis semânticos e regra de fidelidade', async () => {
    const mockCampaign: any = {
      id: 'camp-padrao',
      name: 'Campanha Padrão',
      elements: [],
    };

    const mockProduct: any = {
      id: 'prod-monza',
      name: 'Guarda-Roupa Monza 4 Portas',
      variations: [
        {
          id: 'var-branco',
          name: 'Branco Neve',
          images: [
            'https://example.com/monza-fechado.jpg',
            'https://example.com/monza-aberto.jpg',
          ],
        },
        {
          id: 'var-freijo',
          name: 'Freijó Natural',
          images: ['https://example.com/monza-freijo.jpg'],
        },
      ],
    };

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/guarda-roupa-monza',
      campaign: mockCampaign,
      activeModels: [],
      globalRules: '',
      product: mockProduct,
    });

    expect(spec.productImages?.primary?.url).toBe('https://example.com/monza-fechado.jpg');
    expect(spec.productImages?.openView?.url).toBe('https://example.com/monza-aberto.jpg');
    expect(spec.productImages?.variations).toHaveLength(1);

    const prompt = renderSpecificationAsPrompt(spec);

    // Regra de fidelidade absoluta
    expect(prompt).toContain('AS IMAGENS DO PRODUTO FORNECIDAS ABAIXO SÃO A FONTE VISUAL DE VERDADE');
    expect(prompt).toContain('Não crie um móvel semelhante.');
    expect(prompt).toContain('A ambientação pode ser criada pela IA.');
    expect(prompt).toContain('O PRODUTO NÃO.');

    // Seção de imagens
    expect(prompt).toContain('IMAGENS OFICIAIS DO PRODUTO');
    expect(prompt).toContain('VARIAÇÃO PRINCIPAL');
    expect(prompt).toContain('Branco Neve');
    expect(prompt).toContain('IMAGEM PRINCIPAL');
    expect(prompt).toContain('https://example.com/monza-fechado.jpg');
    expect(prompt).toContain('IMAGEM SECUNDÁRIA');
    expect(prompt).toContain('https://example.com/monza-aberto.jpg');
    expect(prompt).toContain('pode ser o móvel aberto');
    expect(prompt).toContain('flutuando, sem borda');
    expect(prompt).toContain('VARIAÇÕES DISPONÍVEIS');
    expect(prompt).toContain('Freijó Natural');
    expect(prompt).toContain('https://example.com/monza-freijo.jpg');
    expect(prompt).toContain('borda branca SOMENTE');
    expect(prompt).toContain('FIDELIDADE VISUAL OBRIGATÓRIA');
  });

  it('ao trocar de produto, recompõe completamente as imagens do novo produto', async () => {
    const mockCampaign: any = { id: 'camp-1', name: 'Campanha Padrão', elements: [] };

    const prodA: any = {
      id: 'prod-a',
      name: 'Sofá A',
      variations: [{ id: 'va', name: 'Couro Preto', images: ['https://example.com/sofa-a.jpg'] }],
    };

    const prodB: any = {
      id: 'prod-b',
      name: 'Cama B',
      variations: [{ id: 'vb', name: 'Linho Bege', images: ['https://example.com/cama-b.jpg'] }],
    };

    const specA = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/sofa-a',
      campaign: mockCampaign,
      activeModels: [],
      globalRules: '',
      product: prodA,
    });

    const specB = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/cama-b',
      campaign: mockCampaign,
      activeModels: [],
      globalRules: '',
      product: prodB,
    });

    expect(specA.productImages?.primary?.url).toBe('https://example.com/sofa-a.jpg');
    expect(specB.productImages?.primary?.url).toBe('https://example.com/cama-b.jpg');
    expect(specB.productImages?.primary?.url).not.toBe(specA.productImages?.primary?.url);
  });

  it('deve proibir expressamente galeria de cores e variações fictícias quando o produto tiver apenas 1 variação', async () => {
    const mockCampaign: any = {
      id: 'camp-1',
      name: 'Campanha Padrão',
      elements: [],
    };

    const mockActiveModels: any[] = [
      {
        id: 'mod-ref',
        elementType: 'POST_REFERENCE',
        prompt: 'Seguir referência',
        referenceFiles: [],
      },
    ];

    const singleVarProduct: any = {
      id: 'prod-single',
      name: 'Mesa de Centro Rústica',
      variations: [{
        id: 'var-1',
        name: 'Madeira Natural',
        images: ['https://example.com/mesa.jpg'],
      }],
    };

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/mesa-centro',
      campaign: mockCampaign,
      activeModels: mockActiveModels,
      globalRules: '',
      product: singleVarProduct,
    });

    const prompt = renderSpecificationAsPrompt(spec);

    // Deve conter instrução de produto de cor única
    expect(prompt).toContain('PRODUTO DE COR ÚNICA (SEM OUTRAS VARIAÇÕES DISPONÍVEIS)');
    expect(prompt).toContain('É ESTRITAMENTE PROIBIDO criar galeria de cores, miniaturas adicionais ou escrever "DISPONÍVEL NAS CORES"');
    expect(prompt).toContain('PRODUTO DE COR ÚNICA (SEM OUTRAS CORES)');
    expect(prompt).toContain('OMITA integralmente a galeria de cores');

    // Não deve conter instrução ativa de galeria nem citar que há variações complementares
    expect(prompt).not.toContain('VARIAÇÕES DISPONÍVEIS (DEMAIS OPÇÕES DE CORES)');
    expect(prompt).not.toContain('Galeria secundária de cores: apresente EXCLUSIVAMENTE');
  });

  it('deve proibir expressamente efeito de esfumaçado branco, glow ou halo ao redor do móvel', async () => {
    const mockCampaign: any = { id: 'camp-1', name: 'Campanha Padrão', elements: [] };
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://moveismorante.com.br/produto/mesa-centro',
      campaign: mockCampaign,
      activeModels: [],
      globalRules: '',
    });

    const prompt = renderSpecificationAsPrompt(spec);

    expect(prompt).toContain('É TERMINANTEMENTE PROIBIDO criar esfumaçado branco, névoa, glow, halo de luz');
    expect(prompt).toContain('Proibição de esfumaçado ou halo luminoso');
    expect(prompt).not.toContain('luz de recorte (rim light)');
  });
});
