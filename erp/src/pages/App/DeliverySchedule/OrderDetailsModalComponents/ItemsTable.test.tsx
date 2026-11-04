// @vitest-environment happy-dom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemsTable } from './ItemsTable';

describe('order item details on ERP', () => {
  it('keeps type and handling compact while preserving the complete instruction and prices', () => {
    const fullHandling = 'De mostruário montado > Entregue montado';
    const { container } = render(
      <ItemsTable
        items={[
          {
            description: 'Mesa 6 CD com vidro 1,80x0,90',
            quantity: 2,
            unitPrice: 500,
            unitDiscount: 10,
            discountType: 'fixed',
            stockOrigin: 'convencional',
            handlingType: fullHandling,
          },
        ]}
      />
    );

    const item = container.querySelector('article');
    const details = item?.querySelector('details');
    expect(item?.textContent).toContain('Normal');
    expect(item?.textContent).toContain('Entregar montado');
    expect(item?.textContent).toContain('Mesa 6 CD com vidro 1,80x0,90');
    expect(details?.querySelector('p')?.textContent).toBe(fullHandling);
    expect(item?.querySelector('[class*="bg-blue-"]')).toBeNull();
    expect(item?.querySelector('[class*="bg-red-"]')).toBeNull();
    expect(item?.querySelector('[class*="bg-amber-"]')).toBeNull();
    expect(item?.className).not.toContain('min-w-[620px]');
    for (const value of [500, 490, 1000, 980]) {
      expect(item?.textContent).toContain(value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    }
  });

  it('does not render a handling icon or disclosure when there is no instruction', () => {
    const { container } = render(
      <ItemsTable items={[{ description: 'Cadeira', quantity: 1, unitPrice: 100 }]} />
    );

    const item = container.querySelector('article');
    expect(item?.querySelector('.lucide-package-check')).toBeNull();
    expect(item?.querySelector('details')).toBeNull();
  });
});
