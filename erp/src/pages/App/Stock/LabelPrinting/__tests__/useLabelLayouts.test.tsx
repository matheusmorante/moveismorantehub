// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLabelLayouts } from '../hooks/useLabelLayouts';
import {
  deleteRemoteLabelLayout,
  fetchRemoteLabelLayouts,
  insertRemoteLabelLayout,
} from '../services/labelLayoutService';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

vi.mock('../services/labelLayoutService', () => ({
  deleteRemoteLabelLayout: vi.fn(),
  fetchRemoteLabelLayouts: vi.fn(),
  insertRemoteLabelLayout: vi.fn(),
}));

vi.mock('../services/labelStorageService', () => ({
  getCustomLabelLayouts: vi.fn(() => null),
  getHiddenDefaultLayoutIds: vi.fn(() => []),
  getLastSelectedRectModelId: () => 'labels-image-compact',
  getLastSelectedRoundModelId: () => 'round-small',
  saveCustomLabelLayouts: vi.fn(),
  saveHiddenDefaultLayoutIds: vi.fn(),
  saveLastSelectedRectModelId: vi.fn(),
  saveLastSelectedRoundModelId: vi.fn(),
}));

vi.mock('../services/priceLabelTemplateSync', () => ({
  subscribeToPriceLabelTemplateUpdates: () => () => undefined,
}));

vi.mock('../../../../utils/settingsService', () => ({
  getSettings: () => ({}),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  subscribeToSettings: () => () => undefined,
}));

