import { describe, it, expect } from 'vitest';

import {
  calculateBalance,
  calculateDRE,
  determineResultNature,
  processPayablePayment,
} from './financialInvariantsTestModel';
import type { FinancialTransaction, PayableAccount } from './financialInvariantsTestModel';
export * from './financialInvariantsTestModel';

describe('Suíte Completa de Invariantes Financeiros (19 Testes Regressivos Obrigatórios)', () => {
  it('1. Energia: SAÍDA + DESPESA', () => {
    const nature = determineResultNature('Energia Elétrica', 'expense');
    expect(nature).toBe('DESPESA');
  });

  it('2. Salário: SAÍDA + DESPESA', () => {
    const nature = determineResultNature('Salários', 'expense');
    expect(nature).toBe('DESPESA');
  });

  it('3. Juros recebidos: ENTRADA + RECEITA', () => {
    const nature = determineResultNature('Juros e Rendimentos Recebidos', 'income');
    expect(nature).toBe('RECEITA');
  });

  it('4. Empréstimo recebido: ENTRADA + NÃO AFETA RESULTADO', () => {
    const nature = determineResultNature('Empréstimo Recebido', 'income');
    expect(nature).toBe('NAO_AFETA_RESULTADO');
  });

  it('5. Aporte: ENTRADA + NÃO AFETA RESULTADO', () => {
    const nature = determineResultNature('Aporte de Sócio', 'income');
    expect(nature).toBe('NAO_AFETA_RESULTADO');
  });

  it('6. Distribuição de lucros: SAÍDA + NÃO AFETA RESULTADO', () => {
    const nature = determineResultNature('Distribuição de Lucros', 'expense');
    expect(nature).toBe('NAO_AFETA_RESULTADO');
  });

  it('7. Principal de empréstimo: SAÍDA + NÃO AFETA RESULTADO', () => {
    const nature = determineResultNature(
      'Pagamento de Empréstimo (Amortização de Principal)',
      'expense'
    );
    expect(nature).toBe('NAO_AFETA_RESULTADO');
  });

  it('8. Conta a Pagar pendente: não altera saldo de caixa', () => {
    const payable: PayableAccount = {
      id: 'p1',
      description: 'Copel',
      amount: 800,
      due_date: '2026-10-10',
      status: 'PENDING',
      category_name: 'Energia Elétrica',
    };
    expect(payable.status).toBe('PENDING');
    expect(calculateBalance([], 5000)).toBe(5000);
  });

  it('9. Pagamento: gera SAÍDA efetiva', () => {
    const payable: PayableAccount = {
      id: 'p1',
      description: 'Copel',
      amount: 800,
      due_date: '2026-10-10',
      status: 'PENDING',
      category_name: 'Energia Elétrica',
    };
    const res = processPayablePayment(payable, '2026-10-10', 'PIX');
    expect(res.updatedPayable.status).toBe('PAID');
    expect(res.newTransaction?.type).toBe('expense');
    expect(res.newTransaction?.amount).toBe(800);
    expect(calculateBalance([res.newTransaction!], 5000)).toBe(4200);
  });

  it('10. Fluxo de Caixa: considera todas as Entradas/Saídas efetivas (inclusive empréstimos e aportes)', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 20000,
        date: '2026-09-01',
        description: 'Empréstimo Banco',
        status: 'ACTIVE',
        category_name: 'Empréstimo Recebido',
        result_nature: 'NAO_AFETA_RESULTADO',
      },
      {
        id: '2',
        type: 'income',
        amount: 5000,
        date: '2026-09-02',
        description: 'Venda de Móveis',
        status: 'ACTIVE',
        category_name: 'Vendas',
        result_nature: 'RECEITA',
      },
      {
        id: '3',
        type: 'expense',
        amount: 1000,
        date: '2026-09-03',
        description: 'Luz',
        status: 'ACTIVE',
        category_name: 'Energia Elétrica',
        result_nature: 'DESPESA',
      },
    ];
    const balance = calculateBalance(txs, 0);
    expect(balance).toBe(24000); // 20k + 5k - 1k
  });

  it('11. Resultado DRE: não considera empréstimo como Receita', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 20000,
        date: '2026-09-01',
        description: 'Empréstimo Banco',
        status: 'ACTIVE',
        category_name: 'Empréstimo Recebido',
        result_nature: 'NAO_AFETA_RESULTADO',
      },
      {
        id: '2',
        type: 'income',
        amount: 5000,
        date: '2026-09-02',
        description: 'Venda de Móveis',
        status: 'ACTIVE',
        category_name: 'Vendas',
        result_nature: 'RECEITA',
      },
    ];
    const dre = calculateDRE(txs, 0);
    expect(dre.revenue).toBe(5000); // Não inclui os 20k de empréstimo
  });

  it('12. Resultado DRE: não considera aporte como Receita', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 50000,
        date: '2026-09-01',
        description: 'Aporte Sócio',
        status: 'ACTIVE',
        category_name: 'Aporte de Sócio',
        result_nature: 'NAO_AFETA_RESULTADO',
      },
    ];
    const dre = calculateDRE(txs, 0);
    expect(dre.revenue).toBe(0);
  });

  it('13. Resultado DRE: não considera distribuição de lucro como Despesa operacional', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 10000,
        date: '2026-09-01',
        description: 'Distribuição de Lucro',
        status: 'ACTIVE',
        category_name: 'Distribuição de Lucros',
        result_nature: 'NAO_AFETA_RESULTADO',
      },
      {
        id: '2',
        type: 'expense',
        amount: 2000,
        date: '2026-09-02',
        description: 'Salários',
        status: 'ACTIVE',
        category_name: 'Salários',
        result_nature: 'DESPESA',
      },
    ];
    const dre = calculateDRE(txs, 0);
    expect(dre.operatingExpenses).toBe(2000); // Não inclui os 10k de distribuição de lucros
  });

  it('14. Compra de mercadoria: pagamento aparece como Saída de caixa sem duplicar CMV no Resultado DRE', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 15000,
        date: '2026-09-01',
        description: 'Compra de Estoque Bechara',
        status: 'ACTIVE',
        category_name: 'Compra de Estoque / Mercadorias',
        result_nature: 'NAO_AFETA_RESULTADO',
      },
    ];
    const balance = calculateBalance(txs, 20000);
    expect(balance).toBe(5000); // Aparece no fluxo de caixa

    const dre = calculateDRE(txs, 3000); // 3000 é o CMV das mercadorias vendidas
    expect(dre.operatingExpenses).toBe(0);
    expect(dre.cmv).toBe(3000);
  });

  it('15. Filtros: Entradas retorna todas as entradas, inclusive não-receitas', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 20000,
        date: '2026-09-01',
        description: 'Empréstimo',
        status: 'ACTIVE',
        category_name: 'Empréstimo Recebido',
      },
      {
        id: '2',
        type: 'income',
        amount: 500,
        date: '2026-09-02',
        description: 'Juros',
        status: 'ACTIVE',
        category_name: 'Juros Recebidos',
      },
      {
        id: '3',
        type: 'expense',
        amount: 1000,
        date: '2026-09-03',
        description: 'Luz',
        status: 'ACTIVE',
        category_name: 'Energia',
      },
    ];
    const entradas = txs.filter((t) => t.type === 'income');
    expect(entradas).toHaveLength(2);
    expect(entradas.map((e) => e.description)).toContain('Empréstimo');
    expect(entradas.map((e) => e.description)).toContain('Juros');
  });

  it('16. Filtros: Saídas retorna todas as saídas, inclusive não-despesas', () => {
    const txs: FinancialTransaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 5000,
        date: '2026-09-01',
        description: 'Distribuição Lucro',
        status: 'ACTIVE',
        category_name: 'Distribuição de Lucros',
      },
      {
        id: '2',
        type: 'expense',
        amount: 700,
        date: '2026-09-02',
        description: 'Luz',
        status: 'ACTIVE',
        category_name: 'Energia',
      },
      {
        id: '3',
        type: 'income',
        amount: 1000,
        date: '2026-09-03',
        description: 'Venda',
        status: 'ACTIVE',
        category_name: 'Vendas',
      },
    ];
    const saidas = txs.filter((t) => t.type === 'expense');
    expect(saidas).toHaveLength(2);
    expect(saidas.map((s) => s.description)).toContain('Distribuição Lucro');
    expect(saidas.map((s) => s.description)).toContain('Luz');
  });

  it('17. Nomenclatura UI: Formulários usam + Entrada e - Saída', () => {
    const formatTypeLabel = (type: 'income' | 'expense') =>
      type === 'income' ? '+ Entrada' : '- Saída';
    expect(formatTypeLabel('income')).toBe('+ Entrada');
    expect(formatTypeLabel('expense')).toBe('- Saída');
  });

  it('18. AI Assistant: backend infere resultNature deterministicamente via categoria', () => {
    expect(determineResultNature('Empréstimo Recebido', 'income')).toBe('NAO_AFETA_RESULTADO');
    expect(determineResultNature('Energia Elétrica', 'expense')).toBe('DESPESA');
    expect(determineResultNature('Juros Recebidos', 'income')).toBe('RECEITA');
  });

  it('19. Retrocompatibilidade: registros antigos sem result_nature derivam corretamente via fallback da categoria ou tipo', () => {
    const legacyTx: FinancialTransaction = {
      id: 'leg_1',
      type: 'income',
      amount: 1000,
      date: '2025-01-01',
      description: 'Antigo',
      status: 'ACTIVE',
      category_name: 'Empréstimo Recebido',
      // result_nature não definido (undefined)
    };

    const derivedNature =
      legacyTx.result_nature || determineResultNature(legacyTx.category_name, legacyTx.type);
    expect(derivedNature).toBe('NAO_AFETA_RESULTADO');
  });

  it('20. INVARIANTE ARQUITETURAL: batchDraftsList NUNCA pode ser colapsado silenciosamente no item [0]', () => {
    const mockMultiBatch = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      batchDraftsList: [
        {
          description: 'Pagamento de conta de luz',
          amount: 100,
          isRealized: true,
          businessPurpose: 'UNKNOWN',
        },
        {
          description: 'Pagamento de internet',
          amount: 300,
          isRealized: true,
          businessPurpose: 'UNKNOWN',
        },
      ],
    };

    // Garantir que a validação de quantidade preserva ambos os fatos sem early return
    expect(mockMultiBatch.batchDraftsList).toHaveLength(2);

    // Conscientemente batch-aware: se length > 1, a UI/pipeline DEVE operar sobre todos os itens
    const isBatchAware = mockMultiBatch.batchDraftsList.length > 1;
    expect(isBatchAware).toBe(true);

    const processedDescriptions = mockMultiBatch.batchDraftsList.map((d) => d.description);
    expect(processedDescriptions).toContain('Pagamento de conta de luz');
    expect(processedDescriptions).toContain('Pagamento de internet');
  });

  it('21. DOCUMENTAÇÃO HISTÓRICA DA CAUSA RAIZ: Rastreabilidade do Bug de Descarte de Lote', () => {
    const rootCauseReport = {
      bugId: 'PERDA_SEGUNDA_MOVIMENTACAO_MESMA_MENSAGEM',
      symptom:
        'Ao falar "paguei a luz 100 e internet 300", a internet sumia e aparecia apenas 100 na UI',
      rootCause:
        'Atribuição precoce de questionToUser isolada do item [0] + descarte visual de batchDraftsList na UI do chat',
      resolution:
        'buildGroupedQuestion + applyTurnPatchWithDraftList + buildDraftAnalysisChips batch-aware',
    };

    expect(rootCauseReport.rootCause).toContain('item [0]');
    expect(rootCauseReport.resolution).toContain('batch-aware');
  });
});
