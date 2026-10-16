import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'operator' }, loading: false }, calls: [] as any[],
  reply: null as null | ((call: any) => any), error: vi.fn(), success: vi.fn(),
}));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: (table: string) => {
  const call: any = { table, action: 'read', payload: undefined, filters: {} };
  const builder: any = {
    select: () => builder,
    insert: (payload: any) => { call.action = 'insert'; call.payload = payload; return builder; },
    update: (payload: any) => { call.action = 'update'; call.payload = payload; return builder; },
    upsert: (payload: any) => { call.action = 'upsert'; call.payload = payload; return builder; },
    delete: () => { call.action = 'delete'; return builder; },
    eq: (key: string, value: any) => { call.filters[key] = value; return builder; },
    neq: () => builder, not: () => builder,
    then: (resolve: any, reject: any) => {
      mocks.calls.push(call);
      let result = mocks.reply?.(call);
      if (result === undefined) {
        const data = call.action === 'read' || call.action === 'delete' ? []
          : table === 'products' ? [{ id: call.filters.id || 'created', status: 'draft', ...(Array.isArray(call.payload) ? call.payload[0] : call.payload) }]
          : table === 'product_variations' && call.action === 'update' ? []
          : call.payload.map((row: any, i: number) => ({ id: `row-${i}`, ...row }));
        result = { data, error: null };
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
} } }));
import { useAdminProductSave } from '../../../digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductSave';

