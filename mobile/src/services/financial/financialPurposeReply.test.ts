import { describe, expect, it } from 'vitest';
import { findPurposeDraftTarget, inferBusinessPurpose } from './financialPurposeReply';

describe('resposta sobre conta pessoal ou da loja', () => {
  it('entende que o pagamento da internet é pessoal', () => {
    expect(inferBusinessPurpose('esse pagamento da internet já é conta pessoal')).toBe('PERSONAL');
  });

  it('direciona a resposta somente ao draft de internet', () => {
    const drafts = [
      { description: 'Pagamento de conta de luz', businessPurpose: 'UNKNOWN' as const, missingFields: ['businessPurpose'] },
      { description: 'Pagamento de internet', businessPurpose: 'UNKNOWN' as const, missingFields: ['businessPurpose'] },
    ];
    expect(findPurposeDraftTarget(drafts, 'esse pagamento da internet já é conta pessoal')).toBe(1);
  });

  it('considera a última correção explícita quando a frase menciona loja e pessoal', () => {
    expect(inferBusinessPurpose('não é da loja, essa conta é pessoal')).toBe('PERSONAL');
  });
});
