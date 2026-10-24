import { describe, expect, it } from 'vitest';
import {
  areAllProductReconciliationPageItemsSelected,
  updateProductReconciliationPageSelection,
  updateProductReconciliationSelection,
} from '../../../../../shared-utils/productReconciliationSelection';

describe('seleção de produtos para conciliação', () => {
  it('seleciona a página sem remover itens selecionados em páginas anteriores', () => {
    const selected = updateProductReconciliationPageSelection(
      new Set(['produto-anterior']),
      [{ id: 'produto-a' }, { id: 'produto-b' }],
      true
    );

    expect([...selected]).toEqual(['produto-anterior', 'produto-a', 'produto-b']);
    expect(areAllProductReconciliationPageItemsSelected(selected, [{ id: 'produto-a' }, { id: 'produto-b' }])).toBe(true);
  });

  it('desmarca somente os itens da página atual', () => {
    const selected = updateProductReconciliationPageSelection(
      new Set(['produto-anterior', 'produto-a', 'produto-b']),
      [{ id: 'produto-a' }, { id: 'produto-b' }],
      false
    );

    expect([...selected]).toEqual(['produto-anterior']);
    expect(areAllProductReconciliationPageItemsSelected(selected, [{ id: 'produto-a' }])).toBe(false);
  });

  it('altera um produto individual sem modificar os demais', () => {
    const selected = updateProductReconciliationSelection(new Set(['produto-a', 'produto-b']), 'produto-a', false);
    expect([...selected]).toEqual(['produto-b']);
  });
});
