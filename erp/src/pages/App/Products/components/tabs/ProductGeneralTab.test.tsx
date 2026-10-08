// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductGeneralTab from './ProductGeneralTab';

const { mockUseProductOpportunities } = vi.hoisted(() => ({
  mockUseProductOpportunities: vi.fn(() => ({ opportunities: [] })),
}));

vi.mock('../../hooks/useProductOpportunities', () => ({
  useProductOpportunities: mockUseProductOpportunities,
}));

vi.mock('./sections/ProductCategoryPicker', () => ({
  default: () => null,
}));

describe('ProductGeneralTab product name field', () => {
  afterEach(() => cleanup());

  const renderTab = () =>
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService
        formData={{ name: 'Sofá Capri' }}
        setFormData={vi.fn()}
        availableCategories={[]}
      />
    );

  it('labels the ERP name as Nome do Produto', () => {
    renderTab();

    expect(screen.getByText('Nome do Produto')).toBeTruthy();
  });

  it('does not show the catalog title differentiation button', () => {
    renderTab();

    expect(screen.queryByRole('button', { name: 'Diferenciar Título no Catálogo' })).toBeNull();
  });
});
