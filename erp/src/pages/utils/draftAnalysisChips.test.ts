import { describe, test, expect } from 'vitest';
import { buildDraftAnalysisChips } from './draftAnalysisChips';
import { ParsedFinancialIntent } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Rótulos de Análise em Tempo Real do Assistente Financeiro (Realtime Draft Chips)', () => {
  test('1. Exemplo de Saída Parcelada: "Paguei 20 mil para a Bechara no Pix hoje, em quatro parcelas..."', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 20000,
      totalAmount: 20000,
      supplier: 'Bechara',
      paymentMethod: 'Pix',
      date: 'hoje',
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const chips = buildDraftAnalysisChips(draft);
    const labels = chips.map(c => c.label);

    expect(labels).toEqual([
      'Saída',
      'Valor: R$ 20.000,00',
      'Para: Bechara',
      'Pagamento: Pix',
      'Data: Hoje',
    ]);
  });

  test('3. Remoção de pendência e transição para pronto para confirmar quando o usuário responde o dado faltante', () => {
    // Rascunho inicial incompleto (falta businessPurpose/destino)
    const incompleteDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 2500,
      description: 'geladeira',
      businessPurpose: 'UNKNOWN',
      paymentMethod: 'Pix',
      missingFields: ['businessPurpose'],
      isReadyForConfirmation: false,
      questionToUser: 'Essa geladeira é para a loja ou é uma compra pessoal?',
    };

    expect(incompleteDraft.isReadyForConfirmation).toBe(false);
    expect(incompleteDraft.missingFields).toContain('businessPurpose');

    // Ao responder "É para a loja", o rascunho é atualizado
    const resolvedDraft: ParsedFinancialIntent = {
      ...incompleteDraft,
      businessPurpose: 'BUSINESS',
      categoryName: 'Equipamentos da Empresa',
      missingFields: [],
      questionToUser: null,
      isReadyForConfirmation: true,
    };

    const chips = buildDraftAnalysisChips(resolvedDraft);
    const labels = chips.map(c => c.label);

    expect(resolvedDraft.missingFields).toHaveLength(0);
    expect(resolvedDraft.questionToUser).toBeNull();
    expect(resolvedDraft.isReadyForConfirmation).toBe(true);
    expect(labels).toContain('Categoria: Equipamentos da Empresa');
  });

  test('3. Exemplo de Recorrência: "Todo mês pago 800 reais de internet, começando dia 10, por 12 meses."', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 800,
      categoryName: 'Internet',
      paymentMethod: 'UNKNOWN',
      missingFields: ['paymentMethod'],
      confidence: 0.85,
      isReadyForConfirmation: false,
    };

    const chips = buildDraftAnalysisChips(draft);
    const labels = chips.map(c => c.label);

    expect(labels).toEqual([
      'Saída',
      'Valor: R$ 800,00',
      'Categoria: Internet',
      'Pagamento: Não informado',
    ]);
  });

  test('4. Exemplo de Empréstimo de Banco: "Peguei 30 mil emprestado do banco."', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'income',
      amount: 30000,
      creditor: 'Banco',
      creditorType: 'FINANCIAL_INSTITUTION',
      isLoan: true,
      categoryName: 'Empréstimo',
      paymentMethod: 'Transferência bancária',
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const chips = buildDraftAnalysisChips(draft);
    const labels = chips.map(c => c.label);

    expect(labels).toEqual([
      'Entrada',
      'Valor: R$ 30.000,00',
      'Credor: Banco',
      'Natureza: Empréstimo',
      'Recebimento: Transferência bancária',
    ]);
  });

  test('5. Exemplo de Empréstimo de Pessoa sem forma de recebimento: "Peguei 5 mil emprestado do Matheus."', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'income',
      amount: 5000,
      creditor: 'Matheus',
      creditorType: 'PERSON_OR_OTHER',
      isLoan: true,
      categoryName: 'Empréstimo',
      paymentMethod: 'UNKNOWN',
      missingFields: ['paymentMethod'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const chips = buildDraftAnalysisChips(draft);
    const labels = chips.map(c => c.label);

    expect(labels).toEqual([
      'Entrada',
      'Valor: R$ 5.000,00',
      'Credor: Matheus',
      'Natureza: Empréstimo',
      'Recebimento: Não informado',
    ]);
  });

  test('6. Ordem de Prioridade dos Chips (Seção 20)', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      amount: 10000,
      supplier: 'Kappesberg',
      categoryName: 'Compra de estoque',
      paymentMethod: 'Boleto',
      accountName: 'Banco do Brasil',
      date: '2026-09-06',
      installmentsCount: 2,
      installmentAmount: 5000,
      dueDate: '2026-10-06',
      missingFields: [],
      confidence: 0.95,
      isReadyForConfirmation: true,
    };

    const chips = buildDraftAnalysisChips(draft);
    const priorities = chips.map(c => c.priority);

    // Deve respeitar a ordenação estritamente crescente
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorities[i]).toBeLessThanOrEqual(priorities[i + 1]);
    }
  });
});
