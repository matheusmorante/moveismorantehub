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

  it('entende respostas monossilábicas ou diretas como "loja", "empresa", "pessoal", "casa"', () => {
    expect(inferBusinessPurpose('loja')).toBe('BUSINESS');
    expect(inferBusinessPurpose('empresa')).toBe('BUSINESS');
    expect(inferBusinessPurpose('da loja')).toBe('BUSINESS');
    expect(inferBusinessPurpose('pessoal')).toBe('PERSONAL');
    expect(inferBusinessPurpose('casa')).toBe('PERSONAL');
    expect(inferBusinessPurpose('particular')).toBe('PERSONAL');
  });

  it('classifica salário automaticamente como BUSINESS sem ambiguidade', async () => {
    const { validateParsedIntent } = await import('./financialIntentValidator');
    const result = validateParsedIntent({
      description: 'Salário do Matheus Morante',
      amount: 5000,
      movementType: 'expense',
    });
    expect(result.businessPurpose).toBe('BUSINESS');
    expect(result.categoryName).toBe('Salários');
    expect(result.missingFields).not.toContain('businessPurpose');
  });

  it('processFinancialInput classifica salário como BUSINESS e não pergunta finalidade', async () => {
    const { processFinancialInput } = await import('./financialIntentValidator');
    const { draft: result } = processFinancialInput('SALARIO DO MATHEUS MORANTE 5000');
    expect(result.businessPurpose).toBe('BUSINESS');
    expect(result.categoryName).toBe('Salários');
    expect(result.missingFields).not.toContain('businessPurpose');
    expect(result.missingFields).toContain('paymentMethod');
  });
});
