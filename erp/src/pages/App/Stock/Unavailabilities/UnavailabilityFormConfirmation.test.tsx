// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import UnavailabilityFormModal from './modals/UnavailabilityFormModal';
import type { Product, Variation } from '@/pages/types/product.type';

const transport = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), confirm: vi.fn(), product: vi.fn(), people: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  auth: { getSession: transport.auth }, rpc: transport.rpc,
  storage: { from: () => ({ upload: transport.upload, remove: transport.remove }) },
  from: (table: string) => ({ select() { return this; }, eq() { return this; }, in() { return this; }, or: transport.people,
    single: table === 'products' ? transport.product : transport.confirm }),
} }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ProductAutocomplete', () => ({ default: ({ onSelect }: { onSelect: (product: Product, variation: Variation) => void }) =>
  <button type="button" onClick={() => onSelect({ id: 'product' } as Product, { id: 'variation', name: 'Variação', sku: 'V1', stock: 10, unitPrice: 1, active: true, attributes: [] })}>Selecionar variação</button>,
}));
const row = { id: 'new', product_id: 'product', variation_id: 'variation', quantity: 1, reason: 'Avaria',
  treatment: 'Descarte/perda', physical_location: 'Depósito', observation: '', supplier_id: null, photos: null, status: 'active' };
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
const submit = () => fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
async function setup() {
  const props = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn() };
  const view = render(<UnavailabilityFormModal {...props} />);
  fireEvent.click(screen.getByText('Selecionar variação'));
  fireEvent.change(screen.getByLabelText('Tratativa *'), { target: { value: 'Descarte/perda' } }); await advance();
  return { ...view, props };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  transport.auth.mockReset().mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null });
  transport.rpc.mockReset().mockResolvedValue({ data: 'new', error: null, status: 200 });
  transport.upload.mockReset().mockResolvedValue({ error: null }); transport.remove.mockReset().mockResolvedValue({ error: null });
  transport.confirm.mockReset().mockResolvedValue({ data: row, error: null });
  transport.product.mockReset().mockResolvedValue({ data: { supplier_ids: [] }, error: null });
  transport.people.mockReset().mockResolvedValue({ data: [], error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('modal, hook, resolver, fornecedores e registro reais com transporte simulado', () => {
  it('o fechamento pelo proprietário após sucesso não bloqueia a próxima abertura', async () => {
    function Page() {
      const [open, setOpen] = useState(true);
      return <><button onClick={() => setOpen(true)}>Reabrir</button><UnavailabilityFormModal isOpen={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} /></>;
    }
    render(<Page />);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) fireEvent.click(screen.getByText('Reabrir'));
      fireEvent.click(screen.getByText('Selecionar variação'));
      fireEvent.change(screen.getByLabelText('Tratativa *'), { target: { value: 'Descarte/perda' } }); await advance();
      expect(screen.queryByRole('alert')).toBeNull(); submit(); await advance(); expect(screen.queryByRole('dialog')).toBeNull();
    }
    expect(transport.rpc).toHaveBeenCalledTimes(2); expect(toast.success).toHaveBeenCalledTimes(2);
  });
  it('mantém o resolver ativo até conferir a linha e envia quantidade, textos e fotos parseados', async () => {
    const s = await setup(), confirmation = deferred<{ data: unknown; error: null }>();
    const photo = new File(['foto'], 'avaria.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Fotos'), { target: { files: [photo] } }); await advance();
    fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: ' preservar texto ' } });
    transport.confirm.mockReturnValue(confirmation.promise);
    submit(); submit(); await advance();
    expect(transport.rpc).toHaveBeenCalledOnce();
    expect(transport.rpc).toHaveBeenCalledWith('create_stock_unavailability', {
      p_product_id: 'product', p_variation_id: 'variation', p_quantity: 2.5, p_reason: 'Avaria', p_treatment: 'Descarte/perda',
      p_physical_location: 'Depósito', p_observation: ' preservar texto ', p_supplier_id: null,
      p_photos: ['user/00000000-0000-4000-8000-000000000001.png'],
    });
    expect(toast.success).not.toHaveBeenCalled(); expect(s.props.onSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Fechar')); expect(s.props.onClose).not.toHaveBeenCalled();
    confirmation.resolve({ data: { ...row, quantity: 2.5, observation: ' preservar texto ', photos: ['user/00000000-0000-4000-8000-000000000001.png'] }, error: null }); await advance();
    expect(toast.success).toHaveBeenCalledOnce(); expect(s.props.onSuccess).toHaveBeenCalledOnce();
  });
  it('rejeita precisão inválida/foto inválida antes de Auth ou gravação e mostra erro no modal', async () => {
    await setup(); fireEvent.change(screen.getByLabelText('Fotos'), { target: { files: [new File(['txt'], 'bad.txt', { type: 'text/plain' })] } }); await advance();
    expect(screen.getByRole('alert').textContent).toContain('imagem');
    fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '1.234' } }); submit(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('duas casas'); expect(transport.auth).not.toHaveBeenCalled(); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('resposta vazia da RPC preserva fotos e bloqueia nova tentativa inclusive após reabrir', async () => {
    const s = await setup(); transport.rpc.mockResolvedValue({ data: null, error: null, status: 200 });
    fireEvent.change(screen.getByLabelText('Fotos'), { target: { files: [new File(['foto'], 'a.png', { type: 'image/png' })] } }); await advance();
    submit(); await advance(); expect(screen.getByRole('alert').textContent).toContain('não foi confirmado');
    expect(transport.remove).not.toHaveBeenCalled(); expect(s.props.onSuccess).not.toHaveBeenCalled();
    s.rerender(<UnavailabilityFormModal {...s.props} isOpen={false} />); s.rerender(<UnavailabilityFormModal {...s.props} />); await advance();
    submit(); await advance(); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('troca externa de abertura durante RPC impede publicação tardia e repetição', async () => {
    const s = await setup(), request = deferred<{ data: string; error: null; status: number }>(); transport.rpc.mockReturnValue(request.promise);
    submit(); await advance(); expect(transport.rpc).toHaveBeenCalledOnce();
    s.rerender(<UnavailabilityFormModal {...s.props} isOpen={false} />); s.rerender(<UnavailabilityFormModal {...s.props} />); await advance();
    request.resolve({ data: 'new', error: null, status: 200 }); await advance();
    expect(toast.success).not.toHaveBeenCalled(); expect(s.props.onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmado'); submit(); await advance(); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('fechar durante validação impede o primeiro envio da abertura antiga', async () => {
    const s = await setup(); submit(); s.rerender(<UnavailabilityFormModal {...s.props} isOpen={false} />); await advance();
    expect(transport.rpc).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
  it('timeout da RPC libera a interface sem reenviar ou confirmar uma resposta tardia', async () => {
    const s = await setup(), request = deferred<{ data: string; error: null }>(); transport.rpc.mockReturnValue(request.promise);
    submit(); await advance(20000); expect(screen.getByRole('alert').textContent).toContain('não foi confirmado');
    expect(screen.queryByText('Registrando indisponibilidade e confirmando anexos...')).toBeNull();
    request.resolve({ data: 'new', error: null }); await advance();
    expect(s.props.onSuccess).not.toHaveBeenCalled(); expect(transport.confirm).not.toHaveBeenCalled(); expect(transport.remove).not.toHaveBeenCalled();
  });
  it('limita a 60s o lote de fotos e impede o RPC após o prazo total', async () => {
    await setup(); transport.upload.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 14000)));
    fireEvent.change(screen.getByLabelText('Fotos'), { target: { files: Array.from({ length: 5 }, (_, index) => new File(['foto'], `${index}.png`, { type: 'image/png' })) } }); await advance();
    submit(); await advance(60000); expect(screen.getByRole('alert').textContent).toContain('não foi confirmado');
    await advance(10000); expect(transport.rpc).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
  it('rejeição SQL confirmada preserva rascunho e permite repetição explícita', async () => {
    const s = await setup(); transport.rpc.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Estoque alterado' }, status: 400 });
    submit(); await advance(); expect(screen.getByRole('alert').textContent).toContain('Estoque alterado');
    expect((screen.getByLabelText('Quantidade *') as HTMLInputElement).value).toBe('1');
    submit(); await advance(); expect(transport.rpc).toHaveBeenCalledTimes(2); expect(s.props.onSuccess).toHaveBeenCalledOnce();
  });
  it('falha de fornecedores não aparece como ausência e pode ser consultada novamente', async () => {
    transport.product.mockResolvedValueOnce({ data: null, error: { message: 'Indisponível' } });
    await setup(); fireEvent.change(screen.getByLabelText('Tratativa *'), { target: { value: 'Devolução ao fornecedor' } });
    expect(screen.queryByText('Nenhum fornecedor vinculado a este produto.')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('consultar');
    transport.product.mockResolvedValueOnce({ data: { supplier_id: 'supplier' }, error: null });
    transport.people.mockResolvedValueOnce({ data: [{ id: 'supplier', nickname: 'Fornecedor' }], error: null });
    fireEvent.click(screen.getByText('Consultar fornecedores novamente')); await advance();
    expect((screen.getByLabelText('Fornecedor Alvo *') as HTMLSelectElement).value).toBe('supplier');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
