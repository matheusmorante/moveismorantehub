// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurchasesPage from './Index';

const purchases = vi.hoisted(() => Array.from({ length: 32 }, (_, index) => ({
  id: `purchase-${index + 1}`, supplierId: index < 20 ? 'supplier-1' : 'supplier-2',
})));
vi.mock('../../../utils/purchaseService', () => ({
  subscribeToPurchases: (callback: (items: typeof purchases) => void) => { callback(purchases); return () => undefined; },
  cancelPurchase: vi.fn(), updatePurchase: vi.fn(),
}));
vi.mock('../../../utils/personService', () => ({ fetchPersons: async () => [] }));
vi.mock('./components/PurchaseSupplierFilter', () => ({
  default: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('supplier-1')}>Filtrar fornecedor</button>,
}));
vi.mock('./components/PurchaseTable', () => ({
  default: ({ purchases: items }: { purchases: typeof purchases }) => <div>{items.map((item) => <span key={item.id}>{item.id}</span>)}</div>,
}));
vi.mock('./modals/PurchaseFormModal', () => ({ default: () => null }));
vi.mock('./modals/PurchaseDetailsModal', () => ({ default: () => null }));
vi.mock('./modals/PurchaseReceiptCheckModal', () => ({ default: () => null }));

afterEach(cleanup);

describe('PurchasesPage pagination', () => {
  it('limits purchases per page and returns to the first page when filtering', async () => {
    render(<MemoryRouter><PurchasesPage /></MemoryRouter>);
    expect(await screen.findByText('purchase-1')).toBeTruthy();
    expect(screen.queryByText('purchase-16')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.getByText('purchase-16')).toBeTruthy();
    expect(screen.queryByText('purchase-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar fornecedor' }));
    await waitFor(() => expect(screen.getByText('purchase-1')).toBeTruthy());
    expect(screen.getByText('1–15 de 20 pedidos de compra')).toBeTruthy();
  });
});
