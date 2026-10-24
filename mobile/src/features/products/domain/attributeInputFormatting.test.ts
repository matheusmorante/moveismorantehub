import { describe, expect, it } from 'vitest';
import {
  formatAttributeDecimalValue,
  limitAttributeIntegerInput,
  maskAttributeDecimalInput,
} from '../../../../../shared-utils/attributeInputFormatting';

describe('formatação de valores técnicos na conciliação de produto', () => {
  it('aplica máscara decimal localizada com uma ou duas casas', () => {
    expect(maskAttributeDecimalInput('123', 1)).toBe('12.3');
    expect(maskAttributeDecimalInput('1234', 2)).toBe('12.34');
    expect(formatAttributeDecimalValue('12.3', 1)).toBe('12,3');
    expect(formatAttributeDecimalValue('12,34', 2)).toBe('12,34');
  });

  it('limita a cinquenta portas/gavetas como no seletor ERP', () => {
    expect(limitAttributeIntegerInput('Quantidade de portas', '72')).toBe('50');
    expect(limitAttributeIntegerInput('Quantidade de gavetas', '4')).toBe('4');
    expect(limitAttributeIntegerInput('Lugares', '72')).toBe('72');
  });
});
