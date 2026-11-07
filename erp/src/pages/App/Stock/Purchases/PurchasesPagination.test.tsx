// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesPage from './Index';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), detail: vi.fn() }));
const purchases = vi.hoisted(() => Array.from({ length: 32 }, (_, index) => ({
  id: `purchase-${index + 1}`, supplierId: index < 20 ? 'supplier-1' : 'supplier-2',
})));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { id: 'operator', role: 'admin' } }) }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => true }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../../../utils/purchaseService', () => ({
  cancelPurchase: vi.fn(), updatePurchase: vi.fn(), deleteCancelledPurchase: vi.fn(), discardPurchaseDraft: vi.fn(),
}));
vi.mock('@/pages/utils/purchasePageService', () => ({
  PURCHASE_LIST_PAGE_SIZE: 15,
  fetchPurchasesPage: mocks.fetch,
  fetchPurchaseById: mocks.detail,
  subscribeToPurchasePageChanges: () => () => undefined,
}));
vi.mock('../../../utils/personService', () => ({ fetchPersons: async () => [] }));
vi.mock('./components/PurchaseSupplierFilter', () => ({
  default: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('supplier-1')}>Filtrar fornecedor</button>,
}));
vi.mock('./components/PurchaseTable', () => ({
  default: ({ purchases: items }: { purchases: typeof purchases }) => <div>{items.map((item) => <span key={item.id}>{item.id}</span>)}</div>,
}));
vi.mock('./modals/PurchaseFormModal', () => ({ default: () => null }));
vi.mock('./modals/PurchaseDetailsModal', () => ({
  default: ({ isOpen, purchase }: any) => isOpen ? <div>Detalhe {purchase?.id}</div> : null,
}));
vi.mock('./modals/PurchaseReceiptCheckModal', () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation(async (page, options) => {
    const matching = options.supplierId
      ? purchases.filter((purchase) => purchase.supplierId === options.supplierId) : purchases;
    return { data: matching.slice((page - 1) * 15, page * 15), total: matching.length };
  });
  mocks.detail.mockResolvedValue(purchases[31]);
});
afterEach(cleanup);

describe('PurchasesPage pagination', () => {
  it('limits purchases per page and returns to the first page when filtering', async () => {
    render(<MemoryRouter><PurchasesPage /></MemoryRouter>);
    expect(await screen.findByText('purchase-1')).toBeTruthy();
    expect(screen.queryByText('purchase-16')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(await screen.findByText('purchase-16')).toBeTruthy();
    expect(screen.queryByText('purchase-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar fornecedor' }));
    await waitFor(() => expect(screen.getByText('purchase-1')).toBeTruthy());
    expect(screen.getByText('1–15 de 20 pedidos de compra')).toBeTruthy();
    expect(mocks.fetch).toHaveBeenLastCalledWith(1, expect.objectContaining({ supplierId: 'supplier-1' }));
  });

  it('abre por ID um pedido que está fora da página carregada', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/estoque/inventarios', state: { purchaseIdToOpen: 'purchase-32' } }]}>
        <PurchasesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Detalhe purchase-32')).toBeTruthy();
    expect(mocks.detail).toHaveBeenCalledWith('purchase-32', expect.any(AbortSignal));
  });
});
