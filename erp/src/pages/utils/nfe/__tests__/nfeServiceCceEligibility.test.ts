import { describe, expect, it } from 'vitest';
import { canIssueCce } from '../nfeCce';

describe('elegibilidade da Carta de Correção', () => {
  it('permite NF-e 55 autorizada em produção e homologada em teste', () => {
    expect(canIssueCce({ modelo: '55', status: 'autorizada' })).toEqual({ canIssue: true });
    expect(canIssueCce({ modelo: '55', status: 'homologada' })).toEqual({ canIssue: true });
  });

  it('recusa NFC-e e documentos sem estado autorizado', () => {
    expect(canIssueCce({ modelo: '65', status: 'homologada' }).canIssue).toBe(false);
    expect(canIssueCce({ modelo: '55', status: 'cancelada' }).canIssue).toBe(false);
  });
});
