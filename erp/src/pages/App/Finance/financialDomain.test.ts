import { describe, expect, it } from 'vitest';
import { buildPayableInstallments, financialMonthDate, financialToday, payableExpenseFormSchema } from '../../../../../shared-utils/financialFormSchemas';

const command = { payable: { description: ' Parcela ', amount: 10, due_date: '2026-01-31', status: 'pending' as const, category_id: 'category', supplier_name: '', notes: '' }, expenseType: 'installments' as const, installmentsCount: 3, recurringFrequency: 'monthly' as const, isEditing: false };
describe('financial civil dates and installment totals', () => {
  it('clamps each due date from the original day, including leap years', () => {
    expect(financialMonthDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(financialMonthDate('2026-01-31', 2)).toBe('2026-03-31');
    expect(financialMonthDate('2024-02-29', 12)).toBe('2025-02-28');
    expect(financialMonthDate('2026-12-31', 1)).toBe('2027-01-31');
  });
  it('splits whole cents without changing the total or creating invalid rows', () => {
    const rows = buildPayableInstallments(command);
    expect(rows.map((row) => row.amount)).toEqual([3.34, 3.33, 3.33]);
    expect(rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0)).toBe(1000);
    expect(rows.map((row) => row.due_date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(rows[0].description).toBe('Parcela (Parc. 1/3)');
  });
  it('rejects sub-cent values and a split that would create a zero installment', () => {
    expect(payableExpenseFormSchema.safeParse({ ...command, payable: { ...command.payable, amount: 0.02 } }).success).toBe(false);
    expect(payableExpenseFormSchema.safeParse({ ...command, payable: { ...command.payable, amount: 1.001 } }).success).toBe(false);
  });
  it('uses the local civil date near midnight', () => {
    const now = new Date(2026, 9, 15, 23, 59);
    expect(financialToday(now)).toBe('2026-10-15');
  });
});
