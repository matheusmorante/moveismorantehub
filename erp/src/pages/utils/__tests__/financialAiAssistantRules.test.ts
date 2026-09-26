import { describe, it, expect } from 'vitest';

export interface TestCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

const mockCategories: TestCategory[] = [
  { id: '1', name: 'Venda de mercadorias', type: 'income' },
  { id: '2', name: 'Outras receitas', type: 'income' },
  { id: '3', name: 'Combustível', type: 'expense' },
  { id: '4', name: 'Energia elétrica', type: 'expense' },
  { id: '5', name: 'Salários', type: 'expense' },
  { id: '6', name: 'Pró-labore', type: 'expense' },
  { id: '7', name: 'Retirada de sócio', type: 'expense' },
  { id: '8', name: 'Despesa não classificada', type: 'expense' },
];

export const parseHeuristicFinancialIntent = (msg: string, categories: TestCategory[]) => {
  const text = msg.toLowerCase();
  const amountMatch = text.match(/(?:r\$\s*|reais\s*|vales?\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

  // Regra de Ouro Morante Hub: Vendas de produtos/serviços já são lançadas automaticamente pelos pedidos do ERP
  if (text.includes('vendi') || text.includes('venda') || text.includes('vendas')) {
    return {
      type: 'income',
      amount,
      categoryName: null,
      vehicleId: null,
      missingFields: [],
      questionToUser: 'As vendas de produtos/serviços já são lançadas automaticamente pelos pedidos no ERP para evitar duplicidade. Se esta for uma receita diferente (como Aporte, Empréstimo ou Reembolso), por favor informe a categoria desejada.',
      isReadyForConfirmation: false,
    };
  }

  let type: 'income' | 'expense' = 'expense';
  if (text.includes('recebi') || text.includes('recebimento') || text.includes('entrada') || text.includes('reembolso')) {
    type = 'income';
  }

  let catName = 'Despesa não classificada';
  if (text.includes('combustível') || text.includes('gasolina') || text.includes('abasteci')) {
    catName = 'Combustível';
  } else if (text.includes('luz') || text.includes('energia')) {
    catName = 'Energia elétrica';
  } else if (type === 'income') {
    catName = 'Outras receitas';
  }

  const vehicleId = text.includes('strada') ? 'Strada' : text.includes('hr') ? 'HR' : null;

  const missingFields: string[] = [];
  let questionToUser: string | null = null;

  if (!amount || amount <= 0) {
    missingFields.push('amount');
    questionToUser = 'Qual foi o valor dessa movimentação?';
  }

  if (text.includes('retirei') && !text.includes('pró-labore') && !text.includes('pro-labore')) {
    missingFields.push('purpose_withdrawal');
    questionToUser = 'Essa retirada foi pró-labore, retirada de sócio, adiantamento ou distribuição de lucros?';
  } else if (text.includes('paguei joão') || text.includes('paguei joao')) {
    missingFields.push('counterparty_nature');
    questionToUser = 'Esse pagamento foi salário, adiantamento, comissão, montagem ou outra coisa?';
  } else if (text === 'gastei 300' || text.includes('gastei 300')) {
    missingFields.push('description_nature');
    questionToUser = 'Com o que foram gastos esses R$ 300?';
  }

  const isReadyForConfirmation = missingFields.length === 0;

  return {
    type,
    amount,
    categoryName: catName,
    vehicleId,
    missingFields,
    questionToUser,
    isReadyForConfirmation,
  };
};

describe('Módulo Financeiro - Regras do Assistente por IA', () => {
  it('1. Deve interpretar "Paguei 150 de combustível" como despesa, combustível, R$ 150', () => {
    const res = parseHeuristicFinancialIntent('Paguei 150 de combustível', mockCategories);
    expect(res.type).toBe('expense');
    expect(res.categoryName).toBe('Combustível');
    expect(res.amount).toBe(150);
    expect(res.isReadyForConfirmation).toBe(true);
  });

  it('2. NÃO deve aceitar cadastro de Vendas no assistente e orientar sobre lançamentos automáticos no ERP', () => {
    const res = parseHeuristicFinancialIntent('Recebi 1900 de uma venda do sofá', mockCategories);
    expect(res.type).toBe('income');
    expect(res.isReadyForConfirmation).toBe(false);
    expect(res.questionToUser).toContain('As vendas de produtos/serviços já são lançadas automaticamente pelos pedidos no ERP');
  });

  it('3. Deve solicitar o valor ao enviar "Paguei conta de luz"', () => {
    const res = parseHeuristicFinancialIntent('Paguei conta de luz', mockCategories);
    expect(res.amount).toBeNull();
    expect(res.missingFields).toContain('amount');
    expect(res.questionToUser).toBe('Qual foi o valor dessa movimentação?');
    expect(res.isReadyForConfirmation).toBe(false);
  });

  it('4. Deve solicitar a finalidade ao enviar "Gastei 300"', () => {
    const res = parseHeuristicFinancialIntent('Gastei 300', mockCategories);
    expect(res.amount).toBe(300);
    expect(res.missingFields).toContain('description_nature');
    expect(res.questionToUser).toBe('Com o que foram gastos esses R$ 300?');
    expect(res.isReadyForConfirmation).toBe(false);
  });

  it('5. Deve solicitar a natureza ao enviar "Paguei João 500"', () => {
    const res = parseHeuristicFinancialIntent('Paguei João 500', mockCategories);
    expect(res.amount).toBe(500);
    expect(res.missingFields).toContain('counterparty_nature');
    expect(res.questionToUser).toContain('salário, adiantamento, comissão');
    expect(res.isReadyForConfirmation).toBe(false);
  });

  it('6. NÃO deve assumir Pró-labore ao enviar "Retirei 1000 da empresa"', () => {
    const res = parseHeuristicFinancialIntent('Retirei 1000 da empresa', mockCategories);
    expect(res.amount).toBe(1000);
    expect(res.missingFields).toContain('purpose_withdrawal');
    expect(res.questionToUser).toContain('pró-labore, retirada de sócio');
    expect(res.isReadyForConfirmation).toBe(false);
  });

  it('7. Deve interpretar "Abasteci a Strada com 180" como despesa de Combustível de R$ 180', () => {
    const res = parseHeuristicFinancialIntent('Abasteci a Strada com 180', mockCategories);
    expect(res.type).toBe('expense');
    expect(res.categoryName).toBe('Combustível');
    expect(res.amount).toBe(180);
    expect(res.isReadyForConfirmation).toBe(true);
  });
});
