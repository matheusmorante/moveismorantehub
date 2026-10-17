import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  getNextSequentialProductCode: vi.fn(),
  fetchMobileProductFiscalDefaults: vi.fn(),
  createStockUnavailability: vi.fn(),
  supabaseFromCalls: [] as any[],
}));

vi.mock('react-native', () => ({
  Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible !== false ? <div>{children}</div> : null,
  View: 'div',
  Text: 'span',
  ActivityIndicator: 'span',
  KeyboardAvoidingView: 'div',
  ScrollView: 'div',
  StatusBar: () => null,
  TouchableOpacity: ({
    onPress,
    children,
    disabled,
  }: {
    onPress?: () => void;
    children?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  TextInput: ({
    value,
    onChangeText,
    placeholder,
  }: {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
  }) => (
    <input
      value={value ?? ''}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
    />
  ),
  StyleSheet: { create: (value: unknown) => value },
  Platform: { OS: 'web' },
  Alert: { alert: mocks.alert },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'X', 'Calendar', 'DollarSign', 'Tag', 'User', 'CreditCard', 'Layers',
      'UploadCloud', 'Search', 'ScanBarcode', 'CloudDownload', 'ExternalLink',
      'FileText', 'Package', 'Grid2X2', 'Images', 'Minus', 'Plus', 'Trash2',
      'Hammer', 'Check', 'ChevronLeft', 'ChevronRight', 'Grid3X3', 'Info',
      'Lock', 'Receipt', 'Save',
    ].map((name) => [name, () => null])
  )
);

vi.mock('../../../mobile/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    userProfile: { role: 'admin' },
    canUseProductPermission: () => true,
  }),
}));

vi.mock('../../../mobile/src/features/products/services/mobileProductCodeService', () => ({
  getNextSequentialProductCode: mocks.getNextSequentialProductCode,
}));

vi.mock('../../../mobile/src/features/products/services/mobileProductFiscalService', () => ({
  fetchMobileProductFiscalDefaults: mocks.fetchMobileProductFiscalDefaults,
}));

vi.mock('../../../mobile/src/services/stock/stockUnavailabilitiesService', () => ({
  createStockUnavailability: mocks.createStockUnavailability,
}));

