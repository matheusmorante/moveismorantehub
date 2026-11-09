import { expect } from '@playwright/test';
import type { Client } from 'pg';

export async function assertOrderRowsNormalized(
    pgClient: Client,
    orderId: string,
    orderTotal: unknown,
    deliveryValue: number,
): Promise<void> {
    // Asserções no Banco - order_items normalizados
    const itemRows = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [orderId])).rows;
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0].description).toBe('Mesa de Jantar 6 Lugares Madeira Nobre');
    expect(Number(itemRows[0].quantity)).toBe(1);
    expect(Number(itemRows[0].unit_price)).toBe(2500.00);
    expect(Number(itemRows[0].unit_discount)).toBe(200.00);

    expect(itemRows[1].description).toBe('Cadeira Estofada Bege Linho');
    expect(Number(itemRows[1].quantity)).toBe(6);
    expect(Number(itemRows[1].unit_price)).toBe(350.00);

    // Asserções no Banco - order_payments normalizados
    const payRows = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [orderId])).rows;
    expect(payRows).toHaveLength(2);
    expect(payRows[0].payment_method).toBe('Pix');
    expect(Number(payRows[0].amount)).toBe(1550.00);
    expect(payRows[1].payment_method).toBe('Cartão de Crédito 3x');
    expect(Number(payRows[1].amount)).toBe(3000.00);

    // Batimento Matemático
    const sumItems = itemRows.reduce((acc, r) => acc + (Number(r.quantity) * Number(r.unit_price)) - (Number(r.unit_discount) || 0), 0);
    const sumPayments = payRows.reduce((acc, r) => acc + Number(r.amount), 0);
    expect(sumItems + deliveryValue).toBe(Number(orderTotal));
    expect(sumPayments).toBe(Number(orderTotal));
}
