import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useZodForm } from '@/hooks/useZodForm';
import { inboundInvoiceMappingFormSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import {
  fetchInboundReceiptHistoryItems,
  reuseSavedInboundInvoiceLinks,
} from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
  fetchPersons,
  INBOUND_INVOICE_MAPPING_SUPPLIER_QUERY_COLUMNS,
} from '@/pages/utils/personService';
import type Person from '@/pages/types/person.type';
import { withTimeout } from '../../../../../../../shared-utils/core/withTimeout';
import { isSalvadosOnlySupplier } from '../../../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../../../shared-utils/inboundInvoiceSupplierRules';
import { getInboundReceiptBlockedReason } from '../inboundReceiptEligibility';
import {
  persistGlobalSupplierItemMapping,
  persistInvoiceMappings,
  type MappingModalContextSnapshot,
} from './inboundMappingsPersistence';
import { repairInboundItemsFromXml } from './repairInboundItemsFromXml';

export type ManageInboundInvoiceMappingsProps = {
  isOpen: boolean;
  onClose: () => void;
  invoice: InboundInvoice | null;
  onSaveSuccess: () => void | Promise<void>;
  onSaveUncertain?: () => void | Promise<void>;
  canAccessReceipts?: boolean;
  onGenerateReceipt?: (invoice: InboundInvoice) => void;
};

const MAPPING_UPDATE_FIELDS = [
  'matchedProductId',
  'matchedVariationId',
  'linkMode',
  'compositionLinks',
  'inheritedSupplierLink',
] as const;