const formData = { name: 'Mesa', slug: 'mesa', description: '', price: '1.250,50', promo_price: '', is_salvado: false, opportunity_id: null, category_ids: ['34d868e3-64fd-4909-a126-bdbf96b03b9b'], width: '', depth: '', height: '', depth_use_length: false, images: [] };
const props = () => ({ formData: { ...formData }, setFormData: vi.fn(), productVariations: [], setProductVariations: vi.fn(), variationsEnabled: false, currentProduct: { id: 'existing', status: 'draft' } as any, setCurrentProduct: vi.fn(), isOpen: true, isLoaded: { current: true }, onOpenChange: vi.fn(), onSuccess: vi.fn() });
const writes = () => mocks.calls.filter((call) => call.action !== 'read');
beforeEach(() => {
  vi.clearAllMocks(); mocks.calls = []; mocks.reply = null; mocks.auth = { user: { id: 'operator' }, loading: false };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  vi.stubGlobal('BroadcastChannel', class { postMessage = vi.fn(); close = vi.fn(); });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('proprietário administrativo de produto no catálogo', () => {
  it('does not autosave its own confirmed variation state and retains allocated row identity', async () => {
    vi.useFakeTimers();
    const owner = props();
    const { result } = renderHook(() => {
      const [product, setProduct] = useState(owner.formData);
      const [variations, setVariations] = useState<any[]>([{ name: 'Azul', attributes: { Cor: 'Azul' }, stock: '0' }]);
      return { ...useAdminProductSave({ ...owner, formData: product, setFormData: setProduct, productVariations: variations, setProductVariations: setVariations, variationsEnabled: true }), variations, setVariations };
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    const initialCount = writes().length;
    const id = result.current.variations[0].id;
    expect(id).toBeTruthy();
    expect(writes().find((call) => call.table === 'product_variations' && call.action === 'upsert').payload[0].id).toBe(id);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(writes()).toHaveLength(initialCount);
    act(() => result.current.setVariations((current) => current.map((item) => ({ ...item, stock: '2' }))));
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(writes().filter((call) => call.table === 'product_variations' && call.action === 'upsert').at(-1).payload[0]).toMatchObject({ id, stock: 2 });
  });
  it('bloqueia publicação inválida antes da consulta e preserva rascunho incompleto', async () => {
    const owner = props(); owner.formData = { ...formData, slug: '', category_ids: [] };
    const { result } = renderHook(() => useAdminProductSave(owner));
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.calls).toHaveLength(0); expect(mocks.error).toHaveBeenCalled();
    await act(async () => { await result.current.triggerAutoSave(); });
    expect(writes().find((call) => call.table === 'products').payload).toMatchObject({ slug: 'mesa', price: 1250.5, status: 'draft' });
    expect(owner.onOpenChange).not.toHaveBeenCalled();
  });
  it('aguarda confirmação da publicação inteira e bloqueia cliques concorrentes', async () => {
    const owner = props(); let release!: (value: any) => void;
    mocks.reply = (call) => call.table === 'products' && call.payload?.status === 'published' ? new Promise((resolve) => { release = resolve; }) : undefined;
    const { result } = renderHook(() => useAdminProductSave(owner)); let pending!: Promise<unknown>;
    act(() => { pending = result.current.handleFinish(); void result.current.handleFinish(); });
    await waitFor(() => expect(release).toBeTypeOf('function'));
    expect(result.current.isSaving).toBe(true); expect(owner.onOpenChange).not.toHaveBeenCalled();
    await act(async () => { release({ data: [{ id: 'existing', status: 'published' }], error: null }); await pending; });
    expect(mocks.success).toHaveBeenCalledOnce(); expect(owner.onOpenChange).toHaveBeenCalledWith(false);
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.success).toHaveBeenCalledOnce();
  });
  it('serializa rascunho e finalização sem rebaixar publicação posterior', async () => {
    const owner = props(); let release!: (value: any) => void; let reads = 0;
    mocks.reply = (call) => call.action === 'read' && ++reads === 1 ? new Promise((resolve) => { release = resolve; }) : undefined;
    const { result } = renderHook(() => useAdminProductSave(owner)); let draft!: Promise<unknown>; let final!: Promise<unknown>;
    act(() => { draft = result.current.triggerAutoSave(); });
    await waitFor(() => expect(release).toBeTypeOf('function'));
    act(() => { final = result.current.handleFinish(); void result.current.triggerAutoSave(); });
    expect(writes()).toHaveLength(0);
    await act(async () => { release({ data: [], error: null }); await draft; await final; });
    expect(writes().filter((call) => call.table === 'products').map((call) => call.payload.status)).toEqual(['draft', 'draft', 'published']);
  });
  it.each(['product_images', 'product_categories', 'product_variations'])('propaga falha na remoção de %s sem anunciar sucesso', async (table) => {
    const owner = props(); mocks.reply = (call) => call.table === table && call.action === 'delete' ? { data: null, error: new Error(`Falha ${table}`) } : undefined;
    const { result } = renderHook(() => useAdminProductSave(owner));
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.error).toHaveBeenCalledWith(`Falha ${table}`); expect(owner.onOpenChange).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('não publica produto quando publicação das variações falha', async () => {
    const owner = props(); mocks.reply = (call) => call.table === 'product_variations' && call.action === 'update' ? { data: null, error: new Error('Variações indisponíveis') } : undefined;
    const { result } = renderHook(() => useAdminProductSave(owner));
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.error).toHaveBeenCalledWith('Variações indisponíveis');
    expect(writes().some((call) => call.table === 'products' && call.payload?.status === 'published')).toBe(false);
  });
  it('recusa atualização sem recibo de linha', async () => {
    mocks.reply = (call) => call.table === 'products' && call.action === 'update' ? { data: [], error: null } : undefined;
    const { result } = renderHook(() => useAdminProductSave(props()));
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.error).toHaveBeenCalledWith('A atualização do produto não foi confirmada.'); expect(writes()).toHaveLength(1);
  });
  it('reutiliza identidade recém-criada entre rascunho e finalização enfileirada', async () => {
    const owner = { ...props(), currentProduct: null };
    const { result } = renderHook(() => {
      const [currentProduct, setCurrentProduct] = useState<any>(null);
      return useAdminProductSave({ ...owner, currentProduct, setCurrentProduct: (value) => { owner.setCurrentProduct(value); setCurrentProduct(value); } });
    });
    await act(async () => { await result.current.triggerAutoSave(); });
    await act(async () => { await result.current.handleFinish(); });
    expect(writes().filter((call) => call.table === 'products' && call.action === 'insert')).toHaveLength(1);
    expect(writes().find((call) => call.table === 'products' && call.payload?.status === 'published')?.filters.id).toBe('created');
    expect(owner.setCurrentProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 'created', status: 'published' }));
  });
  it('preserva erro retornado pelo serviço e permite retomar falha confirmada', async () => {
    const owner = props(); mocks.reply = (call) => call.table === 'product_images' ? { data: null, error: { message: 'Falha confirmada de permissão' } } : undefined;
    const { result } = renderHook(() => useAdminProductSave(owner));
    await act(async () => { await result.current.handleFinish(); });
    expect(mocks.error).toHaveBeenCalledWith('Falha confirmada de permissão'); mocks.reply = null;
    await act(async () => { await result.current.handleFinish(); }); expect(mocks.success).toHaveBeenCalledOnce();
  });
  it('bloqueia nova criação quando o insert não devolve identidade confirmada', async () => {
    mocks.reply = (call) => call.action === 'insert' && call.table === 'products' ? { data: [], error: null } : undefined;
    const { result } = renderHook(() => useAdminProductSave({ ...props(), currentProduct: null }));
    await act(async () => { await result.current.triggerAutoSave(); await result.current.triggerAutoSave(); await result.current.handleFinish(); });
    expect(writes()).toHaveLength(1); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('criação do produto não foi confirmada'));
  });
  it('trata rejeição de transporte durante gravação como resultado incerto', async () => {
    mocks.reply = (call) => call.action === 'update' ? Promise.reject(new Error('Conexão interrompida')) : undefined;
    const { result } = renderHook(() => useAdminProductSave(props()));
    await act(async () => { await result.current.handleFinish(); await result.current.handleFinish(); });
    expect(writes()).toHaveLength(1); expect(mocks.error).toHaveBeenCalledWith('Conexão interrompida');
  });
  it('não escreve com sessão ausente ou upload já em andamento', async () => {
    mocks.auth.user = null as any; const { result, rerender } = renderHook(() => useAdminProductSave(props()));
    await act(async () => { await result.current.handleFinish(); }); expect(mocks.calls).toHaveLength(0);
    mocks.auth.user = { id: 'operator' }; rerender();
    act(() => { result.current.setIsSaving(true); });
    await act(async () => { await result.current.handleFinish(); }); expect(mocks.calls).toHaveLength(0);
  });
  it('não continua após resposta de gravação de outra sessão', async () => {
    const owner = props(); let release!: (value: any) => void;
    mocks.reply = (call) => call.action === 'update' ? new Promise((resolve) => { release = resolve; }) : undefined;
    const view = renderHook(() => useAdminProductSave(owner)); let pending!: Promise<unknown>;
    act(() => { pending = view.result.current.handleFinish(); }); await waitFor(() => expect(release).toBeTypeOf('function'));
    mocks.auth.user = { id: 'other-operator' }; view.rerender();
    await act(async () => { release({ data: [{ id: 'existing' }], error: null }); await pending; });
    expect(writes()).toHaveLength(1); expect(owner.onOpenChange).not.toHaveBeenCalled();
  });
  it('limpa autosave pendente ao fechar ou desmontar', async () => {
    vi.useFakeTimers(); const owner = props(); const view = renderHook((input) => useAdminProductSave(input), { initialProps: owner });
    view.rerender({ ...owner, isOpen: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); }); expect(mocks.calls).toHaveLength(0);
    view.rerender(owner); view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(1600); }); expect(mocks.calls).toHaveLength(0);
  });
  it('descarta resposta de consulta após mudar produto ou sessão', async () => {
    const owner = props(); let release!: (value: any) => void;
    mocks.reply = () => new Promise((resolve) => { release = resolve; });
    const view = renderHook((input) => useAdminProductSave(input), { initialProps: owner }); let pending!: Promise<unknown>;
    act(() => { pending = view.result.current.handleFinish(); }); await waitFor(() => expect(release).toBeTypeOf('function'));
    view.rerender({ ...owner, currentProduct: { id: 'other', status: 'draft' } as any });
    await act(async () => { release({ data: [], error: null }); await pending; });
    expect(writes()).toHaveLength(0); expect(owner.onOpenChange).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });
  it('limita gravação incerta sem repetir nem continuar quando resposta atrasada chega', async () => {
    vi.useFakeTimers(); let release!: (value: any) => void;
    mocks.reply = (call) => call.action === 'update' ? new Promise((resolve) => { release = resolve; }) : undefined;
    const { result } = renderHook(() => useAdminProductSave(props())); let pending!: Promise<unknown>;
    await act(async () => { pending = result.current.handleFinish(); await vi.advanceTimersByTimeAsync(20_001); await pending; });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('gravação não foi confirmada')); expect(result.current.isSaving).toBe(false);
    await act(async () => { await result.current.handleFinish(); release({ data: [{ id: 'existing' }], error: null }); });
    expect(writes()).toHaveLength(1); expect(mocks.success).not.toHaveBeenCalled();
  });
});
