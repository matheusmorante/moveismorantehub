import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  create: vi.fn(),
  invoices: vi.fn(),
  purchases: vi.fn(),
  invoiceDetails: vi.fn(),
  previous: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('react-native', () => {
  const View = React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      measureInWindow: (callback: any) => callback(320, 40, 40, 40),
    }));
    return <div>{children}</div>;
  });
  return {
    View,
    Text: 'span',
    ScrollView: ({ children }: any) => <div>{children}</div>,
    KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
    ActivityIndicator: 'span',
    Modal: ({ visible, children }: any) => (visible ? <div>{children}</div> : null),
    TouchableOpacity: ({ onPress, children, disabled, accessibilityLabel }: any) => (
      <button onClick={onPress} disabled={disabled} aria-label={accessibilityLabel}>
        {children}
      </button>
    ),
    Pressable: ({ onPress, accessibilityLabel }: any) => (
      <button onClick={onPress} aria-label={accessibilityLabel} />
    ),
    TextInput: ({ value, onChangeText, placeholder }: any) => (
      <input
        value={value ?? ''}
        onChange={(event) => onChangeText(event.target.value)}
        placeholder={placeholder}
      />
    ),
    FlatList: ({ data, renderItem, ListFooterComponent }: any) => (
      <div>
        {data.map((item: any) => (
          <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>
        ))}
        {ListFooterComponent}
      </div>
    ),
    StyleSheet: { create: (value: unknown) => value, absoluteFill: {} },
    Platform: { OS: 'web' },
    Alert: { alert: mocks.alert },
    useWindowDimensions: () => ({ width: 400 }),
  };
});
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'Box',
      'MoreVertical',
      'Plus',
      'ArrowLeft',
      'X',
      'ChevronLeft',
      'ChevronRight',
      'FileText',
      'Pencil',
      'ShoppingCart',
    ].map((name) => [name, () => null]),
  ),
);
vi.mock('../../../mobile/src/features/stock/receipts/hooks/useReceipts', () => ({
  useReceipts: () => ({
    receipts: [],
    loading: false,
    loadingMore: false,
    loadMore: vi.fn(),
    loadError: null,
    reload: mocks.reload,
  }),
}));
vi.mock('../../../mobile/src/features/stock/receipts/screens/ReceiptCheckScreen', () => ({
  ReceiptCheckScreen: () => null,
}));
vi.mock('../../../mobile/src/services/offline/offlineStorageService', () => ({
  generateUUID: () => '11111111-1111-4111-8111-111111111111',
}));
vi.mock('../../../mobile/src/services/offline/connectivityService', () => ({
  connectivityService: { connected: true },
}));
vi.mock('../../../mobile/src/utils/orderUtils', () => ({
  getLocalDateString: () => '2026-10-30',
}));
vi.mock('../../../mobile/src/features/products/services/mobileSupplierService', () => ({
  fetchMobileProductSuppliersWithStatus: async () => ({
    ok: true,
    suppliers: [{ id: 'supplier', full_name: 'Fornecedor', stock_origins: ['normal'] }],
  }),
}));
vi.mock('../../../mobile/src/services/stock/stockReceiptsService', () => ({
  createMobileGoodsReceipt: mocks.create,
  fetchReceiptInvoiceSources: mocks.invoices,
  fetchInvoiceReceiptItems: mocks.previous,
}));
vi.mock('../../../mobile/src/services/stock/invoices/inboundInvoiceMappingsService', () => ({
  fetchInboundInvoiceForMappings: mocks.invoiceDetails,
}));
vi.mock('../../../mobile/src/features/stock/purchases/mobilePurchaseService', () => ({
  fetchMobilePurchases: mocks.purchases,
}));
vi.mock(
  '../../../mobile/src/features/stock/purchases/modals/purchase-form/PurchaseItemsSection',
  () => ({
    PurchaseItemsSection: ({ items, onOpenProductPicker, allowAdd = true, addDisabled }: any) => (
      <div>
        {items.map((item: any) => (
          <p key={item.productId}>{item.description}</p>
        ))}
        {allowAdd && (
          <button disabled={addDisabled} onClick={onOpenProductPicker}>
            Adicionar
          </button>
        )}
      </div>
    ),
  }),
);
vi.mock(
  '../../../mobile/src/features/stock/purchases/modals/purchase-form/PurchaseSupplierPickerModal',
  () => ({
    PurchaseSupplierPickerModal: ({ visible, filteredSuppliers, onSelectSupplier }: any) =>
      visible ? (
        <div>
          {filteredSuppliers.map((supplier: any) => (
            <button key={supplier.id} onClick={() => onSelectSupplier(supplier)}>
              Usar {supplier.name}
            </button>
          ))}
        </div>
      ) : null,
  }),
);
vi.mock(
  '../../../mobile/src/features/stock/inventory/components/InventoryProductSearchModal',
  () => ({
    InventoryProductSearchModal: ({ visible, onSelect, onClose }: any) =>
      visible ? (
        <button
          onClick={() => {
            onSelect({
              id: 'product',
              variation_id: 'variation',
              name: 'Mesa branca',
            });
            onClose();
          }}
        >
          Escolher variação
        </button>
      ) : null,
  }),
);

