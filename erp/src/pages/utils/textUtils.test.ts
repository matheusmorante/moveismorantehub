import { describe, it, expect } from 'vitest';
import { buildAccentInsensitiveRegex, removeAccents } from './textUtils';

describe('textUtils - buildAccentInsensitiveRegex e equivalências fonéticas', () => {
  it('deve casar "guarda-roupa sydney" com "Guarda Roupa Sidney"', () => {
    const term = 'guarda-roupa sydney';
    const regexStr = `.*${buildAccentInsensitiveRegex(term)}.*`;
    const regex = new RegExp(regexStr, 'i');

    expect(regex.test('Guarda Roupa Sidney')).toBe(true);
    expect(regex.test('Guarda-Roupa Sidney')).toBe(true);
    expect(regex.test('Guarda Roupa Sidney 6 Portas 2 Gavetas')).toBe(true);
  });

  it('deve casar acentuações e variações de i e y', () => {
    const term = 'sydney';
    const regex = new RegExp(buildAccentInsensitiveRegex(term), 'i');

    expect(regex.test('sidney')).toBe(true);
    expect(regex.test('Sydney')).toBe(true);
    expect(regex.test('Sídney')).toBe(true);
  });
});
