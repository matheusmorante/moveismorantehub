import { describe, it, expect } from 'vitest';
import {
  buildPublishedCatalogEditConfirmationMessage,
  checkERPLegibility,
  checkEcomLegibility,
  getPublishedCatalogEditIssues,
} from './productLegibilityRules';
import Product from '@/pages/types/product.type';

describe('productLegibilityRules (Domínio Puro)', () => {
  it.each(['AB', 'Mesa de Jantar'])('aprova o nome preenchido no cadastro geral: %s', (name) => {
    const result = checkERPLegibility({
      name,
      description: '',
      categoryIds: ['cat-teste'],
      mainSupplierId: 'fornecedor-teste',
      unitPrice: 100,
    });
    expect(result.checks.description).toBe(true);
    expect(result.isLegible).toBe(true);
  });

  it.each(['', ' ', 'A', ' A '])(
    'reprova nome inválido mesmo com descrição preenchida: %s',
    (name) => {
      const result = checkERPLegibility({ name, description: 'Descrição da nota fiscal' });
      expect(result.checks.description).toBe(false);
      expect(result.errors).toContain(
        'Nome do Produto (Interno) deve ter pelo menos 2 caracteres.'
      );
    }
  );

  it('atualiza a conformidade ao preencher e apagar o nome', () => {
    const data = { name: '', description: '' };
    expect(checkERPLegibility(data).checks.description).toBe(false);
    data.name = 'Mesa';
    expect(checkERPLegibility(data).checks.description).toBe(true);
    data.name = '';
    expect(checkERPLegibility(data).checks.description).toBe(false);
  });

  it('deve reprovar produto ERP sem descrição, categoria ou fornecedor', () => {
    const product: Partial<Product> = {
      description: '',
      categoryIds: [],
      mainSupplierId: '',
    };
    const result = checkERPLegibility(product);
    expect(result.isLegible).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('deve aprovar produto ERP completo com variações', () => {
    const product: Partial<Product> = {
      description: 'Mesa de Jantar Dora',
      categoryIds: ['cat-123'],
      mainSupplierId: 'supp-456',
      hasVariations: true,
      variations: [
        {
          id: 'var-1',
          name: 'Mesa Dora Amêndoa',
          stock: 5,
          unitPrice: 890,
          active: true,
          attributes: [],
        } as any,
      ],
    };
    const result = checkERPLegibility(product);
    expect(result.isLegible).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.checks.description).toBe(true);
    expect(result.checks.categories).toBe(true);
    expect(result.checks.supplier).toBe(true);
    expect(result.checks.origin).toBe(true);
  });

  it('deve reprovar ativação no ERP se produto tiver origem salvado', () => {
    const product: Partial<Product> = {
      name: 'Mesa Salvada',
      categoryIds: ['cat-123'],
      mainSupplierId: 'supp-456',
      unitPrice: 500,
      productKind: 'salvado',
    };
    const result = checkERPLegibility(product);
    expect(result.isLegible).toBe(false);
    expect(result.checks.origin).toBe(false);
    expect(result.errors).toContain(
      'Origem do estoque deve ser Convencional (produtos com origem diferente de Convencional não podem ser ativados no ERP).'
    );
  });

  it('deve validar requisitos de dimensões e fotos para publicação no E-commerce', () => {
    const product: Partial<Product> = {
      title: 'Sofá Retrátil 3 Lugares',
      description: 'Excelente sofá',
      categoryIds: ['cat-1'],
      unitPrice: 1500,
      images: [],
      width: 0,
      height: 90,
      depth: 100,
      technicalValues: { Largura: '' },
    };
    const result = checkEcomLegibility(product);
    expect(result.isLegible).toBe(false);
    expect(result.checks.images).toBe(false);
    expect(result.checks.dimensions).toBe(false);
  });

  it('exige ao menos uma dimensão física ativa para publicar no catálogo', () => {
    const product: Partial<Product> = {
      title: 'Mesa lateral',
      description: 'Mesa lateral compacta',
      categoryIds: ['cat-1'],
      unitPrice: 150,
      images: ['https://example.test/product.jpg'],
      width: 80,
      height: 90,
      depth: 100,
      technicalValues: {
        Largura: 'Não se aplica',
        Altura: 'Não se aplica',
        Profundidade: 'Não se aplica',
      },
    };
    const result = checkEcomLegibility(product);
    expect(result.checks.dimensions).toBe(false);

    const oneActiveDimension = checkEcomLegibility({
      ...product,
      technicalValues: {
        Largura: 'Não se aplica',
        Altura: '80',
        Profundidade: 'Não se aplica',
      },
    });
    expect(oneActiveDimension.checks.dimensions).toBe(true);

    const anotherActiveDimensionWithoutValue = checkEcomLegibility({
      ...product,
      technicalValues: {
        Largura: '',
        Altura: '80',
        Profundidade: 'Não se aplica',
      },
    });
    expect(anotherActiveDimensionWithoutValue.checks.dimensions).toBe(false);
  });

  it('deve aprovar produto de fabricação própria sem necessidade de fornecedor', () => {
    const product: Partial<Product> = {
      name: 'Mesa Própria',
      categoryIds: ['cat-123'],
      unitPrice: 500,
      merchandiseOrigin: 'own_production',
    };
    const result = checkERPLegibility(product);
    expect(result.checks.supplier).toBe(true);
    expect(result.isLegible).toBe(true);
  });

  it('deve reprovar produto adquirido de terceiros se não tiver fornecedor', () => {
    const product: Partial<Product> = {
      name: 'Cadeira Terceiros',
      categoryIds: ['cat-123'],
      unitPrice: 200,
      merchandiseOrigin: 'third_party',
    };
    const result = checkERPLegibility(product);
    expect(result.checks.supplier).toBe(false);
    expect(result.isLegible).toBe(false);
    expect(result.errors).toContain('Selecione pelo menos um fornecedor.');
  });
});

describe('Confirmação de alteração com perda de conformidade do Catálogo Digital', () => {
  it('explica o motivo, cita o campo e o que faltou quando uma característica da categoria está pendente', () => {
    const legibility = checkEcomLegibility(
      {
        name: 'Mesa de Jantar',
        description: 'Mesa de Jantar',
        unitPrice: 500,
        images: ['https://example.com/foto.jpg'],
        categoryIds: ['cat-1'],
        width: 100,
        height: 80,
        depth: 90,
        weight: 50,
        technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora', 'Material da estrutura': '' },
      },
      [{ name: 'Material da estrutura', requiredCategoryIds: ['cat-1'] }]
    );

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual([
      {
        field: '"Material da estrutura"',
        missing: 'característica obrigatória da categoria desativada ou sem valor preenchido',
      },
    ]);

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('Este produto está atualmente publicado no Catálogo Digital');
    expect(message).toContain('ao salvar, ele será ocultado do Catálogo Digital');
    expect(message).toContain('• Campo "Material da estrutura": característica obrigatória da categoria desativada ou sem valor preenchido.');
    expect(message).toContain('ajuste a conformidade do campo citado acima antes de salvar');
    expect(message).toContain('Deseja salvar as alterações e ocultar o produto do Catálogo Digital?');
  });

  it('cita múltiplos campos e usa plural na orientação quando faltam fotos e dimensões', () => {
    const legibility = checkEcomLegibility({
      name: 'Mesa de Jantar',
      description: 'Mesa de Jantar',
      unitPrice: 500,
      images: [],
      categoryIds: ['cat-1'],
      width: 0,
      height: 0,
      depth: 0,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    });

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual(expect.arrayContaining([
      { field: 'Fotos', missing: 'adicione pelo menos uma foto ao produto' },
      { field: 'Dimensões', missing: 'ative e preencha pelo menos uma dimensão física (altura, largura, profundidade ou comprimento) com valor maior que zero' },
    ]));

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('• Campo Fotos: adicione pelo menos uma foto ao produto.');
    expect(message).toContain('• Campo Dimensões: ative e preencha pelo menos uma dimensão física');
    expect(message).toContain('ajuste a conformidade dos campos citados acima antes de salvar');
  });

  it('cita o campo Preço Promocional quando o valor promocional for maior ou igual ao de venda', () => {
    const legibility = checkEcomLegibility({
      name: 'Mesa de Jantar',
      description: 'Mesa de Jantar',
      unitPrice: 500,
      promoPrice: 550,
      images: ['https://example.com/foto.jpg'],
      categoryIds: ['cat-1'],
      width: 100,
      height: 80,
      depth: 90,
      weight: 50,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    });

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual(expect.arrayContaining([
      { field: 'Preço Promocional', missing: 'o preço promocional deve ser menor que o preço de venda' },
    ]));

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('• Campo Preço Promocional: o preço promocional deve ser menor que o preço de venda.');
  });
});
