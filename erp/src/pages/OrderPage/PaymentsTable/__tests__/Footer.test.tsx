// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

describe('OrderPage PaymentsTable Footer', () => {
  it('renderiza Saldo Juros e Total Pedido sem exibir o campo preto de VALOR TOTAL PAGAR', () => {
    const summary = {
      totalPaymentsFee: 15.5,
      totalOrderValue: 1250.0,
      totalAmountPaid: 1265.5,
      amountRemaining: 0,
    };

    render(
      <table>
        <Footer summary={summary} />
      </table>
    );

    // Deve exibir Saldo Juros e Total Pedido
    expect(screen.getByText('Saldo Juros')).toBeDefined();
    expect(screen.getByText('Total Pedido')).toBeDefined();

    // NÃO deve conter o campo preto / texto de VALOR TOTAL PAGAR
    expect(screen.queryByText(/VALOR TOTAL PAGAR/i)).toBeNull();
    expect(screen.queryByText(/total a pagar/i)).toBeNull();
  });
});
