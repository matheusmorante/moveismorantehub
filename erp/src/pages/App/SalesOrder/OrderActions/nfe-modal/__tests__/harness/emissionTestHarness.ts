import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import type Order from '@/pages/types/order.type';
import type { OrderItem } from '@/pages/types/order.type';

export function createSyntheticOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'synthetic-order',
    fiscalContext: { finalConsumer: false },
    shipping: { deliveryMethod: 'pickup' },
    customerData: {
      cpfCnpj: '12345678909',
      ieIndicator: '1',
      ie: '1234567890',
      fullName: 'Cliente de Teste',
    },
    items: [
      createSyntheticItem({
        quantity: 1,
        description: 'ITEM A',
        fiscalSnapshotVersion: 1,
        fiscal: {
          ncm: '94036000',
          cfop: '5102',
          origem: '2',
          commercialUnit: 'UN',
          taxableUnit: 'UN',
        },
      }),
      createSyntheticItem({
        quantity: 1,
        description: 'ITEM B',
        fiscalSnapshotVersion: 1,
        fiscal: {
          cst: '500',
          ncm: '94036000',
          origem: '0',
          commercialUnit: 'UN',
          taxableUnit: 'UN',
        },
      }),
    ],
    ...overrides,
  } as Order;
}

export function createSyntheticItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: 'synthetic-product',
    name: 'Item Sintético',
    quantity: 1,
    price: 100,
    total: 100,
    ...overrides,
  } as OrderItem;
}

export async function prepareNfeEmission(): Promise<void> {
  await waitFor(() => {
    const dialog = screen.getByRole('dialog', { name: 'Emitir nota fiscal de saída' });
    expect(dialog.getAttribute('aria-busy')).toBe('false');
    const emitButton = screen.getByTestId('nfe-emit-button') as HTMLButtonElement;
    expect(emitButton.disabled).toBe(false);
  });
}

export async function requestXmlPreview(): Promise<void> {
  await prepareNfeEmission();
  const button = screen.getByTestId('nfe-emit-button') as HTMLButtonElement;
  await act(async () => {
    fireEvent.click(button);
  });
}
