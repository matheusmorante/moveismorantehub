import { describe, expect, it } from 'vitest';
import { calculateMod11CheckDigit, generateNfeAccessKey } from '../nfeAccessKey';
import { validateNfeAccessKey } from '../../nfeAccessKey';

describe('dígito verificador da chave emitida', () => {
  it('preserva DV 1 quando o resto é 10, reproduzindo a chave rejeitada pela SEFAZ HML', () => {
    const base = '4126104451224800010755001000000106170536713';
    expect(calculateMod11CheckDigit(base)).toBe(1);
    const generated = generateNfeAccessKey({ ufCode: '41', yearMonth: '2610', cnpj: '44512248000107', model: '55', series: '1', number: 106, emissionType: '1', randomCode: '70536713' });
    expect(generated.accessKey).toBe(`${base}1`);
    expect(generated.checkDigit).toBe(1);
    expect(validateNfeAccessKey(generated.accessKey).valid).toBe(true);
    expect(validateNfeAccessKey(`${base}0`).valid).toBe(false);
  });

  it.each([
    ['0', 0], ['6', 0], ['1', 9], ['2', 7], ['3', 5],
    ['4', 3], ['5', 1], ['7', 8], ['8', 6], ['9', 4], ['13', 2],
  ])('aplica a exceção apenas aos restos 0/1: base terminada em %s → DV %i', (suffix, expected) => {
    expect(calculateMod11CheckDigit(suffix.padStart(43, '0'))).toBe(expected);
  });
});
