import { describe, expect, it } from 'vitest';
import { calculateAccessKeyDigit, hasValidAccessKeyDigit, isValidCnpj, normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers.js';
import { formatAccessKey, generateNfeAccessKey } from '../nfeAccessKey';
import { validateNfeAccessKey } from '../../nfeAccessKey';

// NT Conjunta 2025.001, anexos I/II. Vetor independente: soma ponderada ASCII-48.
const alphaKey = '41261012ABC34501DE35550010000001061705367136';

describe('identificadores fiscais numéricos e alfanuméricos', () => {
  it.each(['12ABC34501DE35', '12.abc.345/01de-35', '44512248000107', '12345678000195'])(
    'valida os dois DVs do CNPJ %s', (value) => expect(isValidCnpj(value)).toBe(true)
  );
  it.each(['12ABC34501DE36', '00000000000000', '12ABC34501DE3A', '12ABC34501DÉ35', '12ABC34501DE35!', '12345678000196', '123'])(
    'recusa CNPJ inválido %s', (value) => expect(isValidCnpj(value)).toBe(false)
  );
  it('não apaga caracteres desconhecidos durante a normalização', () => {
    expect(normalizeFiscalIdentifier('12.abc.345/01de-35!')).toBe('12ABC34501DE35!');
  });
  it('preserva as letras e calcula DV 6 no vetor da chave', () => {
    expect(calculateAccessKeyDigit(alphaKey.slice(0, 43))).toBe(6);
    expect(hasValidAccessKeyDigit(alphaKey)).toBe(true);
    expect(generateNfeAccessKey({
      ufCode: '41', yearMonth: '2610', cnpj: '12.abc.345/01de-35', model: '55',
      series: 1, number: 106, emissionType: '1', randomCode: '70536713',
    }).accessKey).toBe(alphaKey);
    expect(validateNfeAccessKey(formatAccessKey(alphaKey))).toEqual({ valid: true, normalized: alphaKey });
    expect(formatAccessKey(alphaKey).replaceAll(' ', '')).toBe(alphaKey);
  });
  it.each([
    `${alphaKey.slice(0, 43)}5`,
    `A${alphaKey.slice(1)}`,
    `${alphaKey.slice(0, 18)}A${alphaKey.slice(19)}`,
    `${alphaKey.slice(0, 22)}A${alphaKey.slice(23)}`,
    `${alphaKey}!`,
  ])('recusa DV, tamanho ou posição de letra inválida', (key) => {
    expect(hasValidAccessKeyDigit(key)).toBe(false);
    expect(validateNfeAccessKey(key).valid).toBe(false);
  });
  it('não completa CNPJ incompleto com zeros nem descarta símbolos', () => {
    for (const cnpj of ['123', '12ABC34501DE36', '12ABC34501DE35!']) {
      expect(() => generateNfeAccessKey({ ufCode: '41', yearMonth: '2610', cnpj, model: '55', series: 1, number: 106, emissionType: '1' })).toThrow('CNPJ');
    }
  });
});
