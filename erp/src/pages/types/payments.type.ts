type FeeType = 'percentage' | 'fixed';

export type Payment = {
  method: string;
  fiscalCard?: { integrationType: '1' | '2'; acquirerCnpj?: string; brand?: string; authorization?: string };
  amount: number;
  fee: number;
  feeType: FeeType;
  status: string;
};

export type PaymentsSummary = {
  totalPaymentsFee: number;
  totalOrderValue: number;
  totalAmountPaid: number;
  amountRemaining: number;
  change?: number;
  // Legacy support
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
};
