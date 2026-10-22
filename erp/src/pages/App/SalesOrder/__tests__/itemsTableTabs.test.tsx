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

describe('ItemsTable - Abas Produtos e Serviços e Densidade Compacta', () => {
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

  it('deve exibir os contadores corretos nas abas Produtos e Serviços', () => {
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

    // Aba Produtos: 2 itens de produto
    const productTab = screen.getByRole('button', { name: /Produtos/i });
    expect(productTab).toBeTruthy();
    expect(productTab.textContent).toContain('2');

    // Aba Serviços: 1 item de serviço
    const serviceTab = screen.getByRole('button', { name: /Serviços/i });
    expect(serviceTab).toBeTruthy();
    expect(serviceTab.textContent).toContain('1');
  });

  it('deve filtrar os itens conforme a aba ativa', () => {
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

    // Inicialmente na aba Produtos: deve listar os produtos
    expect(screen.getByText('Mesa de Jantar Madeira')).toBeTruthy();
    expect(screen.getByText('Cadeira Estofada')).toBeTruthy();
    // Não deve listar o serviço
    expect(screen.queryByText('Instalação e Montagem Especial')).toBeNull();

    // Clica na aba Serviços
    const serviceTab = screen.getByRole('button', { name: /Serviços/i });
    fireEvent.click(serviceTab);

    // Agora na aba Serviços: deve listar o serviço e ocultar os produtos
    expect(screen.getByText('Instalação e Montagem Especial')).toBeTruthy();
    expect(screen.queryByText('Mesa de Jantar Madeira')).toBeNull();
    expect(screen.queryByText('Cadeira Estofada')).toBeNull();
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

  it('o botão contextual de adicionar deve mudar conforme a aba selecionada e ser único na linha das abas', () => {
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

    // Na aba Produtos: deve existir exatamente 1 único botão de Adicionar produto
    const addProductButtons = screen.getAllByRole('button', { name: /Adicionar produto/i });
    expect(addProductButtons.length).toBe(1);

    // Alterna para aba Serviços
    const serviceTab = screen.getByRole('button', { name: /Serviços/i });
    fireEvent.click(serviceTab);

    // Agora deve ser Adicionar serviço: deve existir exatamente 1 único botão
    const addServiceButtons = screen.getAllByRole('button', { name: /Adicionar serviço/i });
    expect(addServiceButtons.length).toBe(1);
    expect(screen.queryByRole('button', { name: /Adicionar produto/i })).toBeNull();
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
