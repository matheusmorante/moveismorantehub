import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useProductPageDisplayState } from '../../../digital-catalog/src/features/products/hooks/useProductPageDisplayState';

const navigation = vi.hoisted(() => ({ variation: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(navigation.variation ? `var=${navigation.variation}` : '') }));

describe('condições das características no catálogo', () => {
  it('exibe o puxador quando a condição alternativa de gavetas está satisfeita', () => {
    navigation.variation = '';
    const characteristicDefinitions = [
      { id: 'doors', name: 'Quantidade de portas', dataType: 'integer' },
      { id: 'drawers', name: 'Quantidade de gavetas', dataType: 'integer' },
      { id: 'handle', name: 'Tipo(s) de puxador', dataType: 'radio',
        dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
        dependencyAlternatives: [{ referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' }] },
    ];
    const product = { id: 'product', images: [], variations: [], technical_specs: { technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 2, 'Tipo(s) de puxador': 'Alça',
    } } };
    const { result, rerender } = renderHook(({ current }) => useProductPageDisplayState({
      product: current, characteristicDefinitions, characteristicDependenciesVerified: true,
    }), { initialProps: { current: product } });
    expect(result.current.technicalSpecs).toContainEqual(['Tipo(s) de puxador', 'Alça']);
    rerender({ current: { ...product, technical_specs: { technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 0, 'Tipo(s) de puxador': 'Alça',
    } } } });
    expect(result.current.technicalSpecs).not.toContainEqual(['Tipo(s) de puxador', 'Alça']);
  });

  it('usa o valor da variação selecionada para avaliar a condição', () => {
    navigation.variation = 'variation';
    const characteristicDefinitions = [
      { id: 'doors', name: 'Quantidade de portas', dataType: 'integer' },
      { id: 'drawers', name: 'Quantidade de gavetas', dataType: 'integer' },
      { id: 'handle', name: 'Tipo(s) de puxador', dataType: 'radio',
        dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
        dependencyAlternatives: [{ referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' }] },
    ];
    const product = { id: 'product', images: [], technical_specs: { technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 0, 'Tipo(s) de puxador': 'Alça',
    } }, variations: [{ id: 'variation', status: 'published', technical_specs: { technicalValues: {
      'Quantidade de gavetas': 2,
    } } }] };
    const { result } = renderHook(() => useProductPageDisplayState({
      product, characteristicDefinitions, characteristicDependenciesVerified: true,
    }));
    expect(result.current.technicalSpecs).toContainEqual(['Tipo(s) de puxador', 'Alça']);
  });
});
