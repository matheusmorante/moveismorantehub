// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductFormSubModals } from './ProductFormSubModals';

vi.mock('../../modals/VariationFormModal', () => ({
  default: ({ parentProduct }: any) => <div>{parentProduct.category}</div>,
}));
vi.mock('../modals/product/CategorySearchModal', () => ({ default: () => null }));
vi.mock('../modals/product/ProductConversionModal', () => ({ default: () => null }));
vi.mock('../modals/product/ProductSaveResultModal', () => ({ ProductSaveResultModal: () => null }));
vi.mock('../../modals/ProductAiCharacteristicsModal', () => ({ default: () => null }));

describe('edição de variações no formulário de produto', () => {
  it('entrega todas as categorias atuais ao formulário da variação', () => {
    const formData = {
      category: 'Poltronas',
      categoryIds: ['poltronas', 'sofas'],
      variations: [{ id: 'variation-1' }],
    };
    render(<ProductFormSubModals
      {...({
        formData,
        variations: { editingVariationId: 'variation-1' },
        availableCategories: [{ id: 'poltronas', name: 'Poltronas' }, { id: 'sofas', name: 'Sofás' }],
      } as any)}
    />);

    expect(screen.getByText('Poltronas / Sofás')).toBeDefined();
    expect(formData.category).toBe('Poltronas');
  });
});
