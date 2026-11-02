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
        supplierId="sup-1"
        isReceiptMode={false}
      />
    );

    // The header button "Adicionar Item"
    const addBtn = screen.getAllByRole('button', { name: /Adicionar Item/i, hidden: true })[0];
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

    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Quantidade de Mesa Dobrável' })[0], {
      target: { value: '2' },
    });

    expect(handleUpdateItem).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        quantity: 2,
        totalCost: 200,
      })
    );
  });

  it('shows the same calculated total for an item and the order in purchase mode', () => {
    const item = {
      productId: 'prod-1', description: 'Mesa', quantity: 2,
      baseCost: 33.33, unitCost: 33.33, totalCost: 66.66,
    };
    render(
      <PurchaseItemsSection
        items={[item]}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onUpdateItem={vi.fn()}
        ipiPercent={3}
        freightPercent={7}
        formatCurrency={(value) => `R$ ${value.toFixed(2)}`}
        supplierId="sup-1"
        isReceiptMode={false}
      />
    );

    expect(screen.getByText(/IPI \/ unidade/)).toBeDefined();
    expect(screen.getByText(/Frete \/ unidade/)).toBeDefined();
    expect(screen.getByText(/Desconto \/ unidade/)).toBeDefined();
    expect(screen.queryByRole('textbox', { name: /Desconto unitário/i })).toBeNull();
    expect(screen.queryByText('Subtotal')).toBeNull();
    expect(screen.queryByText('Outras despesas')).toBeNull();
    expect(screen.getAllByText('R$ 73.32')).toHaveLength(2);
    expect(screen.getByText('R$ 36.66')).toBeDefined();
  });

  it('opens one item at a time and asks for confirmation before removal', () => {
    const onRemove = vi.fn();
    const items = [
      { productId: 'a', description: 'Mesa', quantity: 1, baseCost: 10, unitCost: 10, totalCost: 10 },
      { productId: 'b', description: 'Cadeira', quantity: 1, baseCost: 20, unitCost: 20, totalCost: 20 },
    ];
    render(<PurchaseItemsSection items={items} onAddItem={vi.fn()} onRemoveItem={onRemove}
      onUpdateItem={vi.fn()} ipiPercent={0} freightPercent={0} formatCurrency={(value) => `R$ ${value.toFixed(2)}`}
      supplierId="sup-1" isReceiptMode={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Expandir item Mesa' }));
    expect(screen.getByRole('button', { name: 'Recolher item Mesa' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Expandir item Cadeira' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Mesa' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remover item/i }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Mesa' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remover item/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('shows unit cost, freight and total cost without a discount field in receipt mode', () => {
    render(
      <PurchaseItemsSection
        items={[{ productId: 'prod-1', description: 'Mesa', quantity: 2, baseCost: 100, unitCost: 105, totalCost: 210, discountUnit: 3, freightUnit: 8, otherExpensesUnit: 2 }]}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onUpdateItem={vi.fn()}
        ipiPercent={0}
        freightPercent={0}
        formatCurrency={(value) => `R$ ${value.toFixed(2)}`}
        supplierId="sup-1"
        isReceiptMode
      />
    );

    expect(screen.getAllByText('Custo total')).toHaveLength(2);
    expect(screen.queryAllByText('Subtotal')).toHaveLength(0);
    expect(screen.queryAllByText('Desconto por unidade')).toHaveLength(0);
    expect(screen.getAllByText('Frete por unidade')).toHaveLength(2);
    expect(screen.queryAllByText('R$ 3.00')).toHaveLength(0);
    expect(screen.getAllByText('R$ 8.00')).toHaveLength(2);
    expect(screen.queryAllByText('IPI por unidade')).toHaveLength(0);
    expect(screen.queryAllByText('Outras despesas')).toHaveLength(0);
  });
});
