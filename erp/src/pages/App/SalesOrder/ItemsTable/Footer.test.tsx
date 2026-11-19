// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Footer from './Footer';
import type { Item, ItemsSummary } from '../../../types/items.type';

const summary: ItemsSummary = {
  totalQuantity: 4,
  itemsSubtotal: 300,
  totalFixedDiscount: 0,
  itemsTotalValue: 300,
  totalItemsCost: 100,
};

const items: Item[] = [
  {
    description: 'Produto',
    quantity: 1,
    unitPrice: 100,
    unitDiscount: 0,
    discountType: 'fixed',
    handlingType: '',
    itemType: 'product',
  },
  {
    description: 'Montagem',
    quantity: 3,
    unitPrice: 200,
    unitDiscount: 0,
    discountType: 'fixed',
    handlingType: '',
    itemType: 'service',
  },
];

describe('ItemsTable Footer', () => {
  afterEach(cleanup);

  it.each([true, false])('renderiza o resumo de serviços no layout móvel=%s', (isMobile) => {
    render(
      isMobile ? (
        <Footer summary={summary} items={items} isMobile physicalProductQuantity={1} />
      ) : (
        <table>
          <Footer summary={summary} items={items} physicalProductQuantity={1} />
        </table>
      )
    );

    expect(screen.getByText('Serviços')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
