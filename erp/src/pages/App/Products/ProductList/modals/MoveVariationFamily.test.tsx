// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveVariationFamilyModal, type MoveVariationFamilyModalProps } from './MoveVariationFamilyModal';
import { moveVariationToFamily } from '@/pages/utils/productService/productVariationActionsService';
import { fetchVariationFamilies, fetchVariationFamilyConflict } from '@/pages/utils/productService/productVariationFamilyQueries';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { toast } from 'react-toastify';
import {
  canAddVariationFamilyAttribute,
  toFamilyAttributes,
  sameFamilyAttributes,
} from '../../../../../../../shared-utils/variationFamilyFormSchemas';
import { variationFamilyFormSchema } from '../../../../../../../shared-utils/catalogFormSchemas';
import { useMoveVariationFamily } from './MoveVariationFamily/useMoveVariationFamily';

type Query = { table: string; columns: string; filters: Record<string, unknown>; payload?: unknown; range?: number[]; options?: unknown };
type Response = { data: unknown; error: unknown; count?: number; status?: number };
const transport = vi.hoisted(() => ({ read: vi.fn<(query: Query) => unknown>(), write: vi.fn<(query: Query) => unknown>(), rpc: vi.fn(), notify: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => {
  const client = { from: (table: string) => {
    const request: Query = { table, columns: '', filters: {} }; let writing = false;
    const resolve = () => writing ? transport.write(request) : transport.read(request);
    const builder = {
      select(columns: string, options?: unknown) { request.columns = columns; request.options = options; return this; },
      eq(key: string, value: unknown) { request.filters[key] = value; return this; },
      ilike(key: string, value: unknown) { request.filters[key] = value; return this; },
      filter(key: string, _operator: string, value: unknown) { request.filters[key] = value; return this; },
      neq() { return this; }, not() { return this; }, order() { return this; }, limit() { return this; },
      range(from: number, to: number) { request.range = [from, to]; return this; },
      insert(payload: unknown) { writing = true; request.payload = payload; return this; },
      single: () => Promise.resolve(resolve()), maybeSingle: () => Promise.resolve(resolve()),
      then: (done: (value: unknown) => unknown, fail?: (error: unknown) => unknown) => Promise.resolve(resolve()).then(done, fail),
    }; return builder;
  }, rpc: transport.rpc };
  return { supabase: client, ecommerceSupabase: client };
});
vi.mock('@/pages/utils/productService', async () => ({ moveVariationToFamily: (await vi.importActual<typeof import('@/pages/utils/productService/productVariationActionsService')>('@/pages/utils/productService/productVariationActionsService')).moveVariationToFamily }));
vi.mock('@/pages/utils/productService/productMutationService', () => ({ updateProduct: vi.fn() }));
vi.mock('@/pages/utils/productService/productLocalCache', () => ({ LOCAL_STORAGE_KEY: 'local_products', getLocalProducts: () => [], notifySubscribers: transport.notify }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sourceId = '00000000-0000-4000-8000-000000000001', parentId = '00000000-0000-4000-8000-000000000002';
const targetId = '00000000-0000-4000-8000-000000000003', otherId = '00000000-0000-4000-8000-000000000004';
const image = 'https://example.test/photo.png';
const source = { id: sourceId, variationId: sourceId, parentId, name: 'Origem Azul', attributes: [{ name: ' Cor ', value: ' azul ', showName: false }] } as unknown as NonNullable<MoveVariationFamilyModalProps['variation']>;
let sourceImages: unknown, finalRow: Record<string, unknown>, count: number, ack: { newSku: string; sourceParentRemoved: boolean }, destinationPhotos: string[];
function read(query: Query): Response {
  if (query.table === 'products') return { data: query.columns === 'id, deleted' ? { id: parentId, deleted: true } : [
    { id: targetId, name: 'Nova Mesa', code: '200' }, { id: otherId, name: 'Outra Mesa', code: '300' }, { id: parentId, name: 'Origem', code: '100' },
  ], error: null };
  if (query.table === 'product_variations') {
    if (query.columns === 'id') return { data: null, error: null, count };
    if (query.columns === 'id, attributes') return { data: [], error: null };
    if (query.columns.includes('sku')) return { data: finalRow, error: null };
    return { data: { id: sourceId, product_id: parentId, images: sourceImages }, error: null };
  }
  if (query.table === 'product_images') return { data: (query.filters.product_id === parentId ? [image] : destinationPhotos).map((image_url) => ({ image_url })), error: null };
  if (query.table === 'attributes') return { data: [{ id: 'attribute', name: 'Cor' }], error: null };
  if (query.table === 'attribute_values') return { data: [{ value: 'Azul' }], error: null };
  throw new Error(`Unexpected table: ${query.table}`);
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
async function open(variation = source) {
  const props = { variation, onClose: vi.fn(), onMoved: vi.fn() };
  const view = render(<MoveVariationFamilyModal {...props} />); await advance(); return { ...view, props };
}
async function choose(name = 'Nova Mesa') {
  fireEvent.change(screen.getByLabelText('Novo produto pai'), { target: { value: name } });
  fireEvent.click(screen.getByText(name)); await advance(150);
}
async function ready() { const view = await open(); await choose(); await advance(5000); return view; }
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar mudança' }));
const move = () => moveVariationToFamily(sourceId, targetId, [{ name: 'Cor', value: 'Azul', showName: false }], 'Nova Mesa Azul', [image], parentId);
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); localStorage.setItem('local_products', 'before');
  sourceImages = [image]; count = 2; destinationPhotos = [image]; ack = { newSku: '200-01', sourceParentRemoved: false };
  finalRow = { id: sourceId, product_id: targetId, sku: '200-01', name: 'Nova Mesa Azul', attributes: [{ name: 'Cor', value: 'Azul', showName: false }], images: [image] };
  transport.read.mockReset().mockImplementation(read);
  transport.write.mockReset().mockImplementation((query) => ({ data: query.payload, error: null, status: 201 }));
  transport.rpc.mockReset().mockImplementation(async () => ({ data: ack, error: null, status: 200 }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('mudança de família com modal, filhos, RHF e serviços reais', () => {
  it('uma confirmação capturada antes de editar não pode usar a revisão anterior', async () => {
    const s = renderHook(() => useMoveVariationFamily(source, vi.fn(), vi.fn())); await advance();
    act(() => s.result.current.setTargetFamilyId(targetId)); await advance(150); await advance(5000);
    expect(s.result.current.canConfirm).toBe(true); const oldConfirm = s.result.current.handleConfirm;
    act(() => s.result.current.updateAttribute(0, 'value', 'Verde'));
    await act(async () => { await oldConfirm(); });
    expect(transport.rpc).not.toHaveBeenCalled();
    await advance(150); await advance(5000); expect(s.result.current.canConfirm).toBe(true);
    await act(async () => { await oldConfirm(); }); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('aguarda conflito e contagem, preserva UUID/showName e só publica após confirmação', async () => {
    const s = await ready(); confirm(); await advance();
    expect(transport.rpc).toHaveBeenCalledOnce(); expect(transport.rpc).toHaveBeenCalledWith('move_variation_to_parent', {
      p_variation_id: sourceId, p_target_parent_id: targetId, p_source_parent_id: parentId,
      p_attributes: [{ name: 'Cor', value: 'Azul', showName: false }], p_name: 'Nova Mesa Azul', p_images: [image],
    });
    expect(s.props.onMoved).toHaveBeenCalledOnce(); expect(s.props.onClose).toHaveBeenCalledOnce(); expect(toast.success).toHaveBeenCalledOnce();
    expect(transport.notify).toHaveBeenCalledOnce(); expect(localStorage.getItem('local_products')).toBeNull();
  });
  it('a contagem só começa depois da consulta de conflitos e reinicia quando os atributos mudam', async () => {
    const request = deferred<Response>(); transport.read.mockImplementation((query) => query.columns === 'id, attributes' ? request.promise : read(query));
    await open(); await choose(); await advance(6000); expect(transport.rpc).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Conferindo dados…' }).hasAttribute('disabled')).toBe(true);
    request.resolve({ data: [], error: null }); await advance(); expect(screen.getByText('Confirmar em 5s')).toBeTruthy();
    await advance(5000); fireEvent.change(screen.getByLabelText('Valor do atributo 1'), { target: { value: 'Azul ' } });
    expect(screen.getByRole('button', { name: 'Conferindo dados…' }).hasAttribute('disabled')).toBe(true); expect(transport.rpc).not.toHaveBeenCalled();
    await advance(150); expect(screen.getByText('Confirmar em 5s')).toBeTruthy();
  });
  it('permite completar atributos ausentes e não descarta linhas incompletas', async () => {
    await open({ ...source, attributes: [] }); await choose(); fireEvent.click(screen.getByText('Adicionar atributo'));
    fireEvent.change(screen.getByLabelText('Nome do atributo 1'), { target: { value: 'Cor' } }); await advance(6000);
    expect(screen.getByRole('alert').textContent).toContain('valor do atributo'); expect(transport.rpc).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Valor do atributo 1'), { target: { value: 'Azul' } }); await advance(150); await advance(5000);
    finalRow.attributes = [{ name: 'Cor', value: 'Azul' }]; confirm(); await advance(); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('só permite acrescentar um atributo quando a variação ainda não possui nenhum', async () => {
    expect(canAddVariationFamilyAttribute([])).toBe(true);
    expect(canAddVariationFamilyAttribute([{ name: 'Cor', value: 'Azul' }])).toBe(false);

    await open();
    expect(screen.queryByRole('button', { name: 'Adicionar atributo' })).toBeNull();
    expect(screen.getByLabelText('Nome do atributo 1')).toBeTruthy();

    cleanup();
    await open({ ...source, attributes: [] });
    expect(screen.getByRole('button', { name: 'Adicionar atributo' })).toBeTruthy();
  });
  it('bloqueia cliques duplicados, cabeçalho, Cancelar e Escape enquanto aguarda a RPC', async () => {
    const s = await ready(), request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise);
    const button = screen.getByRole('button', { name: 'Confirmar mudança' }); fireEvent.click(button); fireEvent.click(button); await advance();
    fireEvent.click(screen.getByLabelText('Fechar')); fireEvent.click(screen.getByText('Cancelar')); fireEvent.keyDown(document, { key: 'Escape' });
    expect(s.props.onClose).not.toHaveBeenCalled(); expect(transport.rpc).toHaveBeenCalledOnce();
    request.resolve({ data: ack, error: null, status: 200 }); await advance(); expect(s.props.onClose).toHaveBeenCalledOnce();
  });
  it('guarda incerta persiste ao fechar/reabrir e respostas antigas não publicam sucesso', async () => {
    const s = await ready(), request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise); confirm(); await advance();
    s.rerender(<MoveVariationFamilyModal {...s.props} variation={null} />); s.rerender(<MoveVariationFamilyModal {...s.props} />); await advance();
    request.resolve({ data: ack, error: null, status: 200 }); await advance();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(s.props.onMoved).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
    expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('falha de contagem é visível e repetir consulta preserva os atributos do rascunho', async () => {
    transport.read.mockImplementation((query) => query.columns === 'id' ? { data: null, error: { message: 'offline' }, count: null } : read(query));
    await open(); expect(screen.getByRole('alert').textContent).toContain('produto de origem');
    expect(screen.queryByText('Esta é a única variação deste produto.')).toBeNull();
    transport.read.mockImplementation(read); fireEvent.click(screen.getByText('Consultar novamente')); await advance();
    expect(screen.queryByRole('alert')).toBeNull(); expect((screen.getByLabelText('Nome do atributo 1') as HTMLInputElement).value).toBe(' Cor ');
  });
  it('mudança confirmada com fotos pendentes mostra resultado parcial e impede novo envio', async () => {
    const s = await ready(); destinationPhotos = []; transport.write.mockResolvedValue({ data: null, error: { code: '42501' }, status: 403 });
    confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('foi movida, mas');
    expect(s.props.onMoved).not.toHaveBeenCalled(); expect(transport.notify).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
    expect(transport.write).toHaveBeenCalledOnce();
  });
  it('confere as imagens inseridas no pai sem apagar as existentes', async () => {
    await ready(); destinationPhotos = ['https://example.test/existing.png']; confirm(); await advance();
    expect(transport.write).toHaveBeenCalledWith(expect.objectContaining({ table: 'product_images', payload: [{ product_id: targetId, image_url: image, is_main: false }] }));
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('timeout não confirma, não repete nem consulta a resposta tardia da RPC', async () => {
    const s = await ready(), request = deferred<Response>(); transport.rpc.mockReturnValue(request.promise); confirm(); await advance(20000);
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); request.resolve({ data: ack, error: null, status: 200 }); await advance();
    expect(s.props.onMoved).not.toHaveBeenCalled(); expect(transport.read.mock.calls.some(([query]) => query.columns.includes('sku, name'))).toBe(false);
    expect(transport.notify).not.toHaveBeenCalled();
  });
  it('rejeição SQL conhecida mantém rascunho e permite repetição explícita', async () => {
    const s = await ready(); transport.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505' }, status: 400 });
    confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('Não foi possível mover');
    expect(s.props.onMoved).not.toHaveBeenCalled(); confirm(); await advance(); expect(transport.rpc).toHaveBeenCalledTimes(2); expect(s.props.onMoved).toHaveBeenCalledOnce();
  });
  it('herda fotos confirmadas da origem quando a variação não tem fotos explícitas', async () => {
    sourceImages = []; await ready(); confirm(); await advance();
    expect(transport.rpc.mock.calls[0][1].p_images).toEqual([image]); expect(toast.success).toHaveBeenCalledOnce();
  });
  it('falha na consulta de conflito não permite confirmar e pode ser consultada novamente', async () => {
    transport.read.mockImplementation((query) => query.columns === 'id, attributes' ? { data: null, error: { message: 'offline' } } : read(query));
    await open(); await choose(); await advance(6000); expect(screen.getByRole('alert').textContent).toContain('validar as variações');
    expect(transport.rpc).not.toHaveBeenCalled(); transport.read.mockImplementation(read);
    fireEvent.click(screen.getByText('Validar destino novamente')); await advance(150); await advance(5000);
    confirm(); await advance(); expect(transport.rpc).toHaveBeenCalledOnce();
  });
  it('não solicita páginas adicionais quando o prazo do proprietário já venceu', async () => {
    const page = Array.from({ length: 1000 }, () => ({ id: otherId, attributes: { Cor: 'Verde' } }));
    transport.read.mockImplementation((query) => query.columns === 'id, attributes'
      ? new Promise((resolve) => setTimeout(() => resolve({ data: page, error: null }), 6000)) : read(query));
    await open(); await choose(); await advance(11000); expect(screen.getByRole('alert').textContent).toContain('prazo');
    await advance(1000);
    expect(transport.read.mock.calls.filter(([query]) => query.columns === 'id, attributes')).toHaveLength(2);
    expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('a resposta de um destino anterior não substitui a validação do destino atual', async () => {
    const old = deferred<Response>(); transport.read.mockImplementation((query) => query.columns === 'id, attributes' && query.filters.product_id === targetId ? old.promise : read(query));
    await open(); await choose(); await choose('Outra Mesa'); await advance(5000);
    old.resolve({ data: [{ id: otherId, attributes: { Cor: 'Azul' } }], error: null }); await advance();
    finalRow = { ...finalRow, product_id: otherId, sku: '300-01', name: 'Outra Mesa Azul' }; ack.newSku = '300-01';
    confirm(); await advance(); expect(transport.rpc.mock.calls[0][1].p_target_parent_id).toBe(otherId); expect(toast.success).toHaveBeenCalledOnce();
  });
  it('excesso de fotos é bloqueado antes de cadastrar atributos ou mover', async () => {
    sourceImages = Array.from({ length: 16 }, (_, index) => `https://example.test/${index}.png`);
    await ready(); confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('15 fotos');
    expect(transport.read.mock.calls.some(([query]) => query.table === 'attributes')).toBe(false); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it('o prazo total inclui os atributos e impede mover depois de 60s', async () => {
    const attributes = ['Cor', 'Tamanho', 'Modelo', 'Largura'].map((name) => ({ name, value: 'Azul' }));
    transport.read.mockImplementation((query) => {
      if (query.table === 'attributes' || query.table === 'attribute_values') return new Promise((resolve) => setTimeout(() => resolve({
        data: query.table === 'attributes' ? [{ id: 'attr', name: String(query.filters.name).slice(1, -1) }] : [{ value: 'Azul' }], error: null,
      }), 8000));
      return read(query);
    });
    await open({ ...source, attributes }); await choose(); await advance(5000); confirm(); await advance(60000);
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    await advance(5000); expect(transport.rpc).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('fronteiras dos helpers reais da mudança de família', () => {
  it('aceita atributos legados sem showName como visíveis, mas não perde ocultação explícita', async () => {
    finalRow.attributes = { Cor: 'Azul' };
    await expect(moveVariationToFamily(sourceId, targetId, [{ name: 'Cor', value: 'Azul', showName: true }], 'Nova Mesa Azul', [image], parentId)).resolves.toEqual(ack);
    await expect(move()).rejects.toMatchObject({ uncertain: true });
  });
  it.each([null, {}, { newSku: '', sourceParentRemoved: false }, { newSku: '200-01' }])('rejeita ACK incompleto %j sem publicar cache ou vincular fotos', async (data) => {
    transport.rpc.mockResolvedValue({ data, error: null, status: 200 }); await expect(move()).rejects.toMatchObject({ uncertain: true });
    expect(transport.notify).not.toHaveBeenCalled(); expect(transport.write).not.toHaveBeenCalled();
  });
  it.each(['id', 'product_id', 'sku', 'name', 'images', 'attributes'])('rejeita confirmação divergente de %s', async (field) => {
    finalRow[field] = field === 'images' || field === 'attributes' ? [] : 'different';
    await expect(move()).rejects.toMatchObject({ uncertain: true }); expect(transport.notify).not.toHaveBeenCalled();
  });
  it('valida UUID/destino/atributos antes do primeiro I/O', async () => {
    await expect(moveVariationToFamily('legacy', targetId, [], 'Nome', [], parentId)).rejects.toThrow();
    await expect(moveVariationToFamily(sourceId, parentId, [{ name: 'Cor', value: 'Azul' }], 'Nome', [], parentId)).rejects.toThrow();
    expect(transport.rpc).not.toHaveBeenCalled(); expect(transport.read).not.toHaveBeenCalled();
  });
  it('confere remoção do pai antigo quando a RPC confirma última variação', async () => {
    ack.sourceParentRemoved = true; await expect(move()).resolves.toMatchObject({ sourceParentRemoved: true });
    expect(transport.read).toHaveBeenCalledWith(expect.objectContaining({ table: 'products', columns: 'id, deleted', filters: { id: parentId } }));
  });
  it('confere inserções dos atributos canônicos e não aceita INSERT sem linha', async () => {
    transport.read.mockImplementation((query) => query.table === 'attributes' || query.table === 'attribute_values' ? { data: [], error: null } : read(query));
    transport.write.mockImplementation((query) => ({ data: query.table === 'attributes' ? { id: 'attr', name: 'Cor' } : { value: 'Azul' }, error: null, status: 201 }));
    await expect(ensureAttributeValue(' cor ', ' azul ')).resolves.toEqual({ name: 'Cor', value: 'Azul' });
    transport.write.mockResolvedValue({ data: null, error: null, status: 201 });
    await expect(ensureAttributeValue('Cor', 'Azul')).rejects.toMatchObject({ uncertain: true });
  });
  it('consulta famílias e conflitos além da primeira página sem declarar ausência prematura', async () => {
    const entries = Array.from({ length: 1000 }, (_, index) => ({ id: `00000000-0000-4000-8000-${(index + 100).toString().padStart(12, '0')}`, name: 'Família', code: String(index) }));
    transport.read.mockImplementation((query) => ({ data: query.range?.[0] === 0 ? entries : query.table === 'products' ? [{ id: targetId, name: 'Última', code: 'last' }] : [{ id: otherId, attributes: { Cor: 'Azul' } }], error: null }));
    expect(await fetchVariationFamilies({ sourceId }, () => true)).toHaveLength(1001);
    expect(await fetchVariationFamilyConflict({ sourceId, familyId: targetId, attributes: [{ name: 'Cor', value: 'Azul' }] }, () => true)).toBe(true);
  });
  it('não cria atributos depois de uma consulta vencida ou de uma mudança de contexto', async () => {
    const request = deferred<Response>(); transport.read.mockReturnValue(request.promise);
    const result = ensureAttributeValue('Cor', 'Azul').catch((error) => error);
    await vi.advanceTimersByTimeAsync(10000); expect((await result).message).toContain('prazo');
    request.resolve({ data: [], error: null }); await vi.advanceTimersByTimeAsync(0); expect(transport.write).not.toHaveBeenCalled();
    let current = true; const next = deferred<Response>(); transport.read.mockReturnValue(next.promise);
    const operation = ensureAttributeValue('Cor', 'Azul', () => current).catch((error) => error); current = false;
    next.resolve({ data: [], error: null }); expect((await operation).message).toContain('contexto'); expect(transport.write).not.toHaveBeenCalled();
  });
  it('consulta porcentagem, sublinhado, asterisco e operadores como valores literais', async () => {
    transport.read.mockImplementation((query) => query.table === 'attribute_values' ? { data: [{ value: '100%_*+()' }], error: null } : read(query));
    await expect(ensureAttributeValue('Cor', '100%_*+()')).resolves.toMatchObject({ value: '100%_*+()' });
    expect(transport.read).toHaveBeenCalledWith(expect.objectContaining({ table: 'attribute_values', filters: expect.objectContaining({ value: '^100%_\\*\\+\\(\\)$' }) }));
  });
  it('preserva zero e rejeita combinações vazias, incompletas ou com nomes repetidos', () => {
    expect(toFamilyAttributes({ Quantidade: 0 })).toEqual([{ name: 'Quantidade', value: '0' }]);
    expect(sameFamilyAttributes([{ name: 'Quantidade', value: '0' }], toFamilyAttributes({ Quantidade: 0 }))).toBe(true);
    for (const attributes of [[], [{ name: 'Cor', value: '' }], [{ name: 'Cor', value: 'Azul' }, { name: ' cor ', value: 'Verde' }]]) {
      expect(variationFamilyFormSchema.safeParse({ sourceId, familyId: targetId, attributes }).success).toBe(false);
    }
  });
});
