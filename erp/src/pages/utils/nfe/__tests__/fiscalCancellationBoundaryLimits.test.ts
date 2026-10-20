import { describe, expect, it } from 'vitest';
import { getFiscalCancellationPolicy } from '../fiscalCancellationPolicy';
import { getCancellationWindow, formatCancellationTimeRemaining } from '../nfeEventRules';

const hour = 60 * 60 * 1000;
const minute = 60 * 1000;

describe('Cenários A05 e A08: Fronteiras Exatas de Prazo de Cancelamento Fiscal (PR)', () => {
  describe('Cenário A05: NF-e 55 — Fronteira Exata de 168 horas (7 dias)', () => {
    // Timestamp típico retornado pela SEFAZ-PR no dhRecbto da autorização (fuso de Brasília/PR, UTC-03:00)
    const sefazPrAuthIso = '2026-10-12T10:15:30-03:00';
    const authMs = new Date(sefazPrAuthIso).getTime();
    const limitMs = 168 * hour;
    const deadlineMs = authMs + limitMs;

    const baseInput = {
      model: '55',
      authorizedAt: sefazPrAuthIso,
      status: 'autorizada',
      environment: 1 as const,
      goodsCirculated: false,
      operationDidNotOccur: true,
      issuerUf: 'PR',
    };

    it('getCancellationWindow calcula exatamente 168 horas para modelo 55 com validade e deadline corretos', () => {
      const window = getCancellationWindow('55', sefazPrAuthIso, authMs);
      expect(window.valid).toBe(true);
      expect(window.deadline?.getTime()).toBe(deadlineMs);
      expect(window.remainingMs).toBe(limitMs);
      expect(window.expired).toBe(false);
      expect(formatCancellationTimeRemaining(window.remainingMs)).toBe('7 dias e 0 min');
    });

    it('instante 1 milissegundo antes do deadline: ação é cancel e expired é false', () => {
      const now = deadlineMs - 1;
      const window = getCancellationWindow('55', sefazPrAuthIso, now);
      expect(window.expired).toBe(false);
      expect(window.remainingMs).toBe(1);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('cancel');
      expect(policy.deadline?.getTime()).toBe(deadlineMs);
    });

    it('no milissegundo exato do deadline (168h00m00.000s): ação é cancel e expired é false (regra legal: não superior a 168h)', () => {
      const now = deadlineMs;
      const window = getCancellationWindow('55', sefazPrAuthIso, now);
      expect(window.expired).toBe(false);
      expect(window.remainingMs).toBe(0);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('cancel');
      expect(policy.deadline?.getTime()).toBe(deadlineMs);
    });

    it('1 milissegundo após o deadline (168h00m00.001s): expired é true e ação transiciona para estorno', () => {
      const now = deadlineMs + 1;
      const window = getCancellationWindow('55', sefazPrAuthIso, now);
      expect(window.expired).toBe(true);
      expect(window.remainingMs).toBe(0);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('estorno');
      expect(policy.reason).toContain('O prazo de cancelamento da NF-e expirou');
    });

    it('1 segundo após o deadline: ação permanece estorno', () => {
      const now = deadlineMs + 1000;
      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('estorno');
    });

    it('após 168h sem confirmação de que a operação não ocorreu: ação é manual_review', () => {
      const now = deadlineMs + 1;
      const policy = getFiscalCancellationPolicy({ ...baseInput, operationDidNotOccur: false, now });
      expect(policy.action).toBe('manual_review');
      expect(policy.reason).toContain('operação não foi comprovada como não realizada');
    });

    it('em ambiente de homologação (status=homologada, environment=2): fronteira de 168h segue as mesmas regras', () => {
      const hmlInput = { ...baseInput, environment: 2 as const, status: 'homologada' };
      expect(getFiscalCancellationPolicy({ ...hmlInput, now: deadlineMs }).action).toBe('cancel');
      expect(getFiscalCancellationPolicy({ ...hmlInput, now: deadlineMs + 1 }).action).toBe('estorno');
    });
  });

  describe('Cenário A08: NFC-e 65 — Fronteira Exata de 30 minutos', () => {
    // Timestamp de autorização NFC-e SEFAZ-PR
    const sefazPrAuthIso = '2026-10-19T14:00:00-03:00';
    const authMs = new Date(sefazPrAuthIso).getTime();
    const limitMs = 30 * minute;
    const deadlineMs = authMs + limitMs;

    const baseInput = {
      model: '65',
      authorizedAt: sefazPrAuthIso,
      status: 'autorizada',
      environment: 1 as const,
      goodsCirculated: false,
      operationDidNotOccur: true,
      issuerUf: 'PR',
    };

    it('getCancellationWindow calcula exatamente 30 minutos para modelo 65 com validade e deadline corretos', () => {
      const window = getCancellationWindow('65', sefazPrAuthIso, authMs);
      expect(window.valid).toBe(true);
      expect(window.deadline?.getTime()).toBe(deadlineMs);
      expect(window.remainingMs).toBe(limitMs);
      expect(window.expired).toBe(false);
      expect(formatCancellationTimeRemaining(window.remainingMs)).toBe('30 min');
    });

    it('instante 1 milissegundo antes do deadline de 30 min: ação é cancel e expired é false', () => {
      const now = deadlineMs - 1;
      const window = getCancellationWindow('65', sefazPrAuthIso, now);
      expect(window.expired).toBe(false);
      expect(window.remainingMs).toBe(1);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('cancel');
      expect(policy.deadline?.getTime()).toBe(deadlineMs);
    });

    it('no milissegundo exato do deadline (30m00.000s): ação é cancel e expired é false (regra legal: não superior a 30 min)', () => {
      const now = deadlineMs;
      const window = getCancellationWindow('65', sefazPrAuthIso, now);
      expect(window.expired).toBe(false);
      expect(window.remainingMs).toBe(0);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('cancel');
      expect(policy.deadline?.getTime()).toBe(deadlineMs);
    });

    it('1 milissegundo após o deadline (30m00.001s): expired é true e ação transiciona para estorno (NF-e 55 ajuste)', () => {
      const now = deadlineMs + 1;
      const window = getCancellationWindow('65', sefazPrAuthIso, now);
      expect(window.expired).toBe(true);
      expect(window.remainingMs).toBe(0);

      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('estorno');
      expect(policy.reason).toContain('O prazo de cancelamento da NFC-e expirou');
      expect(policy.reason).toContain('NF-e modelo 55 de ajuste');
    });

    it('1 segundo após o deadline de 30 min: ação permanece estorno', () => {
      const now = deadlineMs + 1000;
      const policy = getFiscalCancellationPolicy({ ...baseInput, now });
      expect(policy.action).toBe('estorno');
    });

    it('não aplica por analogia a regra de 168h da NF-e 55 para a NFC-e 65', () => {
      // 31 minutos após autorização: NF-55 ainda seria cancelável, mas NFC-e 65 já expirou e exige estorno
      const now = authMs + 31 * minute;
      expect(getFiscalCancellationPolicy({ ...baseInput, model: '55', now }).action).toBe('cancel');
      expect(getFiscalCancellationPolicy({ ...baseInput, model: '65', now }).action).toBe('estorno');
    });

    it('em ambiente de homologação (status=homologada, environment=2): fronteira de 30min segue as mesmas regras', () => {
      const hmlInput = { ...baseInput, environment: 2 as const, status: 'homologada' };
      expect(getFiscalCancellationPolicy({ ...hmlInput, now: deadlineMs }).action).toBe('cancel');
      expect(getFiscalCancellationPolicy({ ...hmlInput, now: deadlineMs + 1 }).action).toBe('estorno');
    });
  });
});
