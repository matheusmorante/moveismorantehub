import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

import {
  harmonizePostStylesWithGeminiFlash,
  DEFAULT_THEME_STYLE,
} from './postHtmlStyleOptimizer';
import { AiGateway } from '@/services/aiGateway/AiGateway';

describe('postHtmlStyleOptimizer - Harmonização de Cores e Contraste via Gemini Flash', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve possuir DEFAULT_THEME_STYLE com cardBorderColor branca e contraste WCAG', () => {
    expect(DEFAULT_THEME_STYLE.cardBorderColor).toBe('#ffffff');
    expect(DEFAULT_THEME_STYLE.titleColor).toBeTruthy();
    expect(DEFAULT_THEME_STYLE.priceCardBg).toContain('gradient');
    expect(DEFAULT_THEME_STYLE.contrastGrade).toContain('WCAG');
  });

  it('deve aplicar as cores retornadas pelo Gemini Flash mantendo a borda branca sólida', async () => {
    const mockAiResponse = JSON.stringify({
      titleColor: '#fef08a',
      titleGlow: '0 2px 10px rgba(0,0,0,0.9)',
      priceCardBg: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
      priceCardBorder: 'rgba(59, 130, 246, 0.5)',
      priceTextColor: '#ffffff',
      priceOldTextColor: '#93c5fd',
      installmentTextColor: '#fde047',
      sloganColor: '#e0f2fe',
      benefitsTextColor: '#94a3b8',
      cardBorderColor: '#ffffff',
      contrastGrade: 'Alto Contraste Azul Real / Ouro',
      rationale: 'Harmonização de alto contraste para destacar sobre fundo escuro contemporâneo.',
    });

    vi.spyOn(AiGateway, 'requestText').mockResolvedValue({
      success: true,
      data: mockAiResponse,
      category: 'TEXT',
      modelUsed: 'gemini-2.5-flash',
    });

    const result = await harmonizePostStylesWithGeminiFlash({
      productName: 'Guarda-Roupa Monza 4 Portas',
      category: 'Quarto',
      hasCustomBackground: false,
    });

    expect(result.titleColor).toBe('#fef08a');
    expect(result.priceCardBg).toContain('#1e3a8a');
    expect(result.cardBorderColor).toBe('#ffffff'); // Obrigatório borda branca
    expect(result.contrastGrade).toBe('Alto Contraste Azul Real / Ouro');
  });

  it('deve usar o fallback DEFAULT_THEME_STYLE em caso de falha da API ou resposta inválida', async () => {
    vi.spyOn(AiGateway, 'requestText').mockResolvedValue({
      success: false,
      errorCode: 'AI_SERVICE_ERROR',
      errorMessage: 'Timeout',
      category: 'TEXT',
      modelUsed: 'gemini-2.5-flash',
    });

    const result = await harmonizePostStylesWithGeminiFlash({
      productName: 'Sofá Retrátil',
      category: 'Sala',
    });

    expect(result.titleColor).toBe(DEFAULT_THEME_STYLE.titleColor);
    expect(result.cardBorderColor).toBe('#ffffff');
    expect(result.contrastGrade).toContain('Padrão');
  });
});
