// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormHeader from './FormHeader';

const mocks = vi.hoisted(() => ({ parse: vi.fn(), error: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { parseOrderFreeText: mocks.parse } }));
vi.mock('@/pages/utils/personService', () => ({
  subscribeToPeople: vi.fn((_collection, callback) => {
    callback([{ fullName: 'Operador' }]);
    return mocks.unsubscribe;
  }),
}));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warn: mocks.error, info: vi.fn(), success: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
const draft = { order: { seller: 'Operador' } };
const baseProps = {
  onClearForm: vi.fn(), orderDate: '2026-10-16', setOrderDate: vi.fn(), seller: '', setSeller: vi.fn(),
  isSavingDraft: false, errors: {}, deliveryMethod: 'delivery' as const, setDeliveryMethod: vi.fn(), status: 'draft',
};
const submitManual = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Preenchimento Inteligente IA' }));
  fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
  fireEvent.change(screen.getByPlaceholderText('Cole aqui o JSON estruturado...'), { target: { value: JSON.stringify(draft) } });
  fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
};

describe('FormHeader with real SmartAIFillModal', () => {
  it('preserves the parent promise until confirmation and then closes the modal', async () => {
    const pending = deferred<boolean>();
    const apply = vi.fn(() => pending.promise);
    render(<FormHeader {...baseProps} currentOrderId="a" onLoadJSON={apply} />);
    submitManual();
    await waitFor(() => expect(apply).toHaveBeenCalledWith(draft));
    expect(screen.getByPlaceholderText('Cole aqui o JSON estruturado...')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fechar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    expect(apply).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(true));
    await waitFor(() => expect(screen.queryByPlaceholderText('Cole aqui o JSON estruturado...')).toBeNull());
  });

  it('preserves a false parent receipt and keeps the editable modal open', async () => {
    const apply = vi.fn().mockResolvedValue(false);
    render(<FormHeader {...baseProps} currentOrderId="a" onLoadJSON={apply} />);
    submitManual();
    expect((await screen.findByRole('alert')).textContent).toContain('não confirmou');
    expect(screen.getByPlaceholderText('Cole aqui o JSON estruturado...')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Processar e Preencher' }) as HTMLButtonElement).disabled).toBe(false);
    apply.mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    await waitFor(() => expect(screen.queryByPlaceholderText('Cole aqui o JSON estruturado...')).toBeNull());
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('replaces the modal owner when switching orders and ignores the previous AI result', async () => {
    const oldAnalysis = deferred<unknown>();
    const result = (summary: string) => ({ rawJSON: draft, summary, identifiedFields: {}, warnings: [], missingRequiredFields: [] });
    mocks.parse.mockReturnValueOnce(oldAnalysis.promise).mockResolvedValueOnce(result('Pedido novo'));
    const apply = vi.fn();
    const view = render(<FormHeader {...baseProps} currentOrderId="a" onLoadJSON={apply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preenchimento Inteligente IA' }));
    fireEvent.change(screen.getByPlaceholderText(/Exemplo: O cliente/), { target: { value: 'Pedido anterior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Pedido com IA' }));
    await waitFor(() => expect(mocks.parse).toHaveBeenCalledWith('Pedido anterior', ['Operador']));
    view.rerender(<FormHeader {...baseProps} currentOrderId="b" onLoadJSON={apply} />);
    expect((screen.getByPlaceholderText(/Exemplo: O cliente/) as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(screen.getByPlaceholderText(/Exemplo: O cliente/), { target: { value: 'Pedido atual' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Pedido com IA' }));
    await screen.findByText('Pedido novo');
    await act(async () => oldAnalysis.resolve(result('Pedido antigo')));
    expect(screen.queryByText('Pedido antigo')).toBeNull();
    expect(screen.getByText('Pedido novo')).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
  });
});
