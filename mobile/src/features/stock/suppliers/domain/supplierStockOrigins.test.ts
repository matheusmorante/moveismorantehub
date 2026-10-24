import { describe, expect, it } from 'vitest';
import { createPersonFormSchema } from '../../../../../../shared-utils/personDomainValidation';
import {
  toPersonStockOriginsRow,
  togglePersonStockOrigin,
} from '../../../../../../shared-utils/personStockOrigins';

describe('origens de estoque do fornecedor no cadastro de Produtos', () => {
  it('valida as três origens aceitas pelo ERP antes da gravação', () => {
    const schema = createPersonFormSchema('suppliers');

    expect(
      schema.safeParse({ fullName: 'Fornecedor', stockOrigins: ['normal'] }).success
    ).toBe(true);
    expect(
      schema.safeParse({ fullName: 'Fornecedor', stockOrigins: ['salvados', 'usados'] }).success
    ).toBe(true);
    expect(schema.safeParse({ fullName: 'Fornecedor', stockOrigins: ['outro'] }).success).toBe(false);
  });

  it('adiciona e remove origens sem duplicar valores', () => {
    expect(togglePersonStockOrigin(['normal'], 'salvados', true)).toEqual(['normal', 'salvados']);
    expect(togglePersonStockOrigin(['normal', 'salvados'], 'salvados', false)).toEqual([
      'normal',
    ]);
    expect(togglePersonStockOrigin(['normal'], 'normal', true)).toEqual(['normal']);
  });

  it('mapeia origens para stock_origins e não limpa dados quando o campo não é enviado', () => {
    expect(toPersonStockOriginsRow({ stockOrigins: ['salvados'] })).toEqual({
      stock_origins: ['salvados'],
    });
    expect(toPersonStockOriginsRow({ stock_origins: ['usados'] })).toEqual({
      stock_origins: ['usados'],
    });
    expect(toPersonStockOriginsRow({})).toEqual({});
  });
});
