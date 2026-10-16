// @vitest-environment happy-dom
import React from 'react';
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InventoryAuditModal from './InventoryAuditModal';
import * as draftStore from '../services/inventoryLocalDrafts';
const catalog = { allProducts: [], suppliers: [], employees: [], getSupplierNames: () => '' };
vi.mock('../hooks/useInventoryAuditData', () => ({ useInventoryAuditData: () => catalog }));
vi.mock('@/pages/utils/inventoryService', () => ({ getNextInventoryCode: vi.fn().mockResolvedValue('1') }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/pages/utils/productService', () => ({ fetchProductsPage: vi.fn() }));
vi.mock('../components/InventoryOperationScreen', () => ({ default: () => <div>Contagem</div> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const session = { id: 'existing', inventoryCode: '1', date: '2026-10-15T12:00:00Z', status: 'in_progress' as const, items: [], productsCount: 0, adjustmentsCount: 0, reversedCount: 0 };
describe('inventory owner restoration UI', () => {
  it('shows loading instead of the new scope form while restoring and discards a closed read', async () => {
    let finish!: () => void;
    vi.spyOn(draftStore, 'getWebInventoryDraft').mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve(null); }));
    const close = vi.fn(); const view = render(<InventoryAuditModal isOpen editingSession={session} onClose={close} />);
    expect(screen.getByRole('status').textContent).toContain('Carregando o inventário');
    expect(screen.queryByText('Novo Inventário')).toBeNull();
    view.rerender(<InventoryAuditModal isOpen={false} editingSession={session} onClose={close} />);
    await act(async () => { finish(); }); expect(screen.queryByText('Contagem')).toBeNull(); expect(close).not.toHaveBeenCalled();
  });
  it('shows restore failure and offers close without exposing a new-inventory submission', async () => {
    vi.spyOn(draftStore, 'getWebInventoryDraft').mockRejectedValueOnce(new Error('Armazenamento indisponível.'));
    render(<InventoryAuditModal isOpen editingSession={session} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Armazenamento indisponível'));
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeTruthy();
    expect(screen.queryByText('Novo Inventário')).toBeNull(); expect(screen.queryByRole('button', { name: 'Confirmar e Iniciar' })).toBeNull();
  });
  it('forwards copied selections to the real scope instead of silently opening an empty inventory', async () => {
    render(<InventoryAuditModal isOpen copiedItems={[{ productId: 'missing', name: 'Produto', systemStock: 8, physicalCount: 7 }]} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('cópia contém itens indisponíveis'));
  });
});
