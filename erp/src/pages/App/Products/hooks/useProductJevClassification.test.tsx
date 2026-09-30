// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type Product from '@/pages/types/product.type';
import { useProductJevClassification } from './useProductJevClassification';
import { ncmService } from '@/services/fiscal/ncmService';
import { supabase } from '@/pages/utils/supabaseConfig';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }) } } }));
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { getCatalogEntry: vi.fn() } }));
vi.mock('../../../../../../src/telemetry/tracer', () => ({ withSpan: vi.fn().mockResolvedValue(undefined) }));

const base: Partial<Product> = { name: 'Guarda Roupa Sidney', description: 'Seis portas', material: 'MDP', categoryIds: [], fiscal: { ncm: '' }, itemType: 'product' };
function mount(initial: Partial<Product> = base) {
  return renderHook(() => {
    const [form, setForm] = useState<Partial<Product>>(initial);
    const jev = useProductJevClassification(form, setForm, true);
    return { form, setForm, jev };
  });
}
const response = (data: unknown) => ({ ok: true, json: async () => data } as Response);
async function trigger() {
  await act(async () => { await vi.advanceTimersByTimeAsync(1300); await Promise.resolve(); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'test-token' } } } as never);
  vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({ code: '94036000', official_description: 'Móveis de madeira', active: true, start_date: null, end_date: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('classificação assistida do cadastro', () => {
  it('seleciona categoria vazia e apresenta NCM sem gravá-lo', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ category: { id: 'cat-1', name: 'Guarda-roupas' }, ncm: { code: '94036000', description: 'Móveis de madeira' } }));
    const { result } = mount();
    await trigger();
    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(result.current.form.categoryIds).toEqual(['cat-1']);
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion?.code).toBe('94036000');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('não sobrescreve categoria ou NCM existentes', async () => {
    const { result } = mount({ ...base, categoryIds: ['manual'], fiscal: { ncm: '94036000' } });
    await trigger();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.form.categoryIds).toEqual(['manual']);
  });

  it('aceita somente por ação explícita e reconfirma vigência', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ ncm: { code: '94036000', description: 'Móveis de madeira' } }));
    const { result } = mount({ ...base, categoryIds: ['cat-1'] });
    await trigger();
    await act(async () => { await result.current.jev.acceptSuggestion(); });
    expect(result.current.form.fiscal?.ncm).toBe('94036000');
    expect(result.current.jev.suggestion).toBeNull();
  });

  it('rejeita sem loop e preserva NCM vazio', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ ncm: { code: '94036000', description: 'Móveis de madeira' } }));
    const { result } = mount({ ...base, categoryIds: ['cat-1'] });
    await trigger();
    act(() => result.current.jev.rejectSuggestion());
    await trigger();
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => result.current.setForm((prev) => ({ ...prev, material: 'Madeira maciça' })));
    await trigger();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('descarta sugestão se candidato perder vigência antes do aceite', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ ncm: { code: '94036000', description: 'Móveis de madeira' } }));
    vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({ code: '94036000', official_description: 'Móveis de madeira', active: false, start_date: null, end_date: null });
    const { result } = mount({ ...base, categoryIds: ['cat-1'] });
    await trigger();
    await act(async () => { await result.current.jev.acceptSuggestion(); });
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion).toBeNull();
  });

  it('ignora resposta antiga depois de mudança de produto', async () => {
    let finishFirst!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ ncm: { code: '94036000', description: 'Novo' } }));
    const { result } = mount({ ...base, categoryIds: ['cat-1'] });
    await trigger();
    act(() => result.current.setForm((prev) => ({ ...prev, name: 'Cômoda Sidney' })));
    await trigger();
    await act(async () => { finishFirst(response({ ncm: { code: '99999999', description: 'Antigo' } })); await Promise.resolve(); });
    expect(result.current.jev.suggestion?.code).toBe('94036000');
  });

  it('falha HTTP sem impedir seleção manual', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const { result } = mount();
    await trigger();
    expect(result.current.jev.suggestion).toBeNull();
    act(() => result.current.setForm((prev) => ({ ...prev, fiscal: { ...prev.fiscal!, ncm: '12345678' } })));
    expect(result.current.form.fiscal?.ncm).toBe('12345678');
  });
});
