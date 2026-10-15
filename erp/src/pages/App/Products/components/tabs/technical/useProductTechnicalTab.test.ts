// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import * as technicalFieldService from '../../../services/technicalFieldService';
import { Product } from '../../../../../types/product.type';

vi.mock('../../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn(),
}));

describe('useProductTechnicalTab', () => {
  const mockFieldDefinitions = [
    { id: '1', name: 'Altura', isRequired: true, active: true },
    { id: '2', name: 'Largura', isRequired: true, active: true },
    { id: '3', name: 'Profundidade', isRequired: true, active: true },
    { id: '4', name: 'Comprimento', isRequired: false, active: true },
    { id: '5', name: 'Marca', isRequired: false, active: true },
    { id: '6', name: 'Material da estrutura', isRequired: false, active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue(
      mockFieldDefinitions as any
    );
  });

  it('atualiza valores técnicos e sincroniza dimensões e variações com o pai', async () => {
    let currentProduct: Partial<Product> = {
      name: 'Sofá Florença',
      technicalValues: {},
      variations: [
        {
          id: 'v1',
          name: 'Variacao 1',
          description: 'Desc',
          syncHeight: true,
          width: 0,
          height: 0,
          depth: 0,
          weight: 0,
        } as any,
      ],
    };

    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    act(() => {
      result.current.handleTechnicalValueChange('Altura', '110,5');
    });

    expect(currentProduct.technicalValues?.['Altura']).toBe('110,5');
    expect(currentProduct.height).toBe(110.5);
    expect(currentProduct.variations?.[0].height).toBe(110.5);

    act(() => {
      result.current.handleTechnicalValueChange('Marca', 'Morante');
    });

    expect(currentProduct.brand).toBe('Morante');
    expect(currentProduct.technicalValues?.['Marca']).toBe('Morante');
  });

  it('permite adicionar e remover características manuais', () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    act(() => {
      result.current.handleAddManualField({
        id: '6',
        name: 'Material da estrutura',
        isRequired: false,
      });
    });

    expect(result.current.manualFieldNames).toContain('Material da estrutura');
    expect(currentProduct.technicalValues?.['Material da estrutura']).toBe('');

    act(() => {
      result.current.handleRemoveManualField('Material da estrutura');
    });

    expect(result.current.manualFieldNames).not.toContain('Material da estrutura');
    expect(currentProduct.technicalValues?.['Material da estrutura']).toBeUndefined();
  });
});
