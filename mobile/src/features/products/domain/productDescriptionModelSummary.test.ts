import { describe, expect, it } from 'vitest';
import { buildProductDescriptionModelSummary } from './productDescriptionModelSummary';

describe('buildProductDescriptionModelSummary', () => {
  it('mostra o campo combinado Modelo/Linha quando o cadastro usa esse atributo', () => {
    expect(buildProductDescriptionModelSummary({
      model: '',
      line: '',
      modelOrLine: 'Oslo 120',
    })).toEqual([{ label: 'Modelo / Linha', value: 'Oslo 120' }]);
  });

  it('mantém modelo e linha separados quando ambos existem', () => {
    expect(buildProductDescriptionModelSummary({
      model: 'M301',
      line: 'Oslo',
      modelOrLine: 'Oslo 120',
    })).toEqual([
      { label: 'Modelo', value: 'M301' },
      { label: 'Linha', value: 'Oslo' },
    ]);
  });

  it('usa o único valor individual como Modelo/Linha quando o campo combinado está ausente', () => {
    expect(buildProductDescriptionModelSummary({
      model: '',
      line: 'Oslo',
      modelOrLine: '',
    })).toEqual([{ label: 'Modelo / Linha', value: 'Oslo' }]);
  });
});
