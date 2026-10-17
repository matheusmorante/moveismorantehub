import { describe, expect, it } from 'vitest';
import { currencyToWordsPtBr } from '../currencyToWords';

describe('currencyToWordsPtBr', () => {
  it('converte zero e valores inválidos com segurança', () => {
    expect(currencyToWordsPtBr(0)).toBe('zero real');
    expect(currencyToWordsPtBr(-10)).toBe('zero real');
    expect(currencyToWordsPtBr('abc')).toBe('zero real');
  });

  it('converte valores inteiros singulares e plurais', () => {
    expect(currencyToWordsPtBr(1)).toBe('um real');
    expect(currencyToWordsPtBr(2)).toBe('dois reais');
    expect(currencyToWordsPtBr(10)).toBe('dez reais');
    expect(currencyToWordsPtBr(15)).toBe('quinze reais');
    expect(currencyToWordsPtBr(20)).toBe('vinte reais');
    expect(currencyToWordsPtBr(21)).toBe('vinte e um reais');
    expect(currencyToWordsPtBr(100)).toBe('cem reais');
    expect(currencyToWordsPtBr(105)).toBe('cento e cinco reais');
    expect(currencyToWordsPtBr(500)).toBe('quinhentos reais');
  });

  it('converte exatamente o valor do exemplo do usuário (R$ 1.000,00 -> "mil reais")', () => {
    expect(currencyToWordsPtBr(1000)).toBe('mil reais');
    expect(currencyToWordsPtBr('1000.00')).toBe('mil reais');
    expect(currencyToWordsPtBr(1001)).toBe('mil e um reais');
    expect(currencyToWordsPtBr(1500)).toBe('mil e quinhentos reais');
    expect(currencyToWordsPtBr(3000)).toBe('três mil reais');
  });

  it('converte centavos isolados e combinados', () => {
    expect(currencyToWordsPtBr(0.01)).toBe('um centavo');
    expect(currencyToWordsPtBr(0.5)).toBe('cinquenta centavos');
    expect(currencyToWordsPtBr(1.01)).toBe('um real e um centavo');
    expect(currencyToWordsPtBr(1000.5)).toBe('mil reais e cinquenta centavos');
    expect(currencyToWordsPtBr(2345.67)).toBe(
      'dois mil trezentos e quarenta e cinco reais e sessenta e sete centavos'
    );
  });

  it('converte valores maiores (milhões)', () => {
    expect(currencyToWordsPtBr(1000000)).toBe('um milhão de reais');
  });
});
