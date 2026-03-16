type FeeType = 'percentage' | 'fixed';

export type Payment = {
    method: string;
    amount: number;
    fee: number;
    feeType: FeeType;
    status: string;
}

export type PaymentsSummary = {
    totalPaymentsFee: number;
    totalOrderValue: number;
    totalAmountPaid: number;
    amountRemaining: number;
    // Legacy support
    totalValue?: number;
    totalPaid?: number;
    totalPending?: number;
}
