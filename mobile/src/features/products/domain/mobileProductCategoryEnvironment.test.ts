import { describe, expect, it } from 'vitest';
import { getProductCategoryRootNames } from '../../../../../shared-utils/productCategoryResolution';

describe('product category environment resolution', () => {
  const categoryHierarchy = [
    { id: 'room', name: 'QUARTO', parents: [] },
    { id: 'living-room', name: 'SALA DE ESTAR', parents: [] },
    { id: 'bedroom', name: 'Dormitório', parents: ['room'] },
    { id: 'wardrobe', name: 'Guarda-Roupas', parents: ['bedroom', 'room'] },
    { id: 'sofa', name: 'Sofás', parents: ['living-room'] },
  ];

  it('resolve os nomes raiz por categoria e remove ambientes duplicados', () => {
    expect(getProductCategoryRootNames(['wardrobe', 'bedroom', 'missing'], categoryHierarchy)).toEqual([
      'QUARTO',
    ]);
  });

  it('retorna todos os ambientes de categorias selecionadas em ordem estável', () => {
    expect(getProductCategoryRootNames(['wardrobe', 'sofa'], categoryHierarchy)).toEqual([
      'QUARTO',
      'SALA DE ESTAR',
    ]);
  });

  it('encerra ciclos na hierarquia sem repetir a travessia', () => {
    const cyclicHierarchy = [
      { id: 'room', name: 'QUARTO', parents: ['wardrobe'] },
      { id: 'wardrobe', name: 'Guarda-Roupas', parents: ['room'] },
    ];

    expect(getProductCategoryRootNames(['wardrobe'], cyclicHierarchy)).toEqual([]);
  });
});
