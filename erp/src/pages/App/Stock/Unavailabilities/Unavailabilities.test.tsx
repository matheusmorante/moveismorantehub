// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product, Variation } from '@/pages/types/product.type';
import UnavailabilitiesPage from './index';
import UnavailabilityFormModal from './UnavailabilityFormModal';
import {
  createStockUnavailability,
  fetchStockUnavailabilities,
  undoStockUnavailability,
} from '@/pages/utils/stockUnavailabilityService';
import { toast } from 'react-toastify';

vi.mock('@/pages/utils/supabaseConfig', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi
        .fn()
        .mockResolvedValue({ data: { supplier_id: 'sup-1', supplier_ids: [] }, error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { supplier_id: 'sup-1', supplier_ids: [] }, error: null }),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn(() => createQueryBuilder()),
    },
  };
});

vi.mock('@/pages/utils/stockUnavailabilityService', () => ({
  STOCK_UNAVAILABILITIES_PAGE_SIZE: 30,
  createStockUnavailability: vi.fn(),
  fetchStockUnavailabilities: vi.fn(),
  undoStockUnavailability: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'manager', roles: ['manager'] } }),
}));

vi.mock('@/pages/utils/permissionService', () => ({ canPerform: vi.fn(() => true) }));

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ProductAutocomplete', () => ({
  __esModule: true,
  default: ({
    onSelect,
    onChange,
  }: {
    onSelect: (product: Product, variation?: Variation) => void;
    onChange?: (value: string) => void;
  }) => (
    <div>
      <input aria-label="Buscar produto" onChange={(event) => onChange?.(event.target.value)} />
      <button type="button" onClick={() => onSelect(mockProduct, undefined)}>
        Selecionar sem variação
      </button>
      <button type="button" onClick={() => onSelect(mockProduct, mockVariation)}>
        Selecionar variação
      </button>
    </div>
  ),
}));

const mockProduct = {
  id: 'product-1',
  name: 'Produto teste',
  stock: 10,
  active: true,
  itemType: 'product',
} as unknown as Product;
const mockVariation = {
  id: 'variation-1',
  product_id: 'product-1',
  name: 'Variação azul',
  sku: 'SKU-1',
  stock: 10,
  active: true,
} as unknown as Variation;

const activeRecord = {
  id: 'unavailability-1',
  product_id: 'product-1',
  variation_id: 'variation-1',
  supplier_id: null,
  quantity: 2,
  reason: 'Avaria',
  treatment: 'Descarte/perda',
  physical_location: 'Depósito',
  status: 'active' as const,
  observation: null,
  photos: null,
  created_at: '2026-09-28T12:00:00.000Z',
  products: { id: 'product-1', name: 'Produto teste', sku: 'P-1', product_kind: 'normal' as const },
  product_variations: { name: 'Variação azul', sku: 'SKU-1' },
  suppliers: null,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <UnavailabilitiesPage />
    </MemoryRouter>
  );

afterEach(() => cleanup());

describe('UnavailabilityFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createStockUnavailability).mockResolvedValue({ id: 'unavailability-1' });
  });

  it('shows the form with quantity 1 and requires a variation', () => {
    render(<UnavailabilityFormModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Quantidade *')).toHaveValue(1);
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
  });

  it('does not submit a product without a variation', async () => {
    render(<UnavailabilityFormModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar sem variação' }));
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
    expect(createStockUnavailability).not.toHaveBeenCalled();
  });

  it('requires a supplier when the treatment is supplier return', async () => {
    render(<UnavailabilityFormModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar variação' }));
    fireEvent.change(screen.getByLabelText('Tratativa *'), {
      target: { value: 'Devolução ao fornecedor' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Registrar' }).closest('form')!);
    expect(toast.error).toHaveBeenCalledWith('Fornecedor é obrigatório para devolução.');
    expect(createStockUnavailability).not.toHaveBeenCalled();
  });

  it('reports RPC errors and reports success after creating an unavailability', async () => {
    const onSuccess = vi.fn();
    render(<UnavailabilityFormModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar variação' }));
    fireEvent.change(screen.getByLabelText('Tratativa *'), { target: { value: 'Descarte/perda' } });
    vi.mocked(createStockUnavailability).mockRejectedValueOnce(new Error('Falha da RPC'));
    fireEvent.submit(screen.getByRole('button', { name: 'Registrar' }).closest('form')!);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha da RPC'));
    expect(onSuccess).not.toHaveBeenCalled();

    vi.mocked(createStockUnavailability).mockResolvedValueOnce({ id: 'unavailability-1' });
    fireEvent.submit(screen.getByRole('button', { name: 'Registrar' }).closest('form')!);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Indisponibilidade registrada com sucesso!')
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});

describe('UnavailabilitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchStockUnavailabilities).mockResolvedValue({
      data: [activeRecord],
      totalCount: 65,
    });
    vi.mocked(undoStockUnavailability).mockResolvedValue({ status: 'cancelled' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the list and applies status and product-kind filters', async () => {
    renderPage();
    expect(await screen.findByText('Variação azul')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nova indisponibilidade' }));
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por status'), {
      target: { value: 'cancelled' },
    });
    await waitFor(() =>
      expect(fetchStockUnavailabilities).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'cancelled', page: 1 })
      )
    );
    fireEvent.change(screen.getByLabelText('Filtrar por tipo do produto'), {
      target: { value: 'salvado' },
    });
    await waitFor(() =>
      expect(fetchStockUnavailabilities).toHaveBeenLastCalledWith(
        expect.objectContaining({ productKind: 'salvado', page: 1 })
      )
    );
  });

  it('loads the next server page and can undo an active record', async () => {
    renderPage();
    await screen.findByText('Variação azul');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() =>
      expect(fetchStockUnavailabilities).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(undoStockUnavailability).toHaveBeenCalledWith('unavailability-1'));
    expect(toast.success).toHaveBeenCalledWith('Indisponibilidade desfeita.');
  });

  it('renders a friendly empty state when there are no unavailabilities registered', async () => {
    vi.mocked(fetchStockUnavailabilities).mockResolvedValueOnce({
      data: [],
      totalCount: 0,
    });
    renderPage();
    expect(await screen.findByText('Nenhuma indisponibilidade registrada')).toBeInTheDocument();
    expect(screen.getByText(/O estoque está 100% liberado/i)).toBeInTheDocument();
    // Garante que não renderiza o texto frio que parecia erro
    expect(screen.queryByText('Nenhuma indisponibilidade encontrada.')).not.toBeInTheDocument();
    // Garante que a paginação não fica exibindo 0-0 de 0
    expect(screen.queryByLabelText('Paginação de indisponibilidades')).not.toBeInTheDocument();
  });
});
