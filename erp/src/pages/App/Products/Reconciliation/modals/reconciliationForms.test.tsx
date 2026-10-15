// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), response: vi.fn(), queries: [] as any[], confirm: vi.fn(), close: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/components/CategoryAutocomplete', () => ({ default: (props: any) => <><button onClick={() => props.onSelect({ id: ' categoria ', name: 'Categoria' })} data-filter={props.filter}>Escolher categoria</button><button onClick={() => props.onSelect({ id: 'outra', name: 'Outra' })}>Escolher outra categoria</button></> }));
import { ApplyNcmModal } from './ApplyNcmModal';
import { ApplyCategoryModal } from './ApplyCategoryModal';
import { ApplyAttributeModal } from './ApplyAttributeModal';
import { ApplySupplierModal } from './ApplySupplierModal';
const props = { isOpen: true, selectedCount: 1, onConfirm: mocks.confirm, onClose: mocks.close };
const confirm = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Aplicar|Confirmar|Adicionar/ })); }); };
beforeEach(() => {
  vi.clearAllMocks(); mocks.queries = []; mocks.confirm.mockResolvedValue({ success: true });
  mocks.response.mockResolvedValue({ data: [{ id: ' fornecedor ', full_name: 'Fornecedor A' }], error: null });
  mocks.from.mockImplementation((table) => {
    const query = { table, calls: [] as any[] }; mocks.queries.push(query);
    const builder: any = { then(resolve: any, reject: any) { return mocks.response().then(resolve, reject); } };
    for (const method of ['select', 'or', 'eq', 'order', 'limit']) builder[method] = (...args: any[]) => { query.calls.push([method, ...args]); return builder; };
    return builder;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('resolvers reais dos quatro modais de reconciliação', () => {
  it('normaliza NCM antes de confirmar e mantém o callback na submissão protegida', async () => {
    let finish!: (value: unknown) => void; mocks.confirm.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ApplyNcmModal {...props} />); fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: ' 9403.50.00 ' } }); const button = screen.getByRole('button', { name: /Aplicar/ }); await confirm();
    expect(mocks.confirm).toHaveBeenCalledWith('94035000'); expect(mocks.close).not.toHaveBeenCalled();
    expect(button).toHaveProperty('disabled', true); fireEvent.click(button); expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ success: true }); }); expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it('bloqueia NCM incompleto com erro visível', async () => {
    render(<ApplyNcmModal {...props} />); fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '9403' } }); await confirm();
    expect(screen.getByRole('alert').textContent).toContain('8 dígitos'); expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it('mantém o modal aberto quando o proprietário retorna falha', async () => {
    mocks.confirm.mockResolvedValueOnce({ success: false, error: 'Categoria não foi confirmada' }); render(<ApplyCategoryModal {...props} />);
    const choose = screen.getByText('Escolher categoria'); expect(choose.getAttribute('data-filter')).toBe('categories'); fireEvent.click(choose); await confirm();
    expect(mocks.confirm).toHaveBeenCalledWith('categoria'); expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toBe('Categoria não foi confirmada');
  });
  it('conserva a categoria escolhida durante uma confirmação pendente', async () => {
    let finish!: (value: unknown) => void; mocks.confirm.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ success: false, error: 'Não confirmado' });
    render(<ApplyCategoryModal {...props} />); fireEvent.click(screen.getByText('Escolher categoria')); await confirm();
    fireEvent.click(screen.getByText('Escolher outra categoria')); await act(async () => { finish({ success: false, error: 'Não confirmado' }); }); await confirm();
    expect(mocks.confirm).toHaveBeenNthCalledWith(2, 'categoria');
  });
  it('rejeita fração no atributo inteiro e depois envia o valor parseado', async () => {
    render(<ApplyAttributeModal {...props} availableAttributes={[{ id: 'a1', name: 'Quantidade', dataType: 'integer' }]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Quantidade' } }); fireEvent.change(screen.getByPlaceholderText('Informe o valor...'), { target: { value: '1.5' } }); await confirm();
    expect(mocks.confirm).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('inteiro');
    fireEvent.change(screen.getByPlaceholderText('Informe o valor...'), { target: { value: '2' } }); await confirm(); expect(mocks.confirm).toHaveBeenCalledWith('Quantidade', '2');
  });
  it('não confirma atributo removido enquanto o modal está aberto', async () => {
    const view = render(<ApplyAttributeModal {...props} availableAttributes={[{ id: 'a1', name: 'Cor', dataType: 'text' }]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Cor' } }); fireEvent.change(screen.getByPlaceholderText('Informe o valor...'), { target: { value: ' Azul ' } });
    view.rerender(<ApplyAttributeModal {...props} availableAttributes={[]} />); await confirm(); expect(mocks.confirm).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('disponível');
  });
  it('revalida o tipo do atributo antes de confirmar', async () => {
    const view = render(<ApplyAttributeModal {...props} availableAttributes={[{ id: 'a1', name: 'Possui pés', dataType: 'text' }]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Possui pés' } }); fireEvent.change(screen.getByPlaceholderText('Informe o valor...'), { target: { value: 'talvez' } });
    view.rerender(<ApplyAttributeModal {...props} availableAttributes={[{ id: 'a1', name: 'Possui pés', dataType: 'boolean' }]} />); await confirm();
    expect(mocks.confirm).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('Sim ou Não');
  });
  it('consulta fornecedor com schema, descarta resposta antiga e preserva fornecedores existentes', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void; mocks.response.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ApplySupplierModal {...props} isAllFilteredSelected={false} totalFilteredCount={1} />); const input = screen.getByLabelText('Buscar fornecedor');
    fireEvent.change(input, { target: { value: '  Antigo  ' } }); await act(async () => { await vi.advanceTimersByTimeAsync(351); });
    expect(mocks.queries[0].calls).toContainEqual(['or', 'full_name.ilike."%Antigo%",social_name.ilike."%Antigo%"']);
    fireEvent.change(input, { target: { value: 'Novo' } }); await act(async () => { await vi.advanceTimersByTimeAsync(351); });
    await act(async () => { finish({ data: [{ id: 'antigo', full_name: 'Fornecedor antigo' }], error: null }); });
    expect(screen.queryByText('Fornecedor antigo')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Fornecedor A' })); await confirm();
    expect(mocks.confirm).toHaveBeenCalledWith('fornecedor', false); expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it('limita a busca de fornecedor e não repete automaticamente', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); mocks.response.mockImplementationOnce(() => new Promise(() => {}));
    render(<ApplySupplierModal {...props} isAllFilteredSelected={false} totalFilteredCount={1} />); fireEvent.change(screen.getByLabelText('Buscar fornecedor'), { target: { value: 'Fornecedor' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_351); }); expect(screen.getByRole('alert')).toBeTruthy(); expect(mocks.response).toHaveBeenCalledTimes(1);
  });
  it('cancela o debounce de fornecedor na desmontagem', async () => {
    vi.useFakeTimers(); const view = render(<ApplySupplierModal {...props} isAllFilteredSelected={false} totalFilteredCount={1} />);
    fireEvent.change(screen.getByLabelText('Buscar fornecedor'), { target: { value: 'Fornecedor' } }); view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(351); }); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('encerra a espera sem fechar nem aceitar confirmação tardia', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); let finish!: (value: unknown) => void; mocks.confirm.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ApplyNcmModal {...props} />); fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Aplicar/ })); await vi.advanceTimersByTimeAsync(30_001); });
    expect(screen.getByRole('alert').textContent).toContain('confirmar'); expect(screen.getByRole('button', { name: /Aplicar/ })).toHaveProperty('disabled', true);
    await act(async () => { finish({ success: true }); }); expect(mocks.close).not.toHaveBeenCalled();
  });
  it('não fecha uma sessão reaberta por resposta de uma sessão antiga', async () => {
    let finish!: (value: unknown) => void; mocks.confirm.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<ApplyNcmModal {...props} />); fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } }); await confirm();
    view.rerender(<ApplyNcmModal {...props} isOpen={false} />); view.rerender(<ApplyNcmModal {...props} />); await act(async () => { finish({ success: true }); });
    expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByPlaceholderText('Ex: 9403.50.00')).toHaveProperty('value', '');
  });
});
