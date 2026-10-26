import { describe, expect, it } from 'vitest';
import { resolveProductAiAttributeDataType } from '../../../../../shared-utils/productAiAttributeTypes';

describe('resolveProductAiAttributeDataType', () => {
  it('preserva o tipo efetivo do ERP para medidas mesmo sem tipo persistido', () => {
    expect(resolveProductAiAttributeDataType(' Altura Total ', null)).toBe('measure');
    expect(resolveProductAiAttributeDataType('LARGURA', 'integer')).toBe('measure');
  });

  it('usa list para atributos legados sem tipo e preserva o tipo existente', () => {
    expect(resolveProductAiAttributeDataType('Cor', null)).toBe('list');
    expect(resolveProductAiAttributeDataType('Cor', undefined)).toBe('list');
    expect(resolveProductAiAttributeDataType('Cor', 'radio')).toBe('radio');
  });
});
