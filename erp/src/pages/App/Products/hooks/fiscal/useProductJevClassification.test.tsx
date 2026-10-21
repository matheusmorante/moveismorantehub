// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type Product from '@/pages/types/product.type';
import { useProductJevClassification } from './useProductJevClassification';
import { ncmService } from '@/services/fiscal/ncmService';
import { supabase } from '@/pages/utils/supabaseConfig';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  },
}));
vi.mock('@/services/fiscal/ncmService', () => ({
  ncmService: { getCatalogEntry: vi.fn() },
}));
vi.mock('../../../../../../src/telemetry/tracer', () => ({
  withSpan: vi.fn().mockResolvedValue(undefined),
}));

const base: Partial<Product> = {
  name: 'Guarda Roupa Sidney',
  description: 'Seis portas',
  material: 'MDP',
  categoryIds: [],
  fiscal: { ncm: '' },
  itemType: 'product',
};
function mount(initial: Partial<Product> = base, categoryName = '') {
  return renderHook(() => {
    const [form, setForm] = useState<Partial<Product>>(initial);
    const jev = useProductJevClassification(form, setForm, true, categoryName);
    return { form, setForm, jev };
  });
}
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
async function trigger() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1300);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  } as never);
  vi.mocked(ncmService.getCatalogEntry).mockImplementation(async (code) => ({
    code,
    official_description:
      code === '94035000'
        ? 'Móveis de madeira, do tipo utilizado em quartos de dormir'
        : 'Móveis de madeira',
    active: true,
    is_active: true,
    start_date: null,
    end_date: null,
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('classificação assistida do cadastro', () => {
  it('seleciona categoria vazia e preenche o NCM vigente no campo', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({
        category: { id: 'cat-1', name: 'Guarda-roupas' },
        ncm: {
          code: '94035000',
          description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
        },
      })
    );
    const { result } = mount(base, 'Guarda-roupas');
    await trigger();
    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(result.current.form.categoryIds).toEqual(['cat-1']);
    expect(result.current.form.fiscal?.ncm).toBe('94035000');
    expect(result.current.form.fiscal?.ncmDescription).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
    expect(result.current.jev.suggestion).toBeNull();
    expect(ncmService.getCatalogEntry).toHaveBeenCalledWith('94035000');
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ category: 'Guarda-roupas', material: 'MDP' });
  });

  it('não sobrescreve categoria ou NCM existentes', async () => {
    const { result } = mount({ ...base, categoryIds: ['manual'], fiscal: { ncm: '94036000' } });
    await trigger();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.form.categoryIds).toEqual(['manual']);
  });

  it('usa categoria e material no classificador de produtos para outras categorias', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ ncm: { code: '84181000', description: 'Refrigeradores combinados' } })
    );
    const { result } = mount(
      {
        ...base,
        name: 'Geladeira Frost Free 400L',
        categoryIds: ['cat-appliances'],
        fiscal: { ncm: '' },
        material: 'Aço inox',
      },
      'Eletrodomésticos'
    );

    await trigger();

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({
      category: 'Eletrodomésticos',
      categoryId: 'cat-appliances',
      material: 'Aço inox',
    });
    expect(result.current.form.fiscal?.ncm).toBe('84181000');
  });

  it('mantém o campo manual se a vigência do candidato não puder ser confirmada', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ ncm: { code: '94036000', description: 'Móveis de madeira' } })
    );
    vi.mocked(ncmService.getCatalogEntry).mockRejectedValue(new Error('catálogo indisponível'));
    const { result } = mount({ ...base, name: 'Cômoda Sidney', categoryIds: ['cat-1'] });
    await trigger();
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion?.code).toBe('94036000');
    await act(async () => {
      await result.current.jev.acceptSuggestion();
    });
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion).toBeNull();
  });

  it('rejeita sem loop e preserva NCM vazio', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ ncm: { code: '94036000', description: 'Móveis de madeira' } })
    );
    vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({
      code: '94036000',
      official_description: 'Móveis de madeira',
      active: false,
      is_active: true,
      start_date: null,
      end_date: null,
    });
    const { result } = mount({ ...base, name: 'Cômoda Sidney', categoryIds: ['cat-1'] });
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
    vi.mocked(fetch).mockResolvedValue(
      response({ ncm: { code: '94036000', description: 'Móveis de madeira' } })
    );
    vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({
      code: '94036000',
      official_description: 'Móveis de madeira',
      active: false,
      is_active: true,
      start_date: null,
      end_date: null,
    });
    const { result } = mount({ ...base, name: 'Cômoda Sidney', categoryIds: ['cat-1'] });
    await trigger();
    await act(async () => {
      await result.current.jev.acceptSuggestion();
    });
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion).toBeNull();
  });

  it('descarta sugestão quando o NCM está desativado para novas seleções da loja', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ ncm: { code: '94036000', description: 'Móveis de madeira' } })
    );
    vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({
      code: '94036000',
      official_description: 'Móveis de madeira',
      active: true,
      is_active: false,
      start_date: null,
      end_date: null,
    });
    const { result } = mount({ ...base, name: 'Cômoda Sidney', categoryIds: ['cat-1'] });
    await trigger();
    await act(async () => {
      await result.current.jev.acceptSuggestion();
    });
    expect(result.current.form.fiscal?.ncm).toBe('');
    expect(result.current.jev.suggestion).toBeNull();
  });

  it('ignora resposta antiga depois de mudança de produto', async () => {
    let finishFirst!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        })
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ ncm: { code: '94036000', description: 'Novo' } })
    );
    const { result } = mount({ ...base, name: 'Sofá Sidney', categoryIds: ['cat-1'] });
    await trigger();
    act(() => result.current.setForm((prev) => ({ ...prev, name: 'Rack Sidney' })));
    await trigger();
    await act(async () => {
      finishFirst(response({ ncm: { code: '99999999', description: 'Antigo' } }));
      await Promise.resolve();
    });
    expect(result.current.form.fiscal?.ncm).toBe('94036000');
  });

  it('falha HTTP sem impedir seleção manual', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const { result } = mount({ ...base, name: 'Cômoda Sidney' });
    await trigger();
    expect(result.current.jev.suggestion).toBeNull();
    act(() =>
      result.current.setForm((prev) => ({ ...prev, fiscal: { ...prev.fiscal!, ncm: '12345678' } }))
    );
    expect(result.current.form.fiscal?.ncm).toBe('12345678');
  });

  describe('regras estritas: 3 campos obrigatórios e bloqueio de IA quando NCM já existe', () => {
    it('não chama IA quando descrição está vazia mesmo com nome e categoria preenchidos', async () => {
      const { result } = mount(
        { ...base, name: 'Guarda Roupa Sidney', categoryIds: ['cat-1'], description: '' },
        'Quarto'
      );
      await trigger();
      act(() => result.current.jev.onFieldBlur('description'));
      await trigger();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('não chama IA quando categoria está vazia mesmo com nome e descrição preenchidos', async () => {
      const { result } = mount(
        { ...base, name: 'Guarda Roupa Sidney', categoryIds: [], category: '', description: '6 portas' },
        ''
      );
      await trigger();
      act(() => result.current.jev.onFieldBlur('name'));
      await trigger();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('não chama IA quando nome tem menos de 3 caracteres', async () => {
      const { result } = mount(
        { ...base, name: 'GR', categoryIds: ['cat-1'], description: '6 portas' },
        'Quarto'
      );
      await trigger();
      act(() => result.current.jev.onFieldBlur('name'));
      await trigger();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('não gera nova solicitação à IA quando NCM já está selecionado, mesmo alterando campos e desfocando', async () => {
      const { result } = mount({
        ...base,
        name: 'Guarda Roupa Sidney',
        categoryIds: ['cat-1'],
        description: '6 portas em MDP',
        fiscal: { ncm: '94035000', ncmDescription: 'Móveis de quarto' },
      });
      await trigger();
      expect(fetch).not.toHaveBeenCalled();

      // Altera o nome, descrição e categoria
      act(() => {
        result.current.setForm((prev) => ({
          ...prev,
          name: 'Guarda Roupa Casal 8 Portas',
          description: 'Nova descrição completa alterada',
        }));
      });
      // Desfoca o campo
      act(() => {
        result.current.jev.onFieldBlur('description');
      });
      await trigger();

      // Nenhuma chamada à IA deve ter ocorrido porque o NCM já estava preenchido
      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.form.fiscal?.ncm).toBe('94035000');
    });

    it('executa classificação via onFieldBlur imediatamente quando os 3 campos estiverem preenchidos e NCM vazio', async () => {
      vi.mocked(fetch).mockResolvedValue(
        response({
          category: { id: 'cat-quarto', name: 'Quarto' },
          ncm: { code: '94035000', description: 'Móveis de madeira, quartos de dormir' },
        })
      );

      // Inicia formulário sem descrição
      const { result } = mount(
        { ...base, name: 'Guarda Roupa Sidney', categoryIds: ['cat-quarto'], description: '', fiscal: { ncm: '' } },
        'Quarto'
      );
      await trigger();
      expect(fetch).not.toHaveBeenCalled();

      // Preenche o 3º campo (descrição)
      act(() => {
        result.current.setForm((prev) => ({ ...prev, description: '6 portas com espelho' }));
      });

      // Desfoca o último campo preenchido
      await act(async () => {
        result.current.jev.onFieldBlur('description');
        await Promise.resolve();
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
      expect(payload).toMatchObject({
        name: 'Guarda Roupa Sidney',
        description: '6 portas com espelho',
        category: 'Quarto',
        material: 'MDP',
      });
      expect(result.current.form.fiscal?.ncm).toBe('94035000');
    });

    it('reclassifica somente se NCM for limpo e houver nova alteração nos campos com onFieldBlur', async () => {
      vi.mocked(fetch).mockResolvedValue(
        response({
          category: { id: 'cat-1', name: 'Quarto' },
          ncm: { code: '94035000', description: 'Móveis de madeira' },
        })
      );

      const { result } = mount({
        ...base,
        name: 'Guarda Roupa Sidney',
        categoryIds: ['cat-1'],
        description: '6 portas',
        fiscal: { ncm: '94035000' },
      });
      await trigger();
      expect(fetch).not.toHaveBeenCalled();

      // Limpa o NCM
      act(() => {
        result.current.setForm((prev) => ({
          ...prev,
          fiscal: { ...prev.fiscal, ncm: '' },
        }));
      });
      // Sem alteração nos campos, blur não deve disparar
      act(() => {
        result.current.jev.onFieldBlur('description');
      });
      await trigger();
      expect(fetch).not.toHaveBeenCalled();

      // Agora altera a descrição
      act(() => {
        result.current.setForm((prev) => ({
          ...prev,
          description: 'Móvel de madeira maciça estilo rústico',
        }));
      });
      // Desfoca o campo alterado com NCM vazio
      await act(async () => {
        result.current.jev.onFieldBlur('description');
        await Promise.resolve();
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
      expect(payload.description).toBe('Móvel de madeira maciça estilo rústico');
    });
  });
});
