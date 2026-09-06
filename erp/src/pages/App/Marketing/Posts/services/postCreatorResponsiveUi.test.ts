import { describe, expect, it } from 'vitest';
import { buildSingleSpecification, renderSpecificationAsPrompt } from './postSpecificationBuilder';
import { PostCampaign, PostFormat, ElementModel } from '../types/postCreator';

describe('PostCreator Responsive UI Logic & Grouping Integrity', () => {
  const dummyCampaign: PostCampaign = {
    id: 'camp-1',
    name: 'Campanha de Teste',
    description: 'Campanha de demonstração',
    active: true,
    prompt: 'Instruções de teste',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const dummyProduct: any = {
    id: 'prod-123',
    name: 'Guarda Roupa Prime 6 Portas',
    slug: 'guarda-roupa-prime-6-portas',
    active: true,
    description: 'Guarda roupa espaçoso',
    product_images: [
      { id: 'img-1', url: 'https://exemplo.com/prime.jpg', is_primary: true },
      { id: 'img-2', url: 'https://exemplo.com/prime-aberto.jpg', tag: 'interior' },
    ],
    product_variations: [
      { id: 'var-1', name: 'Branco', product_images: [{ id: 'img-1', url: 'https://exemplo.com/prime.jpg' }] },
      { id: 'var-2', name: 'Freijó', product_images: [{ id: 'img-3', url: 'https://exemplo.com/prime-freijo.jpg' }] },
    ],
  };

  it('preserves prompt generation integrity across official formats', async () => {
    const spec = await buildSingleSpecification({
      campaign: dummyCampaign,
      product: dummyProduct,
      activeModels: [],
    });

    expect(spec.formats).toBeDefined();
    expect(spec.formats.length).toBeGreaterThanOrEqual(2);
    expect(spec.formats.some(f => f.aspectRatio === '4:5')).toBe(true);
    expect(spec.formats.some(f => f.aspectRatio === '9:16')).toBe(true);
    expect(spec.officialAssets?.logo?.url).toBe('https://www.moveismorante.com.br/logo-morante.png');

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('4:5');
    expect(prompt).toContain('9:16');
  });

  it('accurately distinguishes opportunity badges: not applicable when product has no opportunity', async () => {
    const badgeModel: ElementModel = {
      id: 'badge-salvados',
      elementType: 'BADGE',
      name: 'Selo Queima dos Salvados',
      opportunityId: 'opp-salvados',
      generatedAssetUrl: 'https://exemplo.com/selo.png',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    // Sem oportunidade
    const specSemOpp = await buildSingleSpecification({
      campaign: dummyCampaign,
      product: dummyProduct,
      activeModels: [badgeModel],
    });

    expect(specSemOpp.officialAssets?.badge).toBeNull();
    const promptSemOpp = renderSpecificationAsPrompt(specSemOpp);
    expect(promptSemOpp).not.toContain('Selo Queima dos Salvados');

    // Com oportunidade correspondente
    const prodComOpp = { ...dummyProduct, opportunity_id: 'opp-salvados' };
    const specComOpp = await buildSingleSpecification({
      campaign: dummyCampaign,
      product: prodComOpp,
      activeModels: [badgeModel],
    });

    expect(specComOpp.officialAssets?.badge?.url).toBe('https://exemplo.com/selo.png');
    const promptComOpp = renderSpecificationAsPrompt(specComOpp);
    expect(promptComOpp).toContain('SELO OFICIAL (OPORTUNIDADE):');
  });

  it('groups elements into coherent visual categories for the element library without mutating element types', () => {
    const ELEMENT_GROUPS: Array<{
      title: string;
      types: string[];
    }> = [
      { title: 'Conteúdo Textual', types: ['TITLE', 'PRODUCT_NAME', 'PRODUCT_SLOGAN', 'COMPANY_SLOGAN'] },
      { title: 'Comercial & Vendas', types: ['PRICE', 'OLD_PRICE', 'INSTALLMENTS', 'BADGE'] },
      { title: 'Visual & Marca', types: ['BACKGROUND', 'LOGO', 'HEADER', 'FOOTER'] },
      { title: 'Estrutura do Produto', types: ['OPEN_VIEW', 'VARIATION_GALLERY'] },
      { title: 'Chamada para Ação', types: ['CTA'] },
    ];

    const allTypes = ELEMENT_GROUPS.flatMap(g => g.types);
    expect(allTypes).toContain('TITLE');
    expect(allTypes).toContain('PRICE');
    expect(allTypes).toContain('LOGO');
    expect(allTypes).toContain('OPEN_VIEW');
    expect(allTypes).toContain('CTA');
    expect(new Set(allTypes).size).toBe(allTypes.length); // no duplicates
  });
});
