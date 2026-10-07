type FeeType = 'percentage' | 'fixed';

export type Payment = {
  method: string;
  fiscalCard?: {
    integrationType: '1' | '2';
    acquirerCnpj?: string;
    brand?: string;
    authorization?: string;
  };
  amount: number;
  fee: number;
  feeType: FeeType;
  status: string;
  installments?: number;
  dueDate?: string;
  paymentDate?: string;
};

export type PaymentsSummary = {
  totalPaymentsFee: number;
  totalOrderValue: number;
  totalAmountPaid: number;
  /** Signed gap between the order total and all payment rows; negative means excess. */
  paymentAllocationDifference?: number;
  /** Unpaid balance; kept separate from payment allocation for financial views. */
  amountRemaining: number;
  change?: number;
  // Legacy support
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
};
