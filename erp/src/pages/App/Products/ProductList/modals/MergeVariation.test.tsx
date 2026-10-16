// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MergeVariationModal } from './MergeVariationModal';
import { useMergeVariation } from './MergeVariation/useMergeVariation';
import { mergeVariationIntoCanonical } from '@/pages/utils/productService/productVariationActionsService';
import { searchCanonicalVariations } from '@/pages/utils/productService/productVariationMergeQueries';
import { toast } from 'react-toastify';

type Query = { table: string; columns: string; filters: Record<string, unknown>; payload?: unknown; ors: { value: string; scope?: unknown }[] };
type Response = { data: unknown; error: unknown; status?: number };
const transport = vi.hoisted(() => ({ read: vi.fn<(query: Query) => unknown>(), write: vi.fn<(query: Query) => unknown>(), rpc: vi.fn(), merge: vi.fn(), notify: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  from: (table: string) => {
    const request: Query = { table, columns: '', filters: {}, ors: [] }; let writing = false;
    const resolve = () => writing ? transport.write(request) : transport.read(request);
    return {
      select(columns: string) { request.columns = columns; return this; }, eq(key: string, value: unknown) { request.filters[key] = value; return this; },
      in(key: string, value: unknown) { request.filters[key] = value; return this; }, neq() { return this; }, is() { return this; },
      or(value: string, scope?: unknown) { request.ors.push({ value, scope }); return this; }, order() { return this; }, limit() { return this; },
      update(payload: unknown) { writing = true; request.payload = payload; return this; }, single: () => Promise.resolve(resolve()),
      then: (done: (value: unknown) => unknown, fail?: (error: unknown) => unknown) => Promise.resolve(resolve()).then(done, fail),
    };
  }, rpc: transport.rpc,
} }));
vi.mock('@/pages/utils/productService', () => ({ mergeVariationIntoCanonical: transport.merge }));
vi.mock('@/pages/utils/productService/productMutationService', () => ({ updateProduct: vi.fn() }));
vi.mock('@/pages/utils/productService/productLocalCache', () => ({ LOCAL_STORAGE_KEY: 'local_products', getLocalProducts: () => [], notifySubscribers: transport.notify }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sourceId = '00000000-0000-4000-8000-000000000001', targetId = '00000000-0000-4000-8000-000000000002';
const otherId = '00000000-0000-4000-8000-000000000003', parentId = '00000000-0000-4000-8000-000000000004';
const targetParentId = '00000000-0000-4000-8000-000000000005', supplierId = '00000000-0000-4000-8000-000000000006';
const extraSupplierId = '00000000-0000-4000-8000-000000000007';
const source = { variationId: sourceId, parentId, supplierId, name: 'Origem' };
const ack = { transferredSupplierIds: [extraSupplierId], canonicalSupplierIds: [supplierId, extraSupplierId] };
const option = (id = targetId, name = 'Destino') => ({ id, name, sku: 'D-01', merged_to_variation_id: null,
  product: { name: 'Pai', description: null, supplier_id: supplierId, main_supplier_id: null } });
let linked: boolean, hidden: boolean;
const identities = () => [
  { id: sourceId, product_id: parentId, merged_to_variation_id: linked ? targetId : null, active: !hidden, status: hidden ? 'hidden' : 'published' },
  { id: targetId, product_id: targetParentId, merged_to_variation_id: null, active: true, status: 'published' },
];
function read(query: Query): Response {
  if (query.table === 'products') return { data: { id: targetParentId, supplier_id: supplierId, main_supplier_id: null }, error: null };
  if (query.columns.startsWith('id, name')) return { data: [option()], error: null };
  return { data: identities(), error: null };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
async function open() { const props = { variation: source, onClose: vi.fn(), onMerged: vi.fn() }; return { ...render(<MergeVariationModal {...props} />), props }; }
async function choose() { fireEvent.change(screen.getByLabelText('Variação canônica de destino'), { target: { value: 'Destino' } }); await advance(250); fireEvent.click(screen.getByText('Destino')); await advance(); }
async function ready() { const s = await open(); await choose(); return s; }
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar mesclagem' }));
const merge = () => mergeVariationIntoCanonical(sourceId, targetId, { sourceParentId: parentId, supplierId });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); linked = false; hidden = false; localStorage.clear(); localStorage.setItem('local_products', 'before');
  transport.read.mockReset().mockImplementation(read);
  transport.write.mockReset().mockImplementation(() => { hidden = true; return { data: identities()[0], error: null, status: 200 }; });
  transport.rpc.mockReset().mockImplementation(async () => { linked = true; return { data: ack, error: null, status: 200 }; });
  transport.merge.mockReset().mockImplementation(mergeVariationIntoCanonical);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('mesclagem no modal/hook/resolver/serviços reais', () => {
  it('aguarda ocultação confirmada antes de sucesso/cache e envia os UUIDs parseados', async () => {
    const s = await ready(), response = deferred<Response>(); transport.write.mockReturnValue(response.promise);
    confirm(); await advance();
    expect(transport.rpc).toHaveBeenCalledOnce(); expect(transport.rpc).toHaveBeenCalledWith('merge_product_variation_into_canonical', { p_non_canonical_variation_id: sourceId, p_canonical_variation_id: targetId });
    expect(transport.write).toHaveBeenCalledWith(expect.objectContaining({ payload: { active: false, status: 'hidden' }, filters: { id: sourceId, merged_to_variation_id: targetId } }));
    expect(toast.success).not.toHaveBeenCalled(); expect(transport.notify).not.toHaveBeenCalled();
    response.resolve({ data: { ...identities()[0], active: false, status: 'hidden' }, error: null }); await advance();
    expect(s.props.onMerged).toHaveBeenCalledOnce(); expect(s.props.onClose).toHaveBeenCalledOnce(); expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1 fornecedor(es)'));
    expect(localStorage.getItem('local_products')).toBeNull();
  });
  it('trava cabeçalho, backdrop, Cancelar, Escape e submissões duplicadas', async () => {
    const s = await ready(), request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise);
    const button = screen.getByText('Confirmar mesclagem'); fireEvent.click(button); fireEvent.click(button); await advance();
    fireEvent.click(screen.getByLabelText('Fechar')); fireEvent.click(screen.getByText('Cancelar'));
    fireEvent.click(s.container.querySelector('[aria-hidden="true"]')!); fireEvent.keyDown(document, { key: 'Escape' });
    expect(s.props.onClose).not.toHaveBeenCalled(); expect(transport.rpc).toHaveBeenCalledOnce();
    linked = true; request.resolve({ data: ack, error: null, status: 200 }); await advance(); expect(s.props.onClose).toHaveBeenCalledOnce();
  });
  it('resposta vazia da RPC não é sucesso e permanece bloqueada ao reabrir', async () => {
    const s = await ready(); transport.rpc.mockResolvedValue({ data: null, error: null, status: 200 }); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(s.props.onMerged).not.toHaveBeenCalled(); expect(transport.write).not.toHaveBeenCalled();
    s.rerender(<MergeVariationModal {...s.props} variation={null} />); s.rerender(<MergeVariationModal {...s.props} />); await advance();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('falha de ocultação informa conclusão parcial sem repetir a RPC', async () => {
    await ready(); transport.write.mockResolvedValue({ data: null, error: { code: '42501' }, status: 403 }); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('Variações mescladas, mas a ocultação'); expect(toast.success).not.toHaveBeenCalled();
    expect(transport.rpc).toHaveBeenCalledOnce(); expect(transport.notify).not.toHaveBeenCalled(); expect(localStorage.getItem('local_products')).toBe('before');
  });
  it('trocar a abertura durante uma RPC invalida a publicação antiga', async () => {
    const s = await ready(), request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise); confirm(); await advance();
    s.rerender(<MergeVariationModal {...s.props} variation={null} />); s.rerender(<MergeVariationModal {...s.props} />); await advance();
    linked = true; request.resolve({ data: ack, error: null, status: 200 }); await advance();
    expect(toast.success).not.toHaveBeenCalled(); expect(transport.write).not.toHaveBeenCalled(); expect(s.props.onMerged).not.toHaveBeenCalled();
  });
  it('não reinicia seleção ao receber nova referência da mesma origem', async () => {
    const s = await ready(); s.rerender(<MergeVariationModal {...s.props} variation={{ ...source }} />); await advance();
    expect((screen.getByLabelText('Variação canônica de destino') as HTMLInputElement).value).toBe('Destino'); confirm(); await advance(); expect(s.props.onMerged).toHaveBeenCalledOnce();
  });
  it('busca falha não aparece como ausência e admite repetição explícita', async () => {
    transport.read.mockImplementation((query) => query.columns.startsWith('id, name') ? { data: null, error: { message: 'offline' } } : read(query));
    await open(); fireEvent.change(screen.getByLabelText('Variação canônica de destino'), { target: { value: 'Destino' } });
    expect(screen.queryByText('Nenhuma variação encontrada.')).toBeNull(); await advance(250);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível buscar'); expect(screen.queryByText('Nenhuma variação encontrada.')).toBeNull();
    transport.read.mockImplementation(read); fireEvent.click(screen.getByText('Buscar novamente')); await advance(250); expect(screen.getByText('Destino')).toBeTruthy();
  });
  it('descarta busca antiga e seleção capturada antes de trocar o texto', async () => {
    const old = deferred<Response>(); transport.read.mockImplementationOnce(() => old.promise);
    const s = renderHook(() => useMergeVariation(source, vi.fn(), vi.fn()));
    act(() => s.result.current.setQuery('Antigo')); await advance(250); act(() => s.result.current.setQuery('Destino')); await advance(250);
    const oldChoice = s.result.current.setTarget;
    act(() => s.result.current.setQuery('Nova busca')); await advance(250); act(() => oldChoice(option()));
    old.resolve({ data: [option(otherId, 'Antigo')], error: null }); await advance();
    expect(s.result.current.target).toBeNull(); expect(s.result.current.options.map((row) => row.name)).toEqual(['Destino']); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('confirmação antiga não usa seleção substituída após nova busca', async () => {
    const s = renderHook(() => useMergeVariation(source, vi.fn(), vi.fn()));
    act(() => s.result.current.setQuery('Destino')); await advance(250); act(() => s.result.current.setTarget(option())); await advance();
    const oldConfirm = s.result.current.confirm;
    act(() => s.result.current.setQuery('Outra')); await advance(250); act(() => s.result.current.setTarget(option())); await advance();
    await act(async () => { await oldConfirm(); }); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('rejeição SQL conhecida mantém a seleção e permite repetir explicitamente', async () => {
    await ready(); transport.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' }, status: 403 }); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('Confira os dados'); confirm(); await advance(); expect(transport.rpc).toHaveBeenCalledTimes(2); expect(toast.success).toHaveBeenCalledOnce();
  });
  it('limita o callback inteiro a 60s e invalida confirmação tardia', async () => {
    const s = await ready(), request = deferred<unknown>(); transport.merge.mockReturnValue(request.promise); confirm(); await advance();
    const guard = transport.merge.mock.calls[0][3]; expect(guard()).toBe(true); await advance(60000);
    expect(guard()).toBe(false); expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    request.resolve(ack); await advance(); expect(s.props.onMerged).not.toHaveBeenCalled(); expect(screen.queryByText('Mesclando e confirmando o vínculo e a ocultação...')).toBeNull();
  });
  it('sucesso seguido de fechamento não cria bloqueio incerto; o preflight reconhece a origem já mesclada', async () => {
    const s = await ready(); confirm(); await advance(); expect(s.props.onMerged).toHaveBeenCalledOnce();
    s.rerender(<MergeVariationModal {...s.props} variation={null} />); s.rerender(<MergeVariationModal {...s.props} />); await choose();
    expect(screen.queryByRole('alert')).toBeNull(); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('origem já foi mesclada'); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('busca vencida libera o progresso e ignora resultados tardios', async () => {
    const request = deferred<Response>(); transport.read.mockReturnValue(request.promise); await open();
    fireEvent.change(screen.getByLabelText('Variação canônica de destino'), { target: { value: 'Destino' } }); await advance(10250);
    expect(screen.getByRole('alert').textContent).toContain('prazo'); expect(screen.queryByText('Buscando variações canônicas...')).toBeNull();
    request.resolve({ data: [option()], error: null }); await advance(); expect(screen.queryByText('Destino')).toBeNull(); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('contrato de consulta rejeita UUID inválido antes de acessar o transporte', async () => {
    render(<MergeVariationModal variation={{ ...source, variationId: 'legacy' }} onClose={vi.fn()} onMerged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Variação canônica de destino'), { target: { value: 'Destino' } }); await advance(250);
    expect(screen.getByRole('alert').textContent).toContain('UUID válido'); expect(transport.read).not.toHaveBeenCalled();
  });
  it('callback sem confirmação mantém o resolver até rejeitar a operação, sem sucesso', async () => {
    const s = await ready(); transport.merge.mockResolvedValue(undefined); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(s.props.onMerged).not.toHaveBeenCalled();
  });
});

describe('fronteiras da RPC, identidade e busca', () => {
  it.each([null, {}, { transferredSupplierIds: [] }, { transferredSupplierIds: [extraSupplierId, extraSupplierId], canonicalSupplierIds: [] },
    { transferredSupplierIds: ['legacy'], canonicalSupplierIds: ['legacy'] }])('rejeita ACK inválido %j', async (data) => {
    transport.rpc.mockResolvedValue({ data, error: null, status: 200 }); await expect(merge()).rejects.toMatchObject({ uncertain: true });
    expect(transport.write).not.toHaveBeenCalled(); expect(transport.notify).not.toHaveBeenCalled();
  });
  it('aceita listas explicitamente vazias e dispensa UPDATE se a origem já foi ocultada pela RPC', async () => {
    transport.rpc.mockImplementation(async () => { linked = true; hidden = true; return { data: { transferredSupplierIds: [], canonicalSupplierIds: [] }, error: null, status: 200 }; });
    await expect(merge()).resolves.toEqual({ transferredSupplierIds: [], canonicalSupplierIds: [] }); expect(transport.write).not.toHaveBeenCalled();
  });
  it('rejeita UUID inválido e destino igual antes de consultar ou gravar', async () => {
    await expect(mergeVariationIntoCanonical('legacy', targetId)).rejects.toThrow(); await expect(mergeVariationIntoCanonical(sourceId, sourceId)).rejects.toThrow();
    expect(transport.read).not.toHaveBeenCalled(); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('origem já mesclada impede retransmissão até em uma instância nova', async () => {
    linked = true; await expect(merge()).rejects.toThrow('origem já foi mesclada'); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('mudança de pai ou fornecedor antes do envio é rejeitada', async () => {
    await expect(mergeVariationIntoCanonical(sourceId, targetId, { sourceParentId: otherId })).rejects.toThrow('mudou de produto pai');
    transport.read.mockImplementation((query) => query.table === 'products' ? { data: { id: targetParentId, supplier_id: otherId }, error: null } : read(query));
    await expect(merge()).rejects.toThrow('fornecedor do destino mudou'); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('não grava em ambiente sem a identidade ou os campos necessários', async () => {
    transport.read.mockResolvedValue({ data: null, error: { code: '42703' } }); await expect(merge()).rejects.toThrow('configuração'); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it.each(['missing', 'identity', 'pointer'])('rejeita confirmação divergente depois do ACK: %s', async (kind) => {
    transport.read.mockImplementation((query) => {
      if (query.table === 'product_variations' && !query.columns.startsWith('id, name') && linked) return { data: kind === 'missing' ? [] : identities().map((row, index) => index ? row : { ...row, ...(kind === 'identity' ? { id: otherId } : { merged_to_variation_id: otherId }) }), error: null };
      return read(query);
    });
    await expect(merge()).rejects.toMatchObject({ uncertain: true }); expect(transport.write).not.toHaveBeenCalled();
  });
  it.each(['empty', 'identity', 'pointer', 'active', 'status'])('confere o UPDATE de ocultação: %s', async (kind) => {
    const fields = { identity: { id: otherId }, pointer: { merged_to_variation_id: otherId }, active: { active: true }, status: { status: 'published' } };
    transport.write.mockImplementation(() => ({ data: kind === 'empty' ? null : { ...identities()[0], active: false, status: 'hidden', ...fields[kind as keyof typeof fields] }, error: null }));
    await expect(merge()).rejects.toMatchObject({ uncertain: true, message: expect.stringContaining('Variações mescladas, mas') }); expect(transport.notify).not.toHaveBeenCalled();
  });
  it('timeout da RPC não oculta, não publica e ignora resposta tardia', async () => {
    const request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise); const result = merge().catch((error) => error);
    await vi.advanceTimersByTimeAsync(20000); expect(await result).toMatchObject({ uncertain: true }); request.resolve({ data: ack, error: null }); await vi.advanceTimersByTimeAsync(0);
    expect(transport.write).not.toHaveBeenCalled(); expect(transport.notify).not.toHaveBeenCalled();
  });
  it('tempo limite do preflight não permite RPC tardia', async () => {
    const request = deferred<Response>(); transport.read.mockReturnValue(request.promise); const result = merge().catch((error) => error);
    await vi.advanceTimersByTimeAsync(10000); expect((await result).message).toContain('confirmar as variações');
    request.resolve({ data: identities(), error: null }); await vi.advanceTimersByTimeAsync(0); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('busca usa padrão literal cotado e fornecedor no alias product', async () => {
    const query = 'Mesa %_*+(),:"\\'; await searchCanonicalVariations({ sourceId, supplierId, query }, () => true);
    const request = transport.read.mock.calls[0][0]; expect(request.ors[1]).toEqual({ value: `supplier_id.eq.${supplierId},main_supplier_id.eq.${supplierId}`, scope: { referencedTable: 'product' } });
    const quoted = request.ors[0].value.split('name.imatch.')[1].split(',sku.imatch.')[0];
    expect(new RegExp(JSON.parse(quoted), 'i').test(query)).toBe(true); expect(new RegExp(JSON.parse(quoted), 'i').test('Mesa qualquer')).toBe(false);
  });
  it('retira origem/aliases e fornecedores diferentes dos resultados recebidos', async () => {
    transport.read.mockResolvedValue({ data: [option(), option(sourceId), { ...option(otherId), merged_to_variation_id: targetId },
      { ...option(otherId), product: { supplier_id: otherId } }], error: null });
    expect((await searchCanonicalVariations({ sourceId, supplierId, query: 'dest' }, () => true)).map((row) => row.id)).toEqual([targetId]);
  });
  it.each(['before', 'after'])('rejeita destino que deixou de ser canônico: %s', async (phase) => {
    transport.read.mockImplementation((query) => query.table === 'product_variations' && !query.columns.startsWith('id, name')
      ? { data: identities().map((row, index) => index && (phase === 'before' || linked) ? { ...row, merged_to_variation_id: otherId } : row), error: null } : read(query));
    await expect(merge()).rejects.toThrow(phase === 'before' ? 'destino já aponta' : 'não foi confirmada');
    expect(transport.rpc).toHaveBeenCalledTimes(phase === 'before' ? 0 : 1); expect(transport.write).not.toHaveBeenCalled();
  });
  it.each(['transport', 'connection', 'server'])('reconhece resposta incerta %s sem ocultar ou publicar', async (kind) => {
    if (kind === 'transport') transport.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    if (kind === 'connection') transport.rpc.mockResolvedValue({ data: null, error: { code: '08006' }, status: 503 });
    if (kind === 'server') transport.rpc.mockResolvedValue({ data: null, error: { code: 'XX000' }, status: 500 });
    await expect(merge()).rejects.toMatchObject({ uncertain: true }); expect(transport.write).not.toHaveBeenCalled(); expect(transport.notify).not.toHaveBeenCalled();
  });
  it('não inicia RPC depois que o contexto muda na consulta anterior', async () => {
    let current = true; transport.read.mockImplementation(async (query) => { current = false; return read(query); });
    await expect(mergeVariationIntoCanonical(sourceId, targetId, {}, () => current)).rejects.toThrow('contexto'); expect(transport.rpc).not.toHaveBeenCalled();
  });
});
