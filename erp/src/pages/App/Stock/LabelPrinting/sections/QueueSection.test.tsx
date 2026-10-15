// @vitest-environment happy-dom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueueSection } from './QueueSection';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import type { LabelItemConfig } from '../types/LabelGridItem.types';
import type Product from '@/pages/types/product.type';

vi.mock('../components/ProductSearchInput', () => ({ default: () => null }));
vi.mock('../components/LabelQueue', () => ({ default: ({ onSelectProduct }: { onSelectProduct: (index: number, product: Product) => void }) => <button onClick={() => onSelectProduct(0, { id: 'product', name: 'Mesa' } as Product)}>Substituir</button> }));
afterEach(cleanup);

function setup(valid: boolean) {
  const select = vi.fn(async () => valid);
  function Owner() {
    const [items, setItems] = useState<LabelItemConfig[]>([{ name: 'Original', price: '', quantity: 1, isBlank: true }]);
    return <><span>{items.length ? 'Original preservado' : 'Substituído'}</span><QueueSection selectedCategory="precos" printingMode="simple" config={createInitialLabelConfig()} products={[]} selectedProductToAdd={null} setSelectedProductToAdd={vi.fn()} productAddQty={1} setProductAddQty={vi.fn()} handleProductSelect={select} labelItems={items} setLabelItems={setItems} logoItems={[]} setLogoItems={vi.fn()} isDownloading={false} /></>;
  }
  render(<Owner />);
  return select;
}
describe('queue replacement owner', () => {
  it('keeps the original label when product validation fails', async () => {
    const select = setup(false);
    fireEvent.click(screen.getByText('Substituir'));
    await waitFor(() => expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'product' }), 1));
    expect(screen.getByText('Original preservado')).toBeTruthy();
  });
  it('removes the original label only after a valid replacement is accepted', async () => {
    setup(true);
    fireEvent.click(screen.getByText('Substituir'));
    await screen.findByText('Substituído');
  });
});
