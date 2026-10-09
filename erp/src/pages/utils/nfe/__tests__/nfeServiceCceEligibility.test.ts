import { describe, expect, it } from 'vitest';
import { canIssueCce } from '../nfeCce';

describe('elegibilidade da Carta de Correção', () => {
  it('bloqueia novas CC-e por decisão operacional em produção e homologação', () => {
    expect(canIssueCce({ modelo: '55', status: 'autorizada' }).canIssue).toBe(false);
    expect(canIssueCce({ modelo: '55', status: 'homologada' }).canIssue).toBe(false);
  });

  it('recusa NFC-e e documentos sem estado autorizado', () => {
    expect(canIssueCce({ modelo: '65', status: 'homologada' }).canIssue).toBe(false);
    expect(canIssueCce({ modelo: '55', status: 'cancelada' }).canIssue).toBe(false);
  });
});