export function useInboundInvoiceMappingsModal({
  isOpen,
  onClose,
  invoice: initialInvoice,
  onSaveSuccess,
  onSaveUncertain,
  canAccessReceipts = false,
  onGenerateReceipt,
}: ManageInboundInvoiceMappingsProps) {
  const [invoice, setInvoice] = useState<InboundInvoice | null>(initialInvoice);
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [newSupplier, setNewSupplier] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);

  const inFlight = useRef(false);
  const activeRef = useRef(true);
  const uncertain = useRef(new Set<string>());
  const preparedMappingsKey = useRef<string | null>(null);
  useBodyScrollLock(isOpen && Boolean(invoice));

  const context = useRef<MappingModalContextSnapshot>({ initialInvoice, isOpen });
  if (context.current.initialInvoice !== initialInvoice || context.current.isOpen !== isOpen) {
    context.current = { initialInvoice, isOpen };
  }

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (isOpen && initialInvoice) {
      preparedMappingsKey.current = null;
      setLoading(true);
      setInitialDataReady(false);
      setErrorMessage('');
    } else {
      preparedMappingsKey.current = null;
      setInitialDataReady(false);
    }
  }, [isOpen, initialInvoice]);

  const mappingForm = useZodForm(inboundInvoiceMappingFormSchema, {
    id: initialInvoice?.id || '',
    items: [],
  });
  const mappingsKey = `${invoice?.supplierId || ''}:${invoice?.items?.map((item) => `${item.itemNumber}:${item.productCode}`).join('|') || ''}`;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === invoice?.supplierId);
  const invoiceSupplierOrigins = invoice?.supplierStockOrigins ?? selectedSupplier?.stockOrigins;
  const isSalvadosSupplier = isSalvadosOnlySupplier(invoiceSupplierOrigins);

  useEffect(() => {
    setInvoice(initialInvoice ? repairInboundItemsFromXml(initialInvoice) : null);
  }, [initialInvoice]);

  useEffect(() => {
    if (!isOpen || !invoice || invoice.id !== initialInvoice?.id) return;
    if (preparedMappingsKey.current === mappingsKey) return;
    let active = true;
    let failed = false;
    const sourceSnapshot = JSON.stringify(invoice?.items);

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const list = await withTimeout(
          fetchPersons('suppliers', false, { columns: INBOUND_INVOICE_MAPPING_SUPPLIER_QUERY_COLUMNS }),
          15000,
          null,
          'entrada:consultar-fornecedores'
        );
        if (!list) throw new Error('A consulta de fornecedores demorou demais.');
        if (active) setSuppliers(list);

        if (invoice.status === 'received' && invoice.receiptId) {
          const history = await withTimeout(
            fetchInboundReceiptHistoryItems(invoice.receiptId),
            15000,
            null,
            'entrada:consultar-historico-recebimento'
          );
          if (!history) throw new Error('A consulta dos itens efetivamente recebidos demorou demais.');
        }

        const resolvedOrigins =
          invoice?.supplierStockOrigins ??
          list.find((supplier) => supplier.id === invoice?.supplierId)?.stockOrigins;
        if (invoice && isSalvadosOnlySupplier(resolvedOrigins)) {
          setInvoice((current) =>
            current?.id === invoice.id
              ? {
                  ...current,
                  supplierStockOrigins: resolvedOrigins,
                  items: markInboundInvoiceItemsNotApplicable(current.items),
                }
              : current
          );
          return;
        }

        const reconciled = await reuseSavedInboundInvoiceLinks(invoice);
        if (!active) return;
        setInvoice((current) => {
          if (
            !current ||
            inFlight.current ||
            current.id !== invoice.id ||
            current.supplierId !== invoice.supplierId ||
            JSON.stringify(current.items) !== sourceSnapshot
          ) {
            return current;
          }
          if (reconciled.supplierId === current.supplierId && reconciled.items === current.items) {
            return current;
          }
          const origins =
            list.find((supplier) => supplier.id === reconciled.supplierId)?.stockOrigins ??
            reconciled.supplierStockOrigins;
          return {
            ...reconciled,
            supplierStockOrigins: origins,
            items: isSalvadosOnlySupplier(origins)
              ? markInboundInvoiceItemsNotApplicable(reconciled.items)
              : reconciled.items,
          };
        });
      } catch (error) {
        failed = true;
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Não foi possível consultar fornecedores/vínculos.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          if (!failed) {
            preparedMappingsKey.current = mappingsKey;
            setInitialDataReady(true);
          }
        }
      }
    };

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [isOpen, mappingsKey, initialInvoice, loadRevision, invoice?.id, invoice?.items, invoice?.supplierId]);

  const persistenceRuntime = {
    inFlight,
    activeRef,
    uncertain,
    context,
    reviewBusy,
    setSaving,
    setErrorMessage,
    setInvoice,
    onSaveSuccess,
    onSaveUncertain,
    validateAndRun: (
      data: InboundInvoice,
      onValid: (values: Record<string, unknown>) => Promise<boolean>,
      onInvalid: (errors: Record<string, unknown>) => void
    ) => mappingForm.validateAndRun(data as never, onValid as never, onInvalid as never),
  };

  const retryInitialLoad = () => {
    preparedMappingsKey.current = null;
    setErrorMessage('');
    setLoading(true);
    setLoadRevision((value) => value + 1);
  };

  const close = () => {
    if (!inFlight.current && !reviewBusy) onClose();
  };

  const setSupplier = (id: string, suppliedOrigins?: string[]) => {
    if (!invoice) return false;
    if (invoice.status === 'received') {
      setErrorMessage('O fornecedor não pode ser alterado depois que a nota foi recebida.');
      return false;
    }
    if (isSalvadosSupplier) return false;
    const nextSupplier = suppliers.find((supplier) => supplier.id === id);
    const nextOrigins = suppliedOrigins ?? nextSupplier?.stockOrigins;
    const nextIsSalvadosSupplier = isSalvadosOnlySupplier(nextOrigins);
    const nextInvoice: InboundInvoice = {
      ...invoice,
      supplierId: id || undefined,
      supplierStockOrigins: nextOrigins,
      items: nextIsSalvadosSupplier
        ? markInboundInvoiceItemsNotApplicable(invoice.items)
        : invoice.items.map((item) => ({
            ...item,
            matchedProductId: undefined,
            matchedVariationId: undefined,
            linkMode: 'unlinked',
            compositionLinks: [],
          })),
    };
    return persistInvoiceMappings(nextInvoice, persistenceRuntime);
  };

  const handleItemChange = (itemNumber: number, update: Partial<InboundInvoiceItem>) => {
    if (!invoice || isSalvadosSupplier) return false;
    const nextInvoice: InboundInvoice = {
      ...invoice,
      items: invoice.items.map((item) =>
        item.itemNumber === itemNumber ? { ...item, ...update } : item
      ),
    };
    if (!MAPPING_UPDATE_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(update, field))) {
      setInvoice(nextInvoice);
      return true;
    }
    return persistGlobalSupplierItemMapping(nextInvoice, itemNumber, isSalvadosSupplier, persistenceRuntime);
  };

  const handleSupplierCreated = (person: Person) => {
    setSuppliers((current) => [...current, person]);
    void setSupplier(person.id || '', person.stockOrigins);
    setNewSupplier(false);
  };

  const hasMatchedProducts = Boolean(
    invoice?.items.some((item) => Boolean(item.matchedProductId || item.compositionLinks?.length))
  );
  const hasUncertainSave = Boolean(invoice && uncertain.current.has(invoice.id));
  const receiptDisabledReason =
    saving || loading || reviewBusy
      ? 'Aguarde a consulta ou a gravação dos vínculos terminar.'
      : hasUncertainSave
        ? 'Há uma alteração sem confirmação. Consulte novamente os vínculos antes de gerar o recebimento.'
        : invoice
          ? getInboundReceiptBlockedReason(
              { ...invoice, supplierStockOrigins: invoiceSupplierOrigins },
              canAccessReceipts
            ) || (!onGenerateReceipt ? 'A ação de recebimento não está disponível nesta tela.' : null)
          : null;

  return {
    invoice,
    suppliers,
    newSupplier,
    setNewSupplier,
    setReviewBusy,
    reviewBusy,
    saving,
    loading,
    errorMessage,
    initialDataReady,
    isSalvadosSupplier,
    hasMatchedProducts,
    hasUncertainSave,
    receiptDisabledReason,
    canGenerateReceipt: !receiptDisabledReason,
    retryInitialLoad,
    close,
    setSupplier,
    handleItemChange,
    handleSupplierCreated,
  };
}
