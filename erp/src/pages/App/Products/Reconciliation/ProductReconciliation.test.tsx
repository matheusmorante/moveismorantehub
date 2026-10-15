// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), supplier: vi.fn(), category: vi.fn(), ncm: vi.fn(), attribute: vi.fn(), single: vi.fn(), from: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('./services/reconciliationQueries', () => ({ fetchProductsForReconciliation: mocks.query }));
vi.mock('./services/reconciliationMutations', () => ({ applySupplierBatch: mocks.supplier, applyCategoryBatch: mocks.category, applyNcmBatch: mocks.ncm, applyAttributeBatch: mocks.attribute, saveSingleProductReconciliation: mocks.single }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/components/CategoryAutocomplete', () => ({ default: ({ onSelect }: any) => <button onClick={() => onSelect({ id: 'c2', name: 'Nova categoria' })}>Categoria de filtro</button> }));
vi.mock('@/components/SupplierAutocomplete', () => ({ default: () => null }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success, info: vi.fn() } }));
import ProductReconciliation from './ProductReconciliation';
const product = { id: 'p1', name: 'Produto inicial', price: 20, categoryId: 'c1', category: 'Categoria', variations: [],
  pendencies: [{ id: 'ncm', type: 'ncm', level: 'parent', field: 'ncm', label: 'NCM', isCritical: true }], hasParentPendencies: true, hasVariationPendencies: false };
const response = (name = product.name) => ({ data: [{ ...product, name }], count: 1, summary: { totalPendingProducts: 1, totalPendencies: 1, totalCritical: 1, chipCounts: { all: 1, supplier: 0, category: 0, ncm: 1, attributes: 0, price: 0 } } });
beforeEach(() => {
  vi.clearAllMocks(); mocks.query.mockResolvedValue(response()); for (const fn of [mocks.supplier, mocks.category, mocks.ncm, mocks.attribute, mocks.single]) fn.mockResolvedValue({ success: true, updated: 1 });
  mocks.from.mockImplementation(() => {
    const builder: any = { then(resolve: any, reject: any) { return Promise.resolve({ data: [{ id: 's1', full_name: 'Fornecedor A' }], error: null }).then(resolve, reject); } };
    for (const method of ['select', 'or', 'eq', 'order', 'limit']) builder[method] = () => builder;
    return builder;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const setup = async () => { render(<ProductReconciliation />); await screen.findByText('Produto inicial'); };
const select = () => fireEvent.click(screen.getAllByRole('checkbox')[0]);
const openNcm = () => { select(); fireEvent.click(screen.getByRole('button', { name: 'NCM' })); fireEvent.change(within(screen.getByRole('dialog', { name: 'Definir NCM em lote' })).getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '9403.50.00' } }); };
describe('página e resolvers reais de reconciliação', () => {
  it('valida o lote completo e envia IDs e NCM parseados ao serviço', async () => {
    await setup(); openNcm(); fireEvent.click(screen.getByRole('button', { name: /Aplicar NCM/ }));
    await waitFor(() => expect(mocks.ncm).toHaveBeenCalledWith(['p1'], '94035000')); await waitFor(() => expect(screen.queryByText('Definir NCM em Lote')).toBeNull());
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it('preserva a seleção e o modal quando a gravação falha', async () => {
    mocks.ncm.mockResolvedValueOnce({ success: false, updated: 0, error: 'Falha confirmada no serviço' }); await setup(); openNcm(); fireEvent.click(screen.getByRole('button', { name: /Aplicar NCM/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Falha confirmada'); expect(screen.getByText('Definir NCM em Lote')).toBeTruthy(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('leva a preservação de fornecedores até o serviço', async () => {
    await setup(); select(); fireEvent.click(screen.getByRole('button', { name: 'Fornecedor' })); vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Buscar fornecedor'), { target: { value: 'Fornecedor' } }); await act(async () => { await vi.advanceTimersByTimeAsync(351); });
    fireEvent.click(screen.getByRole('button', { name: 'Fornecedor A' })); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar Atribuição' })); });
    expect(mocks.supplier).toHaveBeenCalledWith(['p1'], 's1', false);
  });
  it('não aceita resposta antiga da consulta depois de outro filtro', async () => {
    await setup(); vi.useFakeTimers(); let finish!: (value: unknown) => void; mocks.query.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(response('Produto atual'));
    const input = screen.getByPlaceholderText('Nome, SKU ou código...'); fireEvent.change(input, { target: { value: ' Antigo ' } }); await act(async () => { await vi.advanceTimersByTimeAsync(401); });
    fireEvent.change(input, { target: { value: ' Atual ' } }); await act(async () => { await vi.advanceTimersByTimeAsync(401); });
    expect(mocks.query).toHaveBeenLastCalledWith(1, 15, expect.objectContaining({ search: 'Atual' }));
    await act(async () => { finish(response('Produto antigo')); }); expect(screen.queryByText('Produto antigo')).toBeNull(); expect(screen.getByText('Produto atual')).toBeTruthy();
  });
  it('não perde uma categoria escolhida durante o debounce da busca', async () => {
    await setup(); vi.useFakeTimers(); fireEvent.change(screen.getByPlaceholderText('Nome, SKU ou código...'), { target: { value: ' Mesa ' } });
    fireEvent.click(screen.getAllByText('Categoria de filtro')[0]); await act(async () => { await vi.advanceTimersByTimeAsync(401); });
    expect(mocks.query).toHaveBeenLastCalledWith(1, 15, expect.objectContaining({ categoryId: 'c2', search: 'Mesa' }));
  });
  it('libera a interface sem aplicar sucesso tardio nem repetir lote incerto', async () => {
    await setup(); let finish!: (value: unknown) => void; mocks.ncm.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); openNcm(); vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Aplicar NCM/ })); await vi.advanceTimersByTimeAsync(25_001); });
    expect(screen.getByRole('alert').textContent).toContain('confirmar'); expect(screen.getByRole('button', { name: /Aplicar NCM/ })).toHaveProperty('disabled', true);
    await act(async () => { finish({ success: true, updated: 1 }); }); expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.ncm).toHaveBeenCalledTimes(1); expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it('não apresenta uma falha de consulta como ausência de pendências', async () => {
    mocks.query.mockRejectedValueOnce(new Error('Configuração indisponível')); render(<ProductReconciliation />);
    await screen.findByRole('alert'); expect(screen.queryByText('Nenhum produto com pendências encontrado!')).toBeNull(); expect(screen.getByRole('button', { name: 'Atualizar consulta' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar consulta' })); await screen.findByText('Produto inicial'); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('limita a consulta inicial e ignora um retorno tardio', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); let finish!: (value: unknown) => void;
    mocks.query.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); render(<ProductReconciliation />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); }); expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByText('Carregando pendências do cadastro...')).toBeNull();
    await act(async () => { finish(response('Produto tardio')); }); expect(screen.queryByText('Produto tardio')).toBeNull(); expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
