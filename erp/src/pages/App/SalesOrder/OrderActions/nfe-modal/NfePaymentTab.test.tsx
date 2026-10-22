// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type Order from '@/pages/types/order.type';
import { NfePaymentTab } from './NfePaymentTab';

afterEach(cleanup);

describe('pagamentos da nota com taxas de maquininha', () => {
  it.each([
    { fee: 4, feeType: 'percentage' },
    { fee: 19.96, feeType: 'fixed' },
  ] as const)('inclui taxa $feeType no pagamento, recebido, saldo e total registrado', ({ fee, feeType }) => {
    const order = {
      shipping: { value: 0, deliveryMethod: 'pickup' },
      payments: [
        { method: 'Cartão de Crédito', status: 'Pago', amount: 499, fee, feeType },
        { method: 'Verificar', status: 'Pendente', amount: 300, fee: 0, feeType: 'fixed' },
      ],
      paymentsSummary: { totalPaymentsFee: 19.96, totalOrderValue: 818.96 },
    } as Order;
    render(<NfePaymentTab order={order} itemsTotal={799} freightTotal={0} discountTotal={0} invoiceTotal={818.96} />);

    expect(screen.getByText('Recebido:')).toHaveTextContent(/R\$\s*518,96/);
    expect(screen.getByText('Saldo pendente:')).toHaveTextContent(/R\$\s*300,00/);
    expect(screen.getAllByText(/R\$\s*518,96/)).toHaveLength(2);
    expect(screen.getByText('Total das condições registradas:').parentElement).toHaveTextContent(/R\$\s*818,96/);
    expect(screen.getByText('Taxas de pagamento').parentElement).toHaveTextContent(/R\$\s*19,96/);
    expect(screen.getByText(/Inclui .*19,96 de taxa/)).toBeInTheDocument();
  });
});
