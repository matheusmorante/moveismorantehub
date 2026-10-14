import { describe, it, expect } from 'vitest';
import { getVariationDisplayName } from './getVariationDisplayName';

describe('getVariationDisplayName', () => {
  it('prioritizes explicit variation name over attributes/colors', () => {
    const variation = {
      id: 'var-1',
      name: 'Base Bau Casal 1,38 Damulti Premium Linho Marrom',
      displayName: 'Base Bau Casal 1,38 Damulti Premium Linho Marrom',
      attributes: [
        { name: 'Tecido', value: 'Linho' },
        { name: 'Cor', value: 'Marrom' },
      ],
    };

    expect(getVariationDisplayName(variation)).toBe('Base Bau Casal 1,38 Damulti Premium Linho Marrom');
  });

  it('uses displayName if name is not set', () => {
    const variation = {
      id: 'var-2',
      displayName: 'Cozinha Modulada Florença Angelin/Cinza',
      attributes: [{ name: 'Cor', value: 'Angelin/Cinza' }],
    };

    expect(getVariationDisplayName(variation)).toBe('Cozinha Modulada Florença Angelin/Cinza');
  });

  it('uses name if displayName is not set', () => {
    const variation = {
      id: 'var-3',
      name: 'Estante Multiuso Open 56cm Branco',
      attributes: [{ name: 'Cor', value: 'Branco' }],
    };

    expect(getVariationDisplayName(variation)).toBe('Estante Multiuso Open 56cm Branco');
  });

  it('falls back to attributes only when explicit name is missing or empty', () => {
    const variation = {
      id: 'var-4',
      name: '',
      attributes: [{ name: 'Cor', value: 'Preto' }],
    };

    expect(getVariationDisplayName(variation)).toBe('Preto');
  });

  it('falls back to fallbackName when both explicit name and attributes are missing', () => {
    const variation = {
      id: 'var-5',
    };

    expect(getVariationDisplayName(variation, 'Produto Padrão')).toBe('Produto Padrão');
  });

  it('handles null/undefined gracefully', () => {
    expect(getVariationDisplayName(null, 'Fallback')).toBe('Fallback');
    expect(getVariationDisplayName(undefined)).toBe('');
  });
});
