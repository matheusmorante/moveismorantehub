// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
        order: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}));

vi.mock('@/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 1000, height: 800 }), // Modo card (< 1280px)
}));

vi.mock('@/pages/utils/settingsService', () => {
  const settings = {
    deliveryHandlingOptions: [{ label: 'Entrega Padrão' }, { label: 'Montagem no Local' }],
    pickupHandlingOptions: [{ label: 'Retirada na Loja' }],
  };
  return {
    getSettings: () => settings,
    useSettings: () => settings,
  };
});

import ItemsTable from '../ItemsTable';
import BodyRow from '../ItemsTable/BodyRow';
import { Item, ItemsSummary } from '@/pages/types/items.type';
import { calcItemsSummary } from '@/pages/utils/calculations';

describe('ItemsTable - Lista unificada de produtos e serviços', () => {
  afterEach(() => {
    cleanup();
  });

  const mockSummary: ItemsSummary = {
    totalQuantity: 3,
    itemsSubtotal: 850,
    totalFixedDiscount: 50,
    itemsTotalValue: 800,
    totalItemsCost: 400,
  };

  const initialItems: Item[] = [
    {
      description: 'Mesa de Jantar Madeira',
      quantity: 1,
      unitPrice: 500,
      unitDiscount: 50,
      discountType: 'fixed',
      handlingType: 'Entrega Padrão',
      itemType: 'product',
    },
    {
      description: 'Cadeira Estofada',
      quantity: 2,
      unitPrice: 150,
      unitDiscount: 0,
      discountType: 'fixed',
      handlingType: 'Entrega Padrão',
      itemType: 'product',
    },
    {
      description: 'Instalação e Montagem Especial',
      quantity: 1,
      unitPrice: 100,
      unitDiscount: 0,
      discountType: 'fixed',
      handlingType: '',
      itemType: 'service',
    },
  ];

  const StatefulEmptyItemsTable: React.FC = () => {
    const [items, setItems] = React.useState<Item[]>([]);
    return (
      <ItemsTable
        items={items}
        setItems={setItems}
        summary={mockSummary}
        deliveryMethod="delivery"
        errors={{}}
        onSelectProduct={vi.fn()}
      />
    );
  };

  it('exibe contadores de itens, produtos e serviços sem abas', () => {
    render(
      <ItemsTable
        items={initialItems}
        setItems={vi.fn()}
        summary={mockSummary}
        deliveryMethod="delivery"
        errors={{}}
        onSelectProduct={vi.fn()}
      />
    );

    expect(screen.getByText('3 itens')).toBeTruthy();
    expect(screen.getByText('2 produtos')).toBeTruthy();
    expect(screen.getByText('1 serviço')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('mantém produtos e serviços visíveis na ordem adicionada', () => {
    const { container } = render(
      <ItemsTable
        items={initialItems}
        setItems={vi.fn()}
        summary={mockSummary}
        deliveryMethod="delivery"
        errors={{}}
        onSelectProduct={vi.fn()}
      />
    );

    const descriptions = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[aria-label="Descrição do produto"], input[aria-label="Descrição do serviço"]'
      )
    ).map((input) => input.value);

    expect(descriptions).toEqual([
      'Mesa de Jantar Madeira',
      'Cadeira Estofada',
      'Instalação e Montagem Especial',
    ]);
  });

  it('aceita descrição avulsa e permite vincular o serviço a vários produtos', () => {
    const service = initialItems[2];
    const describedProduct = { ...initialItems[0], orderItemId: 'product-described' };
    const secondProduct = { ...initialItems[1], orderItemId: 'product-second' };
    const blankDescriptionProduct = {
      ...initialItems[1],
      description: '   ',
      orderItemId: 'product-blank-description',
    };
    const onChange = vi.fn();
    const onBatchChange = vi.fn();

    const { rerender } = render(
      <table>
        <tbody>
          <BodyRow
            item={service}
            productItems={[describedProduct, secondProduct, blankDescriptionProduct]}
            idx={2}
            onChange={onChange}
            onBatchChange={onBatchChange}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="delivery"
            errors={{}}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );

    const description = screen.getByRole('textbox', { name: 'Descrição do serviço' });
    fireEvent.change(description, { target: { value: 'Instalação avulsa' } });
    expect(onChange).toHaveBeenCalledWith(2, 'description', 'Instalação avulsa');
    expect(screen.queryByRole('combobox', { name: 'Vincular produto' })).toBeNull();

    const firstLink = screen.getByRole('checkbox', { name: /Mesa de Jantar Madeira/ });
    const secondLink = screen.getByRole('checkbox', { name: /Cadeira Estofada/ });
    expect(screen.queryByRole('checkbox', { name: /produto-blank-description/i })).toBeNull();

    fireEvent.click(firstLink);
    expect(onBatchChange).toHaveBeenLastCalledWith(2, {
      linkedProductOrderItemIds: ['product-described'],
      linkedProductOrderItemId: undefined,
    });

    rerender(
      <table>
        <tbody>
          <BodyRow
            item={{ ...service, linkedProductOrderItemIds: ['product-described'] }}
            productItems={[describedProduct, secondProduct, blankDescriptionProduct]}
            idx={2}
            onChange={onChange}
            onBatchChange={onBatchChange}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="delivery"
            errors={{}}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira Estofada/ }));
    expect(onBatchChange).toHaveBeenLastCalledWith(2, {
      linkedProductOrderItemIds: ['product-described', 'product-second'],
      linkedProductOrderItemId: undefined,
    });
  });

  it('permite adicionar produto ou serviço pelo botão Adicionar item', () => {
    const setItemsMock = vi.fn();
    render(
      <ItemsTable
        items={initialItems}
        setItems={setItemsMock}
        summary={mockSummary}
        deliveryMethod="delivery"
        errors={{}}
        onSelectProduct={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Adicionar item/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Serviço' }));
    fireEvent.click(screen.getByRole('button', { name: /Adicionar item/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Produto' }));

    const additions = setItemsMock.mock.calls.map(([update]) => {
      const nextItems = (update as (previous: Item[]) => Item[])(initialItems);
      return nextItems[nextItems.length - 1]?.itemType;
    });
    expect(additions).toEqual(['service', 'product']);
  });

  it('expande um serviço ao sair da descrição preenchida e não reabre após recolher', () => {
    render(<StatefulEmptyItemsTable />);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar item/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Serviço' }));

    let description = screen.getByRole('textbox', { name: 'Descrição do serviço' });
    expect(screen.getByRole('button', { name: /Aguarde a descrição para expandir/i })).toHaveProperty('disabled', true);

    fireEvent.change(description, { target: { value: 'Montagem do móvel' } });
    expect(screen.getByRole('button', { name: 'Expandir item 1' })).toHaveProperty('disabled', false);
    fireEvent.blur(description);
    expect(screen.getByTitle('Recolher item')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Recolher item'));
    description = screen.getByRole('textbox', { name: 'Descrição do serviço' });
    fireEvent.change(description, { target: { value: 'Montagem do móvel no local' } });
    fireEvent.blur(description);

    expect(screen.queryByTitle('Recolher item')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expandir item 1' })).toHaveProperty('disabled', false);
  });

  it('expande um produto pela descrição digitada sem exigir seleção do catálogo', () => {
    render(<StatefulEmptyItemsTable />);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar item/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Produto' }));

    let description = screen.getByRole('textbox', { name: 'Descrição do produto' });
    expect(screen.getByRole('button', { name: /Aguarde a descrição para expandir/i })).toHaveProperty('disabled', true);

    fireEvent.change(description, { target: { value: 'Produto avulso' } });
    expect(screen.getByRole('button', { name: 'Expandir item 1' })).toHaveProperty('disabled', false);
    fireEvent.blur(description);

    expect(screen.getByTitle('Recolher item')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Recolher item'));
    description = screen.getByRole('textbox', { name: 'Descrição do produto' });
    fireEvent.change(description, { target: { value: 'Produto avulso atualizado' } });
    fireEvent.blur(description);

    expect(screen.queryByTitle('Recolher item')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expandir item 1' })).toHaveProperty('disabled', false);
  });

  it('não deve separar os cálculos financeiros: calcItemsSummary soma produtos e serviços juntos', () => {
    const calculated = calcItemsSummary(initialItems);
    // Total Qtd: 1 + 2 + 1 = 4
    expect(calculated.totalQuantity).toBe(4);
    // Subtotal: (500 - 50) + (150 * 2) + (100 * 1) + 50 = 450 + 300 + 100 + 50 = 900
    expect(calculated.itemsTotalValue).toBe(850);
    expect(calculated.totalFixedDiscount).toBe(50);
    expect(calculated.itemsSubtotal).toBe(900);
  });
});
