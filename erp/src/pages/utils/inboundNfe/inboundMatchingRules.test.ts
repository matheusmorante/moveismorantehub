import { describe, it, expect } from 'vitest';
import {
  extractMeaningfulTokens,
  detectProductCategory,
  calculateProductMatchScore,
  extractColorCandidateFromTitle,
} from './inboundMatchingRules';

describe('inboundMatchingRules (Domínio Puro)', () => {
  it('extrai tokens significativos removendo acentos e stop-words', () => {
    const tokens = extractMeaningfulTokens('BELICHE RUBIN ESPECIAL C/GRADE E ESCADA 1 Marfim');
    expect(tokens).toContain('beliche');
    expect(tokens).toContain('rubin');
    expect(tokens).toContain('especial');
    expect(tokens).toContain('grade');
    expect(tokens).toContain('escada');
    expect(tokens).toContain('marfim');
    expect(tokens).not.toContain('de');
    expect(tokens).not.toContain('com');
  });

  it('detecta categorias moveleiras corretamente', () => {
    expect(detectProductCategory('Mesa de Jantar 6 cadeiras')).toBe('mesa_jantar');
    expect(detectProductCategory('Painel Rack para TV 65')).toBe('rack');
    expect(detectProductCategory('Beliche Infantil')).toBe('cama');
    expect(detectProductCategory('Roupeiro Casal 6 portas')).toBe('guarda_roupa');
    expect(detectProductCategory('Escrivaninha para Computador')).toBe('escritorio');
  });

  it('bloqueia e pontua zero quando categorias são incompatíveis', () => {
    const score = calculateProductMatchScore(
      'RACK BANCADA ARTELY SUPREMO',
      'ESCRIVANINHA ARTELY NOTAVEL 120CM'
    );
    expect(score).toBe(0);
  });

  it('calcula score alto para produtos da mesma linha e marca como Valdemóveis Dora', () => {
    const score = calculateProductMatchScore(
      'SALA JANTAR VALDEMOVEIS DORA 120CM 4CAD AURIRA Cinamomo/off/veludo bege',
      'CJ SALA JANTAR VALDEMOVEIS DORA 120CM C/4 CAD'
    );
    expect(score).toBeGreaterThanOrEqual(16);
  });

  it('extrai a cor e acabamento de títulos moveleiros complexos', () => {
    expect(
      extractColorCandidateFromTitle('SALA JANTAR VALDEMOVEIS DORA 120CM 4CAD AURIRA Cinamomo/off/veludo bege')
    ).toBe('Cinamomo/Off/Veludo Bege');

    expect(
      extractColorCandidateFromTitle('BELICHE RUBIN ESPECIAL C/GRADE E ESCADA 1 Marfim')
    ).toBe('Marfim');

    expect(
      extractColorCandidateFromTitle('RACK BANCADA 1.80M NATURE/OFF WHITE')
    ).toBe('Nature/Off White');

    expect(
      extractColorCandidateFromTitle('ROUPEIRO CASAL 6PTS FREIJO')
    ).toBe('Freijo');
  });
});

