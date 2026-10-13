import { describe, expect, it } from 'vitest';
import { syncMobileVariationsWithParent } from './productVariationParentSync';

describe('syncMobileVariationsWithParent', () => {
  it('atualiza os valores herdados e preserva campos personalizados', () => {
    const variations = [
      {
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        syncCondition: true,
        syncFiscal: true,
        syncDescription: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
        syncWeight: true,
        syncIpi: true,
        syncFreight: true,
        price: 100,
        promoPrice: 90,
        costPrice: 70,
        description: 'Descrição antiga',
        width: 50,
        height: 80,
        depth: 40,
        weight: 15,
        condition: 'novo',
        fiscal: { ncm: '94036000' },
        ipiPercent: 5,
        freightCost: 10,
        freightType: 'fixed',
      },
      {
        syncUnitPrice: false,
        syncDescription: false,
        syncCostPrice: false,
        syncCondition: false,
        syncFiscal: false,
        syncIpi: false,
        syncFreight: false,
        syncWidth: false,
        price: 85,
        costPrice: 51,
        description: 'Descrição própria',
        width: 60,
        condition: 'usado',
        fiscal: { ncm: '94032000' },
        ipiPercent: 2,
        freightCost: 20,
        freightType: 'percentage',
      },
    ];

    const updated = syncMobileVariationsWithParent(variations, {
      unitPrice: '120,00',
      promoPrice: '110,00',
      costPrice: '75,00',
      description: 'Descrição atual',
      width: '55',
      height: '90',
      depth: '45',
      weight: '18',
      condition: 'salvado',
      fiscal: { ncm: '94036090' },
      ipiPercent: '7,5',
      freightCost: '15,00',
      freightType: 'percentage',
    });

    expect(updated[0]).toMatchObject({
      price: '120,00',
      promoPrice: '110,00',
      costPrice: '75,00',
      description: 'Descrição atual',
      width: '55',
      height: '90',
      depth: '45',
      weight: '18',
      condition: 'salvado',
      fiscal: { ncm: '94036090' },
      ipiPercent: '7,5',
      freightCost: '15,00',
      freightType: 'percentage',
    });
    expect(updated[1]).toMatchObject({
      price: 85,
      costPrice: 51,
      description: 'Descrição própria',
      width: 60,
      condition: 'usado',
      fiscal: { ncm: '94032000' },
      ipiPercent: 2,
      freightCost: 20,
      freightType: 'percentage',
    });
    expect(variations[0].price).toBe(100);
  });

  it('preserva a referência quando os valores herdados já estão atualizados', () => {
    const variations = [{ syncUnitPrice: true, price: '120,00' }];
    expect(syncMobileVariationsWithParent(variations, { unitPrice: '120,00' })).toBe(variations);
  });

  it('reflete alterações sucessivas do produto pai no estado da variação', () => {
    const initial = [{ syncDescription: true, description: 'Descrição anterior' }];
    const firstUpdate = syncMobileVariationsWithParent(initial, {
      description: 'Descrição atualizada',
    });
    const secondUpdate = syncMobileVariationsWithParent(firstUpdate, {
      description: 'Descrição revisada',
    });

    expect(firstUpdate[0].description).toBe('Descrição atualizada');
    expect(secondUpdate[0].description).toBe('Descrição revisada');
  });

  it('atualiza o nome herdado preservando complemento e título personalizado', () => {
    const variations = [
      { name: 'Cadeira antiga Madeira', title: 'Cadeira antiga Madeira', syncName: true },
      {
        name: 'Cadeira antiga Azul',
        differentiateTitle: true,
        title: 'Título próprio',
        syncName: true,
      },
      { name: 'Cadeira antiga Personalizada', syncName: false },
    ];

    const updated = syncMobileVariationsWithParent(
      variations,
      { name: 'Cadeira nova' },
      { name: 'Cadeira antiga' }
    );

    expect(updated[0]).toMatchObject({
      name: 'Cadeira nova Madeira',
      title: 'Cadeira nova Madeira',
    });
    expect(updated[1]).toMatchObject({ name: 'Cadeira nova Azul', title: 'Título próprio' });
    expect(updated[2].name).toBe('Cadeira antiga Personalizada');
  });
});