import { ReceiptsScreen } from '../../../mobile/src/features/stock/receipts/screens/ReceiptsScreen';

const purchase = {
  id: 'purchase',
  purchaseNumber: 12,
  supplierId: 'supplier',
  supplierName: 'Fornecedor',
  date: '2026-10-30',
  status: 'ordered',
  items: [
    {
      productId: 'product',
      variationId: 'variation',
      description: 'Mesa branca',
      quantity: 2,
      baseCost: 100,
      unitCost: 100,
      totalCost: 200,
    },
  ],
  totalValue: 200,
  ipiPercent: 5,
  freightPercent: 0,
  stockProcessed: false,
  attachments: [],
};
const invoice = {
  id: 'invoice',
  numero_nfe: '270892',
  chave_acesso: '43261092051440000196550020002708921266772440',
  data_emissao: '2026-10-30',
  status_recebimento: 'pending',
  supplier_id: 'supplier',
  supplierStockOrigins: ['normal'],
  supplier: { full_name: 'Fornecedor' },
  valor_produtos: 200,
  valor_ipi: 0,
  valor_frete: 0,
  items: [
    {
      matchedProductId: 'product',
      matchedVariationId: 'variation',
      productDescription: 'Mesa branca',
      quantity: 2,
      unitCost: 100,
      totalCost: 200,
    },
  ],
};

function openNew() {
  render(
    <ReceiptsScreen
      isDarkMode={false}
      onBack={vi.fn()}
      renderHeader={(action) => <header>Recebimentos de Mercadorias{action}</header>}
    />,
  );
  fireEvent.click(screen.getByLabelText('Mais opções de recebimentos'));
  fireEvent.click(screen.getByText('Novo'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('criação de recebimento no aplicativo', () => {
  it('abre o menu e os três tipos, e confirma um recebimento manual', async () => {
    mocks.create.mockResolvedValue({ invoiceUpdated: true });
    openNew();
    expect(screen.getByText('Com nota fiscal de entrada')).toBeTruthy();
    expect(screen.getByText('Com pedido de compra')).toBeTruthy();
    fireEvent.click(screen.getByText('Sem nota fiscal'));
    await waitFor(() => expect(screen.getByText('Selecionar fornecedor')).toBeTruthy());
    fireEvent.click(screen.getByText('Selecionar fornecedor'));
    await waitFor(() => expect(screen.getByText('Usar Fornecedor')).toBeTruthy());
    fireEvent.click(screen.getByText('Usar Fornecedor'));
    fireEvent.click(screen.getByText('Adicionar'));
    fireEvent.click(screen.getByText('Escolher variação'));
    await act(async () => fireEvent.click(screen.getByText('Confirmar recebimento')));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 'supplier',
        items: [
          expect.objectContaining({
            productId: 'product',
            variationId: 'variation',
            quantity: 1,
          }),
        ],
      }),
    );
  });

  it('seleciona um pedido e mantém sua origem ao confirmar', async () => {
    mocks.purchases.mockResolvedValue({ data: [purchase], count: 1 });
    mocks.create.mockResolvedValue({ invoiceUpdated: true });
    openNew();
    fireEvent.click(screen.getByText('Com pedido de compra'));
    await waitFor(() => expect(screen.getByText('Pedido #12')).toBeTruthy());
    fireEvent.click(screen.getByText('Pedido #12'));
    await waitFor(() => expect(screen.getByText('Mesa branca')).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByText('Confirmar recebimento')));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: 'purchase',
        items: [expect.objectContaining({ quantity: 2, unitCost: 105 })],
      }),
    );
  });

  it('reconfere a NF-e e envia a identidade da nota ao confirmar', async () => {
    mocks.invoices.mockResolvedValue({
      data: [
        {
          id: 'invoice',
          number: '270892',
          supplierName: 'Fornecedor',
          status: 'pending',
          isSummaryOnly: false,
          hasPendingBindings: false,
          supplierStockOrigins: ['normal'],
        },
      ],
      count: 1,
    });
    mocks.invoiceDetails.mockResolvedValue(invoice);
    mocks.previous.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ invoiceUpdated: true });
    openNew();
    fireEvent.click(screen.getByText('Com nota fiscal de entrada'));
    await waitFor(() => expect(screen.getByText('NF-e #270892')).toBeTruthy());
    fireEvent.click(screen.getByText('NF-e #270892'));
    await waitFor(() => expect(screen.getByText('Mesa branca')).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByText('Confirmar recebimento')));
    expect(mocks.invoiceDetails).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'invoice',
        invoiceComplete: true,
        fiscalKey: invoice.chave_acesso,
      }),
    );
  });
});
