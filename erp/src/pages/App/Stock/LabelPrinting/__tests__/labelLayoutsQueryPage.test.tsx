// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import LabelPrinting from '../Index';
import { getCustomLabelLayouts, saveCustomLabelLayouts } from '../services/labelStorageService';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('../services/priceLabelTemplateSync', () => ({ subscribeToPriceLabelTemplateUpdates: () => () => undefined, publishPriceLabelTemplateUpdate: vi.fn() }));
vi.mock('../hooks/useLabelProducts', () => ({ useLabelProducts: () => ({ products: [], selectedProductToAdd: null }) }));
vi.mock('../hooks/useLabelQueue', () => ({ useLabelQueue: () => ({ setLogoItems: vi.fn(), setLabelItems: vi.fn() }) }));
vi.mock('../hooks/useLabelPreview', () => ({ useLabelPreview: () => ({}) }));
vi.mock('../sections/HeaderSection', () => ({ HeaderSection: () => null }));
vi.mock('../sections/QueueSection', () => ({ QueueSection: () => null }));
vi.mock('../sections/PreviewSection', () => ({ PreviewSection: () => null }));
vi.mock('../sections/PrintPortalSection', () => ({ PrintPortalSection: () => null }));
vi.mock('../sections/ModalsSection', () => ({ ModalsSection: () => null }));

type Response = { data: unknown; error: unknown };
let finish!: (value: Response) => void;
const local = { ...DEFAULT_LAYOUT_MODELS[0], id: 'custom_existing' };
beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear(); saveCustomLabelLayouts([local]);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const pending = new Promise<Response>((resolve) => { finish = resolve; });
  vi.mocked(supabase.from).mockImplementation((table) => {
    if (table === 'settings') return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) } as never;
    if (table === 'label_layouts') return { select: () => pending } as never;
    throw new Error(`Transporte inesperado: ${table}`);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const page = () => render(<MemoryRouter initialEntries={['/stock/labels?cat=identificacao']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LabelPrinting /></MemoryRouter>);
describe('consulta de modelos na página real', () => {
  it('exibe progresso e falha sem perder modelos locais', async () => {
    page(); expect(screen.getByRole('status').textContent).toContain('Consultando');
    await act(async () => { finish({ data: null, error: { code: '42501' } }); });
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByRole('alert').textContent).toContain('lista local foi preservada');
    expect(getCustomLabelLayouts()).toEqual([local]);
  });
  it('encerra consulta em 15s e ignora resposta tardia sem remover o cache', async () => {
    vi.useFakeTimers(); page();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByRole('alert').textContent).toContain('recarregue');
    await act(async () => { finish({ data: [], error: null }); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole('alert').textContent).toContain('recarregue'); expect(getCustomLabelLayouts()).toEqual([local]);
  });
});
