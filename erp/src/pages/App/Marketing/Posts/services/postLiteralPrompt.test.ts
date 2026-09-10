import { describe, expect, it } from 'vitest';
import { buildSingleSpecification, renderSpecificationAsPrompt } from './postSpecificationBuilder';

const campaign: any = { id: 'campaign', name: 'Campanha', active: true };

describe('prompt final — fatos literais do produto e benefícios', () => {
  it('preserva quatro benefícios sem inventar, reordenar ou duplicar', async () => {
    const product = {
      id: 'p1', name: 'Produto Exato', unitPrice: 1000,
      benefits: [
        { id: 'one', title: 'Benefício Um', subtitle: 'Detalhe Um' },
        { id: 'two', title: 'Benefício Dois' },
        { id: 'three', title: 'Benefício Três', subtitle: 'Detalhe Três' },
        { id: 'four', title: 'Benefício Quatro', subtitle: 'Detalhe Quatro' },
      ],
    };
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/produto-exato',
      campaign, activeModels: [], globalRules: '', product,
    });
    const prompt = renderSpecificationAsPrompt(spec);

    expect(prompt).toContain('Quantidade exata: 4');
    expect(prompt.indexOf('Benefício Um')).toBeLessThan(prompt.indexOf('Benefício Dois'));
    expect(prompt.indexOf('Benefício Dois')).toBeLessThan(prompt.indexOf('Benefício Três'));
    expect(prompt.indexOf('Benefício Três')).toBeLessThan(prompt.indexOf('Benefício Quatro'));
    for (const value of ['Benefício Um', 'Benefício Dois', 'Benefício Três', 'Benefício Quatro']) {
      expect(prompt.match(new RegExp(value, 'g'))).toHaveLength(1);
    }
    expect(prompt).not.toContain('Entrega Rápida');
    expect(prompt).toContain('NÃO invente benefícios');
    expect(prompt).toContain('NÃO substitua, resuma, complete, corrija, traduza ou reescreva');
  });

  it('omite o rodapé quando a lista estruturada está vazia', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/sem-beneficios',
      campaign, activeModels: [], globalRules: '',
      product: { id: 'p2', name: 'Sem benefícios', unitPrice: 900, benefits: [] },
    });
    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('Quantidade exata: 0');
    expect(prompt).toContain('OMITA integralmente o rodapé de benefícios');
    expect(prompt).not.toContain('Entrega Rápida');
  });

  it('mantém preço anterior, atual, parcelamento e medidas nos campos corretos', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/sofa-exato',
      campaign, activeModels: [], globalRules: '', selectedVariationId: 'v2',
      product: {
        id: 'p3', name: 'Sofá Pai', unitPrice: 3000,
        variations: [{
          id: 'v2', title: 'Sofá Exato Linho', unitPrice: 2599.9, promoPrice: 2199.9,
          installmentText: '10x de R$ 219,99 sem juros', width: 210, height: 95, depth: 110,
        }],
      },
    });
    const prompt = renderSpecificationAsPrompt(spec);

    expect(prompt).toContain('https://www.moveismorante.com.br/produto/sofa-exato');
    expect(prompt).toContain('| Preço anterior/de referência (riscar) | R$ 2.599,90 |');
    expect(prompt).toContain('| Preço atual/promocional (destacar) | R$ 2.199,90 |');
    expect(prompt).toContain('| Condição/parcelamento | 10x de R$ 219,99 sem juros |');
    expect(prompt).toContain('| Largura | 210 |');
    expect(prompt).toContain('NUNCA troque os dois');
    expect(prompt).toContain('NÃO obtenha imagens por esse link');
  });

  it('não inventa preço anterior nem parcelamento quando ausentes', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/preco-unico',
      campaign, activeModels: [], globalRules: '',
      product: { id: 'p4', name: 'Preço Único', unitPrice: 799.5 },
    });
    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('| Preço atual/promocional (destacar) | R$ 799,50 |');
    expect(prompt).not.toContain('| Preço anterior/de referência (riscar) |');
    expect(prompt).not.toContain('| Condição/parcelamento |');
    expect(prompt).toContain('Se um campo não existir na página nem no fallback literal abaixo, omita');
  });
});
