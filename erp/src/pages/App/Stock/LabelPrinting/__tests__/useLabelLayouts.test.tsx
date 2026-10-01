// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRemoteLabelLayouts } from '../services/labelLayoutService';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';
import { useLabelLayouts } from '../hooks/useLabelLayouts';

vi.mock('../services/labelLayoutService', () => ({
  deleteRemoteLabelLayout: vi.fn(),
  fetchRemoteLabelLayouts: vi.fn(),
  insertRemoteLabelLayout: vi.fn(),
}));

vi.mock('../services/labelStorageService', () => ({
  getCustomLabelLayouts: () => null,
  getHiddenDefaultLayoutIds: () => [],
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
    vi.mocked(fetchRemoteLabelLayouts).mockResolvedValue({ data: [], error: null });
  });

  it('preserves an explicitly selected layout after category initialization', async () => {
    const { result } = renderHook(() =>
      useLabelLayouts({ selectedCategory: 'identificacao' })
    );
    const selectedModel = DEFAULT_LAYOUT_MODELS.find((model) => model.id === 'ident_2x5');

    await waitFor(() => expect(fetchRemoteLabelLayouts).toHaveBeenCalled());
    expect(selectedModel).toBeDefined();

    act(() => {
      result.current.selectLayout(selectedModel!);
    });

    expect(result.current.config.layoutId).toBe('ident_2x5');
  });
});
