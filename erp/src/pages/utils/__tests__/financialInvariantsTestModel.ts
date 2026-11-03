export type ResultNature = 'RECEITA' | 'DESPESA' | 'NAO_AFETA_RESULTADO';

export function determineResultNature(
  categoryName?: string | null,
  type?: 'income' | 'expense'
): ResultNature {
  if (!categoryName) {
    return type === 'income' ? 'RECEITA' : 'DESPESA';
  }

  const name = categoryName.toLowerCase().trim();

  // Entradas e Saídas que NÃO afetam resultado
  if (
    name.includes('aporte') ||
    name.includes('empréstimo recebido') ||
    name.includes('emprestimo recebido') ||
    name.includes('saldo inicial') ||
    name.includes('devolução') ||
    name.includes('devolucao') ||
    name.includes('pagamento de empréstimo') ||
    name.includes('pagamento de emprestimo') ||
    name.includes('amortização') ||
    name.includes('amortizacao') ||
    name.includes('retirada de sócio') ||
    name.includes('retirada de socio') ||
    name.includes('distribuição de lucros') ||
    name.includes('distribuicao de lucros') ||
    name.includes('compra de mercadorias') ||
    name.includes('compra de mercadoria') ||
    name.includes('compra de estoque')
  ) {
    return 'NAO_AFETA_RESULTADO';
  }

  if (type === 'income') return 'RECEITA';
  return 'DESPESA';
}

export interface PayableAccount {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  category_name: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  installment_number?: number | null;
  installments_total?: number | null;
  installment_group_id?: string | null;
  payment_transaction_id?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  is_recurring?: boolean;
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  status: 'ACTIVE' | 'PENDING' | 'REVERSED' | 'CANCELLED';
  category_name?: string;
  result_nature?: ResultNature;
  payable_id?: string | null;
  origin?: string;
  reversed_at?: string | null;
}

export function calculateInstallments(
  totalAmount: number,
  count: number,
  startDateStr: string,
  daysIntervals: number[] = [30, 60, 90]
): { number: number; total: number; amount: number; dueDate: string }[] {
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * count) * 100) / 100;

  const baseDate = new Date(startDateStr + 'T12:00:00Z');
  const installments = [];

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const installmentAmount = isLast
      ? Math.round((baseAmount + remainder) * 100) / 100
      : baseAmount;

    let dueDateStr: string;
    if (daysIntervals && daysIntervals.length >= count) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + daysIntervals[i]);
      dueDateStr = d.toISOString().split('T')[0];
    } else {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + (i + 1));
      dueDateStr = d.toISOString().split('T')[0];
    }

    installments.push({
      number: i + 1,
      total: count,
      amount: installmentAmount,
      dueDate: dueDateStr,
    });
  }

  return installments;
}

export function processPayablePayment(
  payable: PayableAccount,
  paymentDateStr: string,
  paymentMethod: string = 'PIX',
  existingTransactions: FinancialTransaction[] = []
): { updatedPayable: PayableAccount; newTransaction?: FinancialTransaction; alreadyPaid: boolean } {
  if (payable.status === 'PAID' || payable.payment_transaction_id) {
    const existingTx = existingTransactions.find(
      (t) => t.payable_id === payable.id || t.id === payable.payment_transaction_id
    );
    return {
      updatedPayable: payable,
      newTransaction: existingTx,
      alreadyPaid: true,
    };
  }

  const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
  const newTx: FinancialTransaction = {
    id: txId,
    type: 'expense',
    amount: payable.amount,
    date: paymentDateStr,
    description: `Pagamento: ${payable.description}`,
    status: 'ACTIVE',
    category_name: payable.category_name,
    result_nature: determineResultNature(payable.category_name, 'expense'),
    payable_id: payable.id,
    origin: 'PAYABLE_PAYMENT',
  };

  const updatedPayable: PayableAccount = {
    ...payable,
    status: 'PAID',
    paid_at: paymentDateStr,
    payment_method: paymentMethod,
    payment_transaction_id: txId,
  };

  return {
    updatedPayable,
    newTransaction: newTx,
    alreadyPaid: false,
  };
}

export function calculateBalance(
  transactions: FinancialTransaction[],
  initialBalance: number = 0
): number {
  return transactions.reduce((acc, t) => {
    if (t.status !== 'ACTIVE' || t.reversed_at) return acc;
    if (t.type === 'income') return acc + t.amount;
    if (t.type === 'expense') return acc - t.amount;
    return acc;
  }, initialBalance);
}

export function calculateDRE(transactions: FinancialTransaction[], estimatedCMV: number = 0) {
  let revenue = 0;
  let operatingExpenses = 0;

  for (const t of transactions) {
    if (t.status !== 'ACTIVE' || t.reversed_at) continue;
    const nature = t.result_nature || determineResultNature(t.category_name, t.type);

    if (nature === 'RECEITA') revenue += t.amount;
    else if (nature === 'DESPESA') operatingExpenses += t.amount;
  }

  const grossMargin = revenue - estimatedCMV;
  const netResult = grossMargin - operatingExpenses;

  return { revenue, cmv: estimatedCMV, grossMargin, operatingExpenses, netResult };
}
