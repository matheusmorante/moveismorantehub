// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PurchaseItemsSection } from '../../PurchaseItemsSection';

afterEach(() => {
  cleanup();
});

vi.mock('@/components/ProductAutocomplete', () => ({
  default: ({ onSelect, placeholder, value }: any) => (
    <div data-testid="product-autocomplete">
      <input
        aria-label="Buscar produto"
        placeholder={placeholder}
        value={value}
        onChange={() => {}}
      />
      <button
        type="button"
        onClick={() =>
          onSelect(
            { id: 'prod-1', name: 'Mesa Dobrável', costPrice: 150, mainSupplierId: 'sup-1' },
            undefined
          )
        }
      >
        Selecionar Mesa
      </button>
    </div>
  ),
}));

vi.mock('@/components/CurrencyInput', () => ({
  default: ({ value, onChange }: any) => (
    <input
      aria-label="Custo unitário"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

describe('PurchaseItemsSection inline item inputs', () => {
  it('adds a blank row with inline product input when Adicionar Item is clicked', () => {
    const handleAddItem = vi.fn();
    const handleRemoveItem = vi.fn();
    const handleUpdateItem = vi.fn();

    render(
      <PurchaseItemsSection
        items={[]}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
        ipiPercent={0}
        freightPercent={0}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isReceiptMode={false}
      />
    );

    // The header button "Adicionar Item"
    const addBtn = screen.getByRole('button', { name: /Adicionar Item/i });
    fireEvent.click(addBtn);

    expect(handleAddItem).toHaveBeenCalledTimes(1);
    expect(handleAddItem).toHaveBeenCalledWith({
      productId: '',
      description: '',
      quantity: 1,
      baseCost: 0,
      unitCost: 0,
      totalCost: 0,
    });
  });

  it('renders ProductAutocomplete and quantity/cost inputs directly in the added row', () => {
    const handleAddItem = vi.fn();
    const handleRemoveItem = vi.fn();
    const handleUpdateItem = vi.fn();
    const handleSupplierAutoSelect = vi.fn();

    const items = [
      {
        productId: '',
        description: '',
        quantity: 1,
        baseCost: 0,
        unitCost: 0,
        totalCost: 0,
      },
    ];

    render(
      <PurchaseItemsSection
        items={items}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
        ipiPercent={10}
        freightPercent={5}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        onSupplierAutoSelect={handleSupplierAutoSelect}
        isReceiptMode={false}
      />
    );

    // Verify autocomplete is present inside the table row
    expect(screen.getAllByTestId('product-autocomplete').length).toBeGreaterThan(0);

    // Select product in row
    const selectProductBtn = screen.getAllByRole('button', { name: /Selecionar Mesa/i })[0];
    fireEvent.click(selectProductBtn);

    // Expect onUpdateItem to be called with updated product info and calculated cost
    expect(handleUpdateItem).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        productId: 'prod-1',
        description: 'Mesa Dobrável',
        baseCost: 150,
      })
    );
    expect(handleSupplierAutoSelect).toHaveBeenCalledWith('sup-1');
  });

  it('allows editing quantity and cost directly in the item row', () => {
    const handleAddItem = vi.fn();
    const handleRemoveItem = vi.fn();
    const handleUpdateItem = vi.fn();

    const items = [
      {
        productId: 'prod-1',
        description: 'Mesa Dobrável',
        quantity: 1,
        baseCost: 100,
        unitCost: 100,
        totalCost: 100,
      },
    ];

    render(
      <PurchaseItemsSection
        items={items}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
        ipiPercent={0}
        freightPercent={0}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isReceiptMode={false}
      />
    );

    // Increase quantity via "+" button
    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    expect(handleUpdateItem).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        quantity: 2,
        totalCost: 200,
      })
    );
  });
});
