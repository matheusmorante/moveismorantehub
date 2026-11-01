import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarDays, X } from 'lucide-react-native';
import { mobileReceiptFormSchema } from '../../../../../../shared-utils/receiptFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { generateUUID } from '../../../../services/offline/offlineStorageService';
import { getLocalDateString } from '../../../../utils/orderUtils';
import { fetchMobileProductSuppliersWithStatus } from '../../../products/services/mobileSupplierService';
import { InventoryProductSearchModal } from '../../inventory/components/InventoryProductSearchModal';
import type { SearchableProduct } from '../../inventory/components/InventoryProductSearchModal';
import { PurchaseItemsSection } from '../../purchases/modals/purchase-form/PurchaseItemsSection';
import { PurchaseSupplierPickerModal } from '../../purchases/modals/purchase-form/PurchaseSupplierPickerModal';
import { TransactionDatePickerModal } from '../../../finance/components/transaction-date/TransactionDatePickerModal';
import type { MobilePurchase } from '../../purchases/mobilePurchaseService';
import type { Invoice } from '../../types/stock.types';
import {
  createMobileGoodsReceipt,
  fetchInvoiceReceiptItems,
} from '../../../../services/stock/stockReceiptsService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { fetchInboundInvoiceForMappings } from '../../../../services/stock/invoices/inboundInvoiceMappingsService';
import { ReceiptSourceOptions, ReceiptSourcePicker } from './ReceiptSourcePicker';
import {
  inboundReceiptOrigin,
  purchaseReceiptOrigin,
  receiptItemWithCosts,
  remainingInvoiceReceiptOrigin,
  type MobileReceiptItem,
  type ReceiptOrigin,
} from '../utils/receiptSource';

