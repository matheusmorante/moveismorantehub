import { describe, expect, it, vi, beforeEach } from 'vitest';
import { metaErrorHandler } from '../metaErrorHandler';
import { getSettings } from '@/pages/utils/settingsService';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

describe('metaErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockReturnValue({
      companyPhone: '(41) 99749-3547',
    } as any);
  });

  describe('isSelfPhoneNumber', () => {
    it('detecta quando o telefone fornecido é o mesmo da loja', () => {
      expect(metaErrorHandler.isSelfPhoneNumber('(41) 99749-3547')).toBe(true);
      expect(metaErrorHandler.isSelfPhoneNumber('5541997493547')).toBe(true);
      expect(metaErrorHandler.isSelfPhoneNumber('+55 41 9749-3547')).toBe(true);
      expect(metaErrorHandler.isSelfPhoneNumber('4197493547')).toBe(true);
      expect(metaErrorHandler.isSelfPhoneNumber('(41) 98888-7777')).toBe(false);
      expect(metaErrorHandler.isSelfPhoneNumber(null)).toBe(false);
      expect(metaErrorHandler.isSelfPhoneNumber(undefined)).toBe(false);
    });
  });

  describe('parseMetaErrorMessage', () => {
    it('traduz erro de auto-envio para o próprio número da empresa (código 100)', () => {
      const error = {
        code: 100,
        message: '(#100) Invalid parameter',
        error_data: { details: 'Invalid parameter' },
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error, {
        recipientPhone: '(41) 99749-3547',
      });
      expect(result).toContain('é o mesmo número do WhatsApp Business da empresa');
      expect(result).toContain('A Meta não permite que uma conta envie mensagens para o seu próprio número');
    });

    it('traduz erro de parâmetro inválido genérico (#100)', () => {
      const error = {
        code: 100,
        message: '(#100) Invalid parameter',
        error_data: { details: 'Invalid parameter' },
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error, {
        templateName: 'envio_de_pedido',
        recipientPhone: '41988887777',
      });
      expect(result).toContain('Meta API (Erro 100 - Parâmetro Inválido)');
      expect(result).toContain('envio_de_pedido');
    });

    it('traduz erro de janela de conversação de 24 horas (#131047)', () => {
      const error = {
        code: 131047,
        message: '(#131047) Re-engagement message: More than 24 hours have elapsed',
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error);
      expect(result).toContain('Meta API (Regra 24h)');
      expect(result).toContain('fora da janela de 24 horas');
    });

    it('traduz erro de modelo inexistente (#132000)', () => {
      const error = {
        code: 132000,
        message: 'Template does not exist',
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error, {
        templateName: 'modelo_inexistente',
      });
      expect(result).toContain('Meta API (Erro 132000)');
      expect(result).toContain('"modelo_inexistente"');
    });

    it('traduz erro de quebras de linha em parâmetros (#132018)', () => {
      const error = {
        code: 132018,
        message: 'There’s an issue with the parameters in your template: Param text cannot have new-line/tab characters',
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error);
      expect(result).toContain('Meta API (Erro 132018)');
      expect(result).toContain('quebras de linha, tabulações ou múltiplos espaços');
    });

    it('traduz erro de token expirado (#190)', () => {
      const error = {
        code: 190,
        message: 'Invalid OAuth access token - Cannot parse access token',
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error);
      expect(result).toContain('Token do Meta expirado ou inválido');
    });

    it('traduz erro de permissão bloqueada (#200)', () => {
      const error = {
        code: 200,
        message: 'Permissions error: access to API blocked',
      };
      const result = metaErrorHandler.parseMetaErrorMessage(error);
      expect(result).toContain('Acesso à API Bloqueado');
    });
  });
});
