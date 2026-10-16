import { describe, expect, it } from 'vitest';
import { whatsappGraphService } from '../whatsappGraphService';

describe('whatsappGraphService.sanitizeTemplateParam', () => {
  it('substitui quebras de linha e tabs por bullet points limpos', () => {
    const input = 'Linha 1\nLinha 2\r\nLinha 3\tTabulada';
    const result = whatsappGraphService.sanitizeTemplateParam(input);
    expect(result).toBe('Linha 1 • Linha 2 • Linha 3 • Tabulada');
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
    expect(result).not.toContain('\t');
  });

  it('colapsa 4 ou mais espaços consecutivos para evitar erro 132018 da Meta', () => {
    const input = 'Texto com      muitos    espaços';
    const result = whatsappGraphService.sanitizeTemplateParam(input);
    expect(result).toBe('Texto com muitos espaços');
    expect(result).not.toMatch(/\s{4,}/);
  });

  it('trata valores nulos, indefinidos ou vazios com fallback seguro', () => {
    expect(whatsappGraphService.sanitizeTemplateParam(null)).toBe('-');
    expect(whatsappGraphService.sanitizeTemplateParam(undefined)).toBe('-');
    expect(whatsappGraphService.sanitizeTemplateParam('')).toBe('-');
    expect(whatsappGraphService.sanitizeTemplateParam('   ')).toBe('-');
  });

  it('limita o tamanho máximo a 1000 caracteres para respeitar o limite de 1024 da Meta', () => {
    const huge = 'A'.repeat(1500);
    const result = whatsappGraphService.sanitizeTemplateParam(huge);
    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('whatsappGraphService sender verification & validation', () => {
  it('identifica e traduz erro de remetente pendente de verificação (NOT_VERIFIED)', () => {
    const parsed = whatsappGraphService.parseMetaErrorMessage({
      code: 133010,
      message: 'Account not registered',
    });
    expect(parsed).toContain('NOT_VERIFIED');
    expect(parsed).toContain('verificação pendente');
  });

  it('formata telefone de destinatário brasileiro para o padrão E.164 com DDI 55', () => {
    expect(whatsappGraphService.formatRecipientPhone('41992244631')).toBe('5541992244631');
    expect(whatsappGraphService.formatRecipientPhone('(41) 99224-4631')).toBe('5541992244631');
    expect(whatsappGraphService.formatRecipientPhone('5541992244631')).toBe('5541992244631');
  });
});
