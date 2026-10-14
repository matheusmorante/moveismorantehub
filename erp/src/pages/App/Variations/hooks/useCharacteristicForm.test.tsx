// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacteristicForm } from './useCharacteristicForm';
import { saveVariation } from '../../../utils/variationService';

vi.mock('../../../utils/variationService', () => ({
  saveVariation: vi.fn().mockResolvedValue('saved-id'),
  getVariationErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Erro',
  fetchVariationOptionByValue: vi.fn(),
}));

describe('useCharacteristicForm resolver persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloqueia autosave inválido antes de chamar o serviço', async () => {
    const { result, unmount } = renderHook(() => useCharacteristicForm({ isOpen: true, onClose: vi.fn() }));
    act(() => {
      result.current.changeFormData((current) => ({ ...current, name: 'Cor', dataType: 'radio', options: [] }));
      result.current.flushFormSave();
    });
    await waitFor(() => expect(result.current.saveStatus).toBe('error'));
    expect(saveVariation).not.toHaveBeenCalled();
    expect(result.current.saveError).toContain('pelo menos uma opção');
    unmount();
  });

  it('salva o snapshot validado e preserva a configuração decimal', async () => {
    const { result, unmount } = renderHook(() => useCharacteristicForm({ isOpen: true, onClose: vi.fn() }));
    act(() => {
      result.current.changeFormData((current) => ({ ...current, name: '  Densidade  ', dataType: 'decimal', decimalPlaces: 3 }));
      result.current.flushFormSave();
    });
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    expect(saveVariation).toHaveBeenCalledWith(expect.objectContaining({ name: 'Densidade', dataType: 'decimal', decimalPlaces: 3, options: [] }), { invalidate: false });
    unmount();
  });
});
