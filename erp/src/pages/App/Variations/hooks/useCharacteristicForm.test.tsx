// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacteristicGroup } from '../../../types/variation.type';
import { useCharacteristicForm } from './useCharacteristicForm';
import { saveVariation } from '../../../utils/variationService';

vi.mock('../../../utils/variationService', () => ({
  saveVariation: vi.fn().mockResolvedValue('saved-id'),
  getVariationErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Erro',
  fetchVariationOptionByValue: vi.fn(),
}));

const groups: CharacteristicGroup[] = [{
  id: 'group-1', name: 'Dimensões',
}];
const categories = [{ id: 'cat-1', name: 'Cômodas' }];

describe('useCharacteristicForm resolver persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloqueia uma definição inválida antes de chamar o serviço', async () => {
    const { result, unmount } = renderHook(() => useCharacteristicForm({
      isOpen: true, onClose: vi.fn(), groups, categories, defaultGroupId: 'group-1',
    }));
    act(() => result.current.changeFormData((current) => ({
      ...current, name: 'Cor', dataType: 'radio', options: [],
      categoryApplications: [{ categoryId: 'cat-1', application: 'optional' }],
    })));
    await act(async () => { await result.current.save(); });
    await waitFor(() => expect(result.current.saveStatus).toBe('error'));
    expect(saveVariation).not.toHaveBeenCalled();
    expect(result.current.saveError).toContain('opção ativa');
    unmount();
  });

  it('salva os valores parseados pelo resolver com grupo, configuração e dependência', async () => {
    const { result, unmount } = renderHook(() => useCharacteristicForm({
      isOpen: true, onClose: vi.fn(), groups, categories, defaultGroupId: 'group-1',
    }));
    act(() => result.current.changeFormData((current) => ({
      ...current,
      name: '  Densidade  ',
      dataType: 'decimal',
      decimalPlaces: 3,
      unit: 'kg/m³',
      configuration: { minValue: 0, maxValue: 10 },
      categoryApplications: [{ categoryId: 'cat-1', application: 'required' }],
    })));
    await act(async () => { await result.current.save(); });
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    expect(saveVariation).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Densidade',
      groupId: 'group-1',
      dataType: 'decimal',
      decimalPlaces: 3,
      unit: 'kg/m³',
      configuration: { minValue: 0, maxValue: 10 },
      dependency: null,
      options: [],
    }));
    unmount();
  });

  it('preserva opções antigas ao editar uma característica booleana', async () => {
    const { result, unmount } = renderHook(() => useCharacteristicForm({
      isOpen: true,
      onClose: vi.fn(),
      groups,
      categories,
      variation: {
        id: 'usb',
        name: 'Entrada USB',
        dataType: 'boolean',
        active: true,
        options: [{ id: 'yes', value: 'Sim' }, { id: 'no', value: 'Não' }],
        groupId: 'group-1',
        categoryApplications: [{ categoryId: 'cat-1', application: 'optional' }],
      },
    }));

    await act(async () => { await result.current.save(); });
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    expect(saveVariation).toHaveBeenCalledWith(expect.objectContaining({
      dataType: 'boolean',
      options: undefined,
    }));
    unmount();
  });
});