vi.mock('../../../mobile/src/services/stockService', () => ({
  searchProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const call: {
        table: string;
        action: string;
        filters: Record<string, unknown>;
        fields?: string;
      } = {
        table,
        action: 'select',
        filters: {},
      };
      const builder = {
        select: (fields?: string) => {
          call.fields = fields;
          return builder;
        },
        eq: (k: string, v: unknown) => {
          call.filters[k] = v;
          return builder;
        },
        in: (k: string, v: unknown) => {
          call.filters[k] = v;
          return builder;
        },
        or: (condition: string) => {
          call.filters.or = condition;
          return builder;
        },
        single: () => builder,
        then: <TResult1 = unknown, TResult2 = never>(
          resolve?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
          reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) => {
          mocks.supabaseFromCalls.push(call);
          if (table === 'products') {
            return Promise.resolve({
              data: { supplier_id: 'sup-1', supplier_ids: ['sup-1'] },
              error: null,
            }).then(resolve, reject);
          }
          if (table === 'people') {
            return Promise.resolve({
              data: [{ id: 'sup-1', full_name: 'Fornecedor A' }],
              error: null,
            }).then(resolve, reject);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormBasicTab', () => ({
  ProductFormBasicTab: () => <div data-testid="basic-tab">Aba Basica</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormPricesTab', () => ({
  ProductFormPricesTab: () => <div data-testid="prices-tab">Aba Precos</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormPhotosTab', () => ({
  ProductFormPhotosTab: () => <div data-testid="photos-tab">Aba Fotos</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormTechnicalTab', () => ({
  ProductFormTechnicalTab: () => <div data-testid="technical-tab">Aba Tecnica</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormDescriptionTab', () => ({
  ProductFormDescriptionTab: () => <div data-testid="description-tab">Aba Descricao</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormVariationsTab', () => ({
  ProductFormVariationsTab: () => <div data-testid="variations-tab">Aba Variacoes</div>,
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormFiscalTab', () => ({
  ProductFormFiscalTab: () => <div data-testid="fiscal-tab">Aba Fiscal</div>,
}));

import { SupplierFormModal } from '../../../mobile/src/features/stock/suppliers/SupplierFormModal';
import { useMobileUnavailabilityForm } from '../../../mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm';
import { ProductFormScreen } from '../../../mobile/src/features/products/screens/ProductFormScreen';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabaseFromCalls = [];
  mocks.getNextSequentialProductCode.mockResolvedValue('PRD-0042');
  mocks.fetchMobileProductFiscalDefaults.mockResolvedValue({
    ncm: '9403.60.00',
    origin: '0',
    cest: '',
  });
  mocks.createStockUnavailability.mockResolvedValue({ id: 'unavail-1' });
});

afterEach(() => {
  cleanup();
});

describe('Mobile Product and Stock Form Owners', () => {
  describe('SupplierFormModal', () => {
    it('blocks save when name is empty and shows alert', async () => {
      const onSave = vi.fn();
      render(
        <SupplierFormModal
          visible={true}
          isDarkMode={false}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      fireEvent.click(screen.getByText('Criar Fornecedor'));

      await waitFor(() => {
        expect(mocks.alert).toHaveBeenCalled();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('validates with personForm.validateAndRun and saves parsed supplier data', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(
        <SupplierFormModal
          visible={true}
          isDarkMode={false}
          onClose={onClose}
          onSave={onSave}
        />
      );

      const nameInput = screen.getByPlaceholderText('Nome do Fornecedor');
      fireEvent.change(nameInput, { target: { value: 'Fornecedor Madeira Sul' } });

      fireEvent.click(screen.getByText('Criar Fornecedor'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Fornecedor Madeira Sul',
            personType: 'PF',
            type: 'suppliers',
            active: true,
          })
        );
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('useMobileUnavailabilityForm', () => {
    it('blocks submission when stock is insufficient or quantity is invalid', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useMobileUnavailabilityForm({
          isOpen: true,
          onClose,
          onSuccess,
        })
      );

      // Attempt submit without product selected
      await act(async () => {
        await result.current.actions.handleSubmit();
      });
      expect(mocks.createStockUnavailability).not.toHaveBeenCalled();

      // Set product with available stock = 2
      act(() => {
        result.current.actions.setSelectedProductVariation({
          id: 'prod-1',
          variation_id: 'var-1',
          name: 'Produto Teste',
          sku: 'SKU-1',
          stock: 2,
        });
      });

      // Set quantity greater than stock
      act(() => {
        result.current.actions.setQuantity('5');
      });

      await act(async () => {
        await result.current.actions.handleSubmit();
      });

      expect(mocks.alert).toHaveBeenCalledWith(
        'Atenção',
        expect.stringContaining('maior que o estoque atual')
      );
      expect(mocks.createStockUnavailability).not.toHaveBeenCalled();
    });

    it('validates and creates stock unavailability on valid input', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useMobileUnavailabilityForm({
          isOpen: true,
          onClose,
          onSuccess,
        })
      );

      act(() => {
        result.current.actions.setSelectedProductVariation({
          id: 'prod-1',
          variation_id: 'var-1',
          name: 'Produto Teste',
          sku: 'SKU-1',
          stock: 10,
        });
        result.current.actions.setTreatment('Descarte/perda');
        result.current.actions.setQuantity('2');
        result.current.actions.setObservation('Avaria no transporte');
      });

      await act(async () => {
        await result.current.actions.handleSubmit();
      });

      expect(mocks.createStockUnavailability).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
          variationId: 'var-1',
          quantity: 2,
          treatment: 'Descarte/perda',
          observation: 'Avaria no transporte',
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('ProductFormScreen', () => {
    it('submits valid draft product through draftForm.validateAndRun', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <ProductFormScreen
          visible={true}
          dark={false}
          onClose={onClose}
          onSave={onSave}
          initialData={{
            name: 'Mesa de Jantar',
            unitPrice: '1200,00',
            stock: '5',
          }}
        />
      );

      // Click "Salvar rascunho"
      fireEvent.click(screen.getByText('Salvar rascunho'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Mesa de Jantar',
            isDraft: true,
            code: 'PRD-0042',
          })
        );
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
