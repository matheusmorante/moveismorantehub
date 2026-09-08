export type ReceiptPeriod = 'this_month' | 'last_month' | 'this_year' | 'custom' | 'all';

export interface ReceiptPeriodOption {
    label: string;
    value: ReceiptPeriod;
}

export const RECEIPT_PERIOD_OPTIONS: ReceiptPeriodOption[] = [
    { label: 'Este Mês', value: 'this_month' },
    { label: 'Mês Passado', value: 'last_month' },
    { label: 'Este Ano', value: 'this_year' },
    { label: 'Personalizado', value: 'custom' },
    { label: 'Todos', value: 'all' },
];