describe('useLabelLayouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRemoteLabelLayouts).mockResolvedValue({ data: [], error: null });
  });

  it('preserva layout explicitamente selecionado após inicialização de categoria', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));
    const selectedModel = DEFAULT_LAYOUT_MODELS.find((model) => model.id === 'ident_2x5');

    await waitFor(() => expect(fetchRemoteLabelLayouts).toHaveBeenCalled());
    expect(selectedModel).toBeDefined();

    act(() => {
      result.current.selectLayout(selectedModel!);
    });

    expect(result.current.config.layoutId).toBe('ident_2x5');
  });

  it('permite selecionar qualquer modelo de folha (ex: 2x3, 3x3) e atualiza config e currentModel', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    await waitFor(() => expect(fetchRemoteLabelLayouts).toHaveBeenCalled());

    const model2x3 = DEFAULT_LAYOUT_MODELS.find((m) => m.id === '2x3_std');
    expect(model2x3).toBeDefined();

    act(() => {
      result.current.selectLayout(model2x3!);
    });

    expect(result.current.config.layoutId).toBe('2x3_std');
    expect(result.current.config.columns).toBe(2);
    expect(result.current.config.rows).toBe(3);
    expect(result.current.currentModel?.id).toBe('2x3_std');

    const model3x3 = DEFAULT_LAYOUT_MODELS.find((m) => m.id === '3x3_std');
    expect(model3x3).toBeDefined();

    act(() => {
      result.current.selectLayout(model3x3!);
    });

    expect(result.current.config.layoutId).toBe('3x3_std');
    expect(result.current.config.columns).toBe(3);
    expect(result.current.config.rows).toBe(3);
    expect(result.current.currentModel?.id).toBe('3x3_std');
  });

  it('inicializa com configurações corretas dependendo de isProductContext', async () => {
    const { result: prodResult } = renderHook(() =>
      useLabelLayouts({ selectedCategory: 'identificacao', isProductContext: true })
    );
    expect(prodResult.current.config.preset).toBe('qr_product');
    expect(prodResult.current.config.showName).toBe(true);
    expect(prodResult.current.config.showBarcode).toBe(true);

    const { result: logoResult } = renderHook(() =>
      useLabelLayouts({ selectedCategory: 'logos', isProductContext: false })
    );
    expect(logoResult.current.config.preset).toBe('store_logo');
    expect(logoResult.current.config.showStoreLogo).toBe(true);
  });

  it('aplica presets via applyPresetWithConfig atualizando categorias e campos exibidos', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    act(() => {
      result.current.applyPresetWithConfig('price_only', result.current.config);
    });

    expect(result.current.config.preset).toBe('price_only');
    expect(result.current.config.category).toBe('precos');
    expect(result.current.config.showPrice).toBe(true);
    expect(result.current.config.showBarcode).toBe(false);

    act(() => {
      result.current.applyPresetWithConfig('store_logo', result.current.config);
    });

    expect(result.current.config.preset).toBe('store_logo');
    expect(result.current.config.category).toBe('logos');
    expect(result.current.config.showStoreLogo).toBe(true);
  });

  it('duplica layout salvando na nuvem quando a API responde com sucesso', async () => {
    const mockModel = DEFAULT_LAYOUT_MODELS[0];
    const duplicatedMock = {
      ...mockModel,
      id: 'remote_dup_123',
      name: `${mockModel.name} (Cópia)`,
    };
    vi.mocked(insertRemoteLabelLayout).mockResolvedValue({ data: duplicatedMock, error: null });

    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    await act(async () => {
      await result.current.handleDuplicateLayout(mockModel);
    });

    expect(insertRemoteLabelLayout).toHaveBeenCalledWith(
      expect.objectContaining({ name: `${mockModel.name} (Cópia)` })
    );
    expect(result.current.customLayouts).toContainEqual(duplicatedMock);
  });

  it('copia layout para outra categoria via handleCopyToCategory', async () => {
    const mockModel = DEFAULT_LAYOUT_MODELS[0];
    const copiedMock = { ...mockModel, id: 'copied_cat_1', category: 'precos' as const };
    vi.mocked(insertRemoteLabelLayout).mockResolvedValue({ data: copiedMock, error: null });

    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    await act(async () => {
      await result.current.handleCopyToCategory(mockModel, 'precos');
    });

    expect(insertRemoteLabelLayout).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'precos' })
    );
    expect(result.current.customLayouts).toContainEqual(copiedMock);
  });

  it('permite exclusão de layout remoto customizado e chama deleteRemoteLabelLayout', async () => {
    vi.mocked(deleteRemoteLabelLayout).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    const remoteLayout = {
      ...DEFAULT_LAYOUT_MODELS[0],
      id: 'db_layout_999',
      name: 'Remoto 999',
    };

    act(() => {
      result.current.setCustomLayouts([remoteLayout]);
    });

    await act(async () => {
      await result.current.handleDeleteLayout('db_layout_999');
    });

    expect(deleteRemoteLabelLayout).toHaveBeenCalledWith('db_layout_999');
    expect(result.current.customLayouts).not.toContainEqual(remoteLayout);
  });

  it('permite exclusão de layout local customizado sem chamar a API remota', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    const localLayout = {
      ...DEFAULT_LAYOUT_MODELS[0],
      id: 'custom_123456789',
      name: 'Local Layout',
    };

    act(() => {
      result.current.setCustomLayouts([localLayout]);
    });

    await act(async () => {
      await result.current.handleDeleteLayout('custom_123456789');
    });

    expect(deleteRemoteLabelLayout).not.toHaveBeenCalled();
    expect(result.current.customLayouts).not.toContainEqual(localLayout);
  });

  it('faz fallback para getCustomLabelLayouts local quando fetchRemoteLabelLayouts falha ou vem vazio', async () => {
    const { getCustomLabelLayouts } = await import('../services/labelStorageService');
    const localFallbackModel = {
      ...DEFAULT_LAYOUT_MODELS[0],
      id: 'custom_saved_local',
      name: 'Salvo Localmente',
    };
    vi.mocked(getCustomLabelLayouts).mockReturnValueOnce([localFallbackModel]);
    vi.mocked(fetchRemoteLabelLayouts).mockResolvedValueOnce({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    await waitFor(() => {
      expect(result.current.customLayouts).toContainEqual(localFallbackModel);
    });
  });

  it('faz contingência local ao duplicar layout quando a persistência remota falha', async () => {
    const { saveCustomLabelLayouts } = await import('../services/labelStorageService');
    const mockModel = DEFAULT_LAYOUT_MODELS[0];
    vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({
      data: null,
      error: new Error('Quota exceeded'),
    });

    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    await act(async () => {
      await result.current.handleDuplicateLayout(mockModel);
    });

    expect(saveCustomLabelLayouts).toHaveBeenCalled();
    const createdLocal = result.current.customLayouts.find(
      (m) => m.name === `${mockModel.name} (Cópia)`
    );
    expect(createdLocal).toBeDefined();
    expect(String(createdLocal?.id)).toMatch(/^custom_\d+/);
  });

  it('ignora e não persiste configurações padrão quando o modelo solicitado for inexistente', async () => {
    const { saveSettings } = await import('../../../../utils/settingsService');
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    act(() => {
      result.current.toggleDefaultLayout('modelo_completamente_inexistente', 'identificacao');
    });

    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('sincroniza artConfig do layout selecionado quando disponível em savedArtConfigs', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));

    const testArtConfig = {
      globalSnapshot: { zoom: 1 },
      opportunities: {},
    };

    act(() => {
      result.current.setSavedArtConfigs({
        [result.current.config.layoutId!]: testArtConfig,
      });
    });

    await waitFor(() => {
      expect(result.current.config.artConfig).toEqual(testArtConfig);
    });
  });
});
