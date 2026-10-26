// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelPrintSelectionModal } from './LabelPrintSelectionModal';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), error: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: [] }) }) }) }) }) } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('label selection submission', () => {
  it('blocks a product without identity before navigating and passes the valid selection', async () => {
    const close = vi.fn();
    const { rerender } = render(<LabelPrintSelectionModal isOpen onClose={close} initialProduct={{ id: '', description: 'Mesa' }} labelType="price" />);
    await act(async () => fireEvent.click(screen.getByText('Imprimir Etiquetas')));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    rerender(<LabelPrintSelectionModal isOpen onClose={close} initialProduct={{ id: 'product', description: 'Mesa' }} labelType="price" />);
    await act(async () => fireEvent.click(screen.getByText('Imprimir Etiquetas')));
    expect(mocks.navigate).toHaveBeenCalledWith('/estoque/etiquetas?cat=precos', { state: { labelType: 'price', batchProducts: [{ id: 'product', description: 'Mesa', images: undefined, labelQty: 1 }] } });
    expect(close).toHaveBeenCalledOnce();
  });
});
