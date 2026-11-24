// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchConfig: vi.fn(),
  createMaterial: vi.fn(),
  createType: vi.fn(),
  deleteMaterial: vi.fn(),
  deleteType: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/services/products/productCatalogConfigService', () => ({
  fetchProductCatalogConfig: mocks.fetchConfig,
  createCatalogMaterial: mocks.createMaterial,
  createCatalogType: mocks.createType,
  deleteCatalogMaterialIfUnused: mocks.deleteMaterial,
  deleteCatalogTypeIfUnused: mocks.deleteType,
  getCatalogConfigErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback,
}));

vi.mock('@/components/shared/confirmationService', () => ({
  requestConfirmation: mocks.confirm,
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import ProductMaterialsSection from './ProductMaterialsSection';

describe('ProductMaterialsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.fetchConfig.mockResolvedValue({
      materials: [{ id: 'm1', name: 'MDP' }],
      productTypes: [{ id: 't1', name: 'GUARDA ROUPAS' }],
    });
  });

  afterEach(cleanup);

  it('loads and renders materials and product types via catalog config service', async () => {
    render(<ProductMaterialsSection />);
    await waitFor(() => {
      expect(screen.getByText('MDP')).toBeTruthy();
      expect(screen.getByText('GUARDA ROUPAS')).toBeTruthy();
    });
  });

  it('validates and creates a new material via ZodForm', async () => {
    mocks.createMaterial.mockResolvedValue(undefined);
    render(<ProductMaterialsSection />);
    await waitFor(() => expect(screen.getByText('MDP')).toBeTruthy());

    const input = screen.getByPlaceholderText('EX: MDP, MADEIRA MACIÇA, VIDRO...');
    fireEvent.change(input, { target: { value: 'madeira maciça' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar' })[0]);

    await waitFor(() => expect(mocks.createMaterial).toHaveBeenCalledWith('MADEIRA MACIÇA'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Material adicionado!');
  });

  it('shows blocked-delete error toast when type has linked products', async () => {
    mocks.deleteType.mockResolvedValue({ linkedProductCount: 4, deleted: false });
    render(<ProductMaterialsSection />);
    await waitFor(() => expect(screen.getByText('GUARDA ROUPAS')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Remover GUARDA ROUPAS'));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Não é possível remover: Esta categoria está vinculada a 4 produtos.'
      )
    );
  });
});