interface SupplierOption {
  id: string;
  name: string;
  full_name?: string;
  nickname?: string;
  social_name?: string;
  stock_origins?: string[];
}

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const NewGoodsReceiptModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  onClose,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#ffffff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierLoadError, setSupplierLoadError] = useState('');
  const [stage, setStage] = useState<'source' | 'invoice' | 'purchase' | 'form'>('source');
  const [origin, setOrigin] = useState<ReceiptOrigin>({
    kind: 'manual',
    items: [],
  });
  const [receiptDate, setReceiptDate] = useState(getLocalDateString(new Date()));
  const [receiptDatePickerOpen, setReceiptDatePickerOpen] = useState(false);
  const formattedReceiptDate = receiptDate.split('-').reverse().join('/');
  const [observation, setObservation] = useState('');
  const [items, setItems] = useState<MobileReceiptItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const receiptIdRef = useRef('');
  const supplierLoadRequestRef = useRef(0);
  const totalValue = useMemo(
    () => Number(items.reduce((total, item) => total + item.totalCost, 0).toFixed(2)),
    [items],
  );

  const formValues = {
    supplierId,
    receiptDate,
    items,
    totalValue,
    fiscalKey: origin.fiscalKey || '',
    ipiPercent: origin.ipiPercent || 0,
    freightPercent: origin.freightPercent || 0,
    invoiceNumber: origin.invoiceNumber || '',
    invoiceDate: origin.invoiceDate || '',
    attachments: [] as string[],
    observations: observation.trim() ? [observation.trim()] : [],
    nonFiscalDiscountMode: 'percent' as const,
    nonFiscalDiscountValue: 0,
    nonFiscalFreightMode: 'percent' as const,
    nonFiscalFreightValue: 0,
    nonFiscalOtherExpensesMode: 'percent' as const,
    nonFiscalOtherExpensesValue: 0,
    fiscalIpi: origin.fiscalIpi || 0,
    fiscalFreight: origin.fiscalFreight || 0,
    fiscalDiscount: origin.fiscalDiscount || 0,
    fiscalOtherExpenses: origin.fiscalOtherExpenses || 0,
  };
  const { validateAndRun } = useZodForm(mobileReceiptFormSchema, formValues);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLocaleLowerCase('pt-BR');
    return suppliers.filter(
      (supplier) =>
        supplierProvidesStockOrigin(supplier.stock_origins, 'normal') &&
        matchesSearchText(supplier.name, query),
    );
  }, [supplierSearch, suppliers]);

  useEffect(() => {
    supplierLoadRequestRef.current += 1;
    if (!visible) return;
    receiptIdRef.current = generateUUID();
    setStage('source');
    setOrigin({ kind: 'manual', items: [] });
    setSupplierId('');
    setSuppliers([]);
    setSupplierSearch('');
    setSupplierPickerOpen(false);
    setSupplierLoadError('');
    setSuppliersLoaded(false);
    setLoadingSuppliers(false);
    setReceiptDate(getLocalDateString(new Date()));
    setReceiptDatePickerOpen(false);
    setObservation('');
    setItems([]);
    setProductPickerOpen(false);
  }, [visible]);

  const loadSupplierOptions = async (): Promise<SupplierOption[] | null> => {
    const requestId = ++supplierLoadRequestRef.current;
    setLoadingSuppliers(true);
    setSupplierLoadError('');
    try {
      const result = await fetchMobileProductSuppliersWithStatus();
      if (requestId !== supplierLoadRequestRef.current) return null;
      const options = result.suppliers.map((supplier) => ({
        ...supplier,
        name: supplier.nickname || supplier.full_name || supplier.social_name || 'Fornecedor',
      }));
      setSuppliers(options);
      setSuppliersLoaded(result.ok);
      setSupplierLoadError(result.ok ? '' : result.errorMessage);
      return result.ok ? options : null;
    } catch {
      if (requestId === supplierLoadRequestRef.current) {
        setSupplierLoadError('Não foi possível carregar os fornecedores. Tente novamente.');
      }
      return null;
    } finally {
      if (requestId === supplierLoadRequestRef.current) setLoadingSuppliers(false);
    }
  };

  const openSupplierPicker = async () => {
    if (loadingSuppliers) return;
    if (!suppliersLoaded && (await loadSupplierOptions()) === null) return;
    setSupplierPickerOpen(true);
  };

  const applyOrigin = (next: ReceiptOrigin) => {
    setOrigin(next);
    setSupplierId(next.supplierId || '');
    setItems(next.items.map((item) => ({ ...item })));
    if (next.kind === 'invoice') setSupplierLoadError('');
    setStage('form');
  };

  const selectPurchase = async (purchase: MobilePurchase) => {
    if (!purchase.supplierId) {
      Alert.alert('Pedido sem fornecedor', 'Vincule um fornecedor ao pedido antes de receber.');
      return;
    }
    const options = suppliersLoaded ? suppliers : await loadSupplierOptions();
    if (!options) {
      Alert.alert('Fornecedores indisponíveis', 'Não foi possível carregar os fornecedores. Tente novamente.');
      return;
    }
    const supplier = options.find((item) => item.id === purchase.supplierId);
    if (!supplier) {
      Alert.alert(
        'Fornecedor indisponível',
        'Não foi possível conferir o fornecedor deste pedido. Tente novamente.',
      );
      return;
    }
    if (!supplierProvidesStockOrigin(supplier.stock_origins, 'normal')) {
      Alert.alert(
        'Fornecedor sem estoque normal',
        'Este fornecedor não gera recebimento de estoque normal.',
      );
      return;
    }
    applyOrigin(purchaseReceiptOrigin(purchase));
  };

  const loadInvoiceOrigin = async (invoiceId: string) => {
    const data = await withTimeout<any | null>(
      fetchInboundInvoiceForMappings(invoiceId),
      15_000,
      null,
      'mobile:receipt-invoice-source',
    );
    if (!data) throw new Error('A busca da nota demorou. Tente novamente.');
    const next = inboundReceiptOrigin(data);
    const previous = await fetchInvoiceReceiptItems(next.fiscalKey || '', receiptIdRef.current);
    return remainingInvoiceReceiptOrigin(next, previous);
  };

  const selectInvoice = async (invoice: Invoice) => {
    applyOrigin(await loadInvoiceOrigin(invoice.id));
  };

  const addProduct = (product: SearchableProduct) => {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.productId === product.id && item.variationId === product.variation_id,
      );
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? receiptItemWithCosts({ ...item, quantity: item.quantity + 1 })
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          variationId: product.variation_id,
          description: product.name || product.description || 'Produto',
          quantity: 1,
          baseCost: 0,
          unitCost: 0,
          totalCost: 0,
          sku: product.sku || product.code || undefined,
        },
      ];
    });
  };

  const updateItem = (index: number, patch: Partial<MobileReceiptItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return receiptItemWithCosts({ ...item, ...patch });
      }),
    );
  };

  const handleConfirm = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await validateAndRun<{
        invoiceUpdated: boolean;
        invoiceComplete: boolean;
      }>(
        formValues,
        async (values) => {
          if (!connectivityService.connected) {
            throw new Error('Conecte-se à internet para confirmar o recebimento.');
          }
          if (origin.kind === 'invoice' && origin.invoiceId) {
            if (
              values.items.some(
                (item, index) => item.quantity > (origin.items[index]?.expectedQuantity || 0),
              )
            ) {
              throw new Error('A quantidade recebida não pode superar o saldo da nota.');
            }
            if (
              JSON.stringify(await loadInvoiceOrigin(origin.invoiceId)) !== JSON.stringify(origin)
            ) {
              throw new Error(
                'A nota, seus vínculos ou os recebimentos anteriores mudaram. Selecione a nota novamente.',
              );
            }
          }
          const invoiceComplete =
            origin.kind === 'invoice' &&
            values.items.length === origin.items.length &&
            values.items.every(
              (item, index) => item.quantity >= (origin.items[index]?.expectedQuantity || 0),
            );
          const result = await createMobileGoodsReceipt({
            id: receiptIdRef.current || (receiptIdRef.current = generateUUID()),
            purchaseId: origin.purchaseId,
            supplierId: values.supplierId,
            supplierName: selectedSupplier?.name || origin.supplierName || 'Fornecedor',
            receivedAt: new Date(`${values.receiptDate}T12:00:00`).toISOString(),
            totalValue: values.totalValue,
            observation: values.observations.join('\n'),
            invoiceId: origin.invoiceId,
            invoiceComplete,
            invoiceNumber: values.invoiceNumber,
            invoiceDate: values.invoiceDate,
            fiscalKey: values.fiscalKey,
            ipiPercent: values.ipiPercent,
            freightPercent: values.freightPercent,
            fiscalIpi: values.fiscalIpi,
            fiscalFreight: values.fiscalFreight,
            fiscalDiscount: values.fiscalDiscount,
            fiscalOtherExpenses: values.fiscalOtherExpenses,
            items: values.items,
          });
          return { ...result, invoiceComplete };
        },
        (errors) => {
          const message = Object.values(flattenFormErrors(errors))[0];
          Alert.alert('Revise o recebimento', message || 'Confira os campos obrigatórios.');
        },
      );
      if (saved) {
        onSaved();
        onClose();
        const message = !saved.invoiceUpdated
          ? 'A entrada foi registrada, mas a nota não pôde ser atualizada. Confira a nota e o recebimento antes de repetir.'
          : origin.kind === 'invoice' && !saved.invoiceComplete
            ? 'A entrada parcial foi registrada. A nota continua disponível para o restante.'
            : 'A entrada dos produtos foi registrada no estoque.';
        Alert.alert('Recebimento confirmado', message);
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível confirmar',
        error instanceof Error
          ? error.message
          : 'Confira a lista de recebimentos antes de tentar novamente.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const safeClose = () => {
    if (!saving) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={safeClose}>
      <KeyboardAvoidingView
        style={[
          styles.flex,
          {
            backgroundColor: colors.bg,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: '#059669' }]}>
          {stage === 'form' && (
            <TouchableOpacity
              onPress={() => setStage('source')}
              disabled={saving}
              accessibilityLabel="Voltar aos tipos de recebimento"
            >
              <ArrowLeft size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Novo recebimento de mercadoria</Text>
            <Text style={styles.headerSubtitle}>
              {stage === 'source'
                ? 'Escolha a origem'
                : stage === 'invoice'
                  ? 'Selecione a nota fiscal'
                  : stage === 'purchase'
                    ? 'Selecione o pedido de compra'
                    : origin.kind === 'invoice'
                      ? `NF-e #${origin.invoiceNumber || '—'}`
                      : origin.kind === 'purchase'
                        ? 'Pedido de compra'
                        : 'Sem nota fiscal'}
            </Text>
          </View>
          <TouchableOpacity onPress={safeClose} disabled={saving} accessibilityLabel="Fechar">
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {stage === 'source' ? (
          <ReceiptSourceOptions
            colors={colors}
            onSelect={(source) => {
              if (source === 'manual') applyOrigin({ kind: 'manual', items: [] });
              else setStage(source);
            }}
          />
        ) : stage === 'invoice' || stage === 'purchase' ? (
          <ReceiptSourcePicker
            kind={stage}
            isDarkMode={isDarkMode}
            colors={colors}
            onBack={() => setStage('source')}
            onSelectInvoice={selectInvoice}
            onSelectPurchase={selectPurchase}
          />
        ) : (
          <>
            <ScrollView
              pointerEvents={saving ? 'none' : 'auto'}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.text }]}>Fornecedor *</Text>
                <TouchableOpacity
                  onPress={() => void openSupplierPicker()}
                  disabled={origin.kind !== 'manual' || items.length > 0 || loadingSuppliers}
                  style={[
                    styles.selectButton,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedSupplier?.name || origin.supplierName || 'Selecionar fornecedor'
                  }
                >
                  <Text
                    style={{
                      color: supplierId ? colors.text : colors.muted,
                      flex: 1,
                    }}
                  >
                    {selectedSupplier?.name || origin.supplierName || 'Selecionar fornecedor'}
                  </Text>
                  {origin.kind === 'manual' && items.length === 0 && loadingSuppliers ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : origin.kind === 'manual' && items.length === 0 ? (
                    <Text style={{ color: '#059669', fontWeight: '900' }}>Escolher</Text>
                  ) : null}
                </TouchableOpacity>
                {supplierLoadError && origin.kind !== 'invoice' ? (
                  <Text style={styles.errorText}>{supplierLoadError}</Text>
                ) : null}

                <Text style={[styles.label, { color: colors.text }]}>Data de recebimento *</Text>
                <TouchableOpacity
                  onPress={() => setReceiptDatePickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Data de recebimento ${formattedReceiptDate}. Abrir calendário.`}
                  style={[
                    styles.dateField,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                    {formattedReceiptDate}
                  </Text>
                  <CalendarDays size={18} color={colors.muted} />
                </TouchableOpacity>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  Use o dia em que a mercadoria chegou.
                </Text>
              </View>

              <PurchaseItemsSection
                items={items}
                onOpenProductPicker={() => setProductPickerOpen(true)}
                onAddItemRow={() => setProductPickerOpen(true)}
                onUpdateItem={updateItem}
                onRemoveItem={(index) =>
                  setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                colors={colors}
                allowAdd={origin.kind !== 'invoice'}
                allowRemove={origin.kind !== 'invoice'}
                addDisabled={!supplierId}
                receiptMode
              />

              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
                <TextInput
                  value={observation}
                  onChangeText={setObservation}
                  multiline
                  placeholder="Anote divergências ou detalhes da entrega"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.observationInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.totalBox,
                  {
                    borderColor: '#a7f3d0',
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isDarkMode ? '#a7f3d0' : '#047857',
                    fontWeight: '900',
                  }}
                >
                  Total do recebimento
                </Text>
                <Text
                  style={{
                    color: isDarkMode ? '#a7f3d0' : '#047857',
                    fontWeight: '900',
                    fontSize: 20,
                  }}
                >
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalValue)}
                </Text>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={safeClose}
                disabled={saving}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.muted, fontWeight: '800' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleConfirm()}
                disabled={saving}
                style={styles.confirmButton}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmText}>Confirmar recebimento</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <PurchaseSupplierPickerModal
        visible={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        filteredSuppliers={filteredSuppliers}
        onSelectSupplier={(supplier) => {
          setSupplierId(supplier.id);
          setSupplierPickerOpen(false);
        }}
        colors={colors}
      />
      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={productPickerOpen}
        subtitle="Selecione a variação recebida"
        onClose={() => setProductPickerOpen(false)}
        onSelect={addProduct}
      />
      <TransactionDatePickerModal
        visible={receiptDatePickerOpen}
        selectedDate={receiptDate}
        isDarkMode={isDarkMode}
        onClose={() => setReceiptDatePickerOpen(false)}
        onSelect={setReceiptDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  headerSubtitle: {
    color: 'rgba(255,255,255,.82)',
    marginTop: 3,
    fontSize: 12,
  },
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  selectButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  dateField: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: { fontSize: 11, marginTop: -3 },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  observationInput: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  totalBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  confirmText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
