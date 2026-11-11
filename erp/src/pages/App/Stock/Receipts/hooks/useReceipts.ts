import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { requestConfirmation } from '@/components/shared/confirmationService';
import Person from '@/pages/types/person.type';
import {
  GoodsReceipt,
  deleteGoodsReceipt,
  reverseGoodsReceipt,
  unreverseGoodsReceipt,
  subscribeToGoodsReceipts,
} from '@/pages/utils/goodsReceiptService';
import type {
  FetchGoodsReceiptsOptions,
  GoodsReceiptSubscriptionResult,
} from '@/pages/utils/goodsReceiptService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { ReceiptPeriod } from '../types/receiptPeriodFilter.types';
import { getReceiptPeriodDateRange } from '../utils/receiptPeriodUtils';

export interface UseReceiptsReturn {
  receipts: GoodsReceipt[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  isFromCache: boolean;
  suppliers: Person[];
  selectedSupplierId: string;
  selectedSupplier?: Person;
  setSelectedSupplierId: (id: string) => void;
  filteredReceipts: GoodsReceipt[];
  supplierReceipts: GoodsReceipt[];
  period: ReceiptPeriod;
  setPeriod: (period: ReceiptPeriod) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  isCopyingReceipt: boolean;
  setIsCopyingReceipt: (copying: boolean) => void;
  selectedReceipt: GoodsReceipt | null;
  setSelectedReceipt: (receipt: GoodsReceipt | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  detailsReceipt: GoodsReceipt | null;
  setDetailsReceipt: (receipt: GoodsReceipt | null) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  reverseCandidate: GoodsReceipt | null;
  setReverseCandidate: (receipt: GoodsReceipt | null) => void;
  isReversing: boolean;
  unreverseCandidate: GoodsReceipt | null;
  setUnreverseCandidate: (receipt: GoodsReceipt | null) => void;
  isUnreversing: boolean;
  handleOpenNew: () => void;
  handleOpenEdit: (receipt: GoodsReceipt) => void;
  handleCopyReceipt: (receipt: GoodsReceipt) => void;
  handleOpenDetails: (receipt: GoodsReceipt) => void;
  handleRowClick: (receipt: GoodsReceipt) => void;
  handleDelete: (e: React.MouseEvent, id: string) => Promise<void>;
  handleReverseRequest: (e: React.MouseEvent | null, receipt: GoodsReceipt) => void;
  handleConfirmReverse: () => Promise<void>;
  handleUnreverseRequest: (e: React.MouseEvent | null, receipt: GoodsReceipt) => void;
  handleConfirmUnreverse: () => Promise<void>;
}

/**
 * Hook orquestrador para gerenciamento do fluxo de recebimentos de mercadoria em estoque.
 */
export const useReceipts = (): UseReceiptsReturn => {
  const [receiptPage, setReceiptPage] = useState<GoodsReceiptSubscriptionResult>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 15,
    totalPages: 0,
    isFromCache: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const [period, setPeriod] = useState<ReceiptPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCopyingReceipt, setIsCopyingReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsReceipt, setDetailsReceipt] = useState<GoodsReceipt | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [reverseCandidate, setReverseCandidate] = useState<GoodsReceipt | null>(null);
  const [isReversing, setIsReversing] = useState(false);

  const [unreverseCandidate, setUnreverseCandidate] = useState<GoodsReceipt | null>(null);
  const [isUnreversing, setIsUnreversing] = useState(false);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );
  const dateRange = useMemo(
    () => getReceiptPeriodDateRange(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );
  const queryOptions = useMemo<FetchGoodsReceiptsOptions>(
    () => ({
      page: currentPage,
      pageSize: 15,
      supplierId: selectedSupplierId || undefined,
      supplierName: selectedSupplier ? selectedSupplier.fullName : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [
      currentPage,
      selectedSupplierId,
      selectedSupplier?.fullName,
      dateRange.startDate,
      dateRange.endDate,
    ]
  );
  const queryKey = JSON.stringify([
    queryOptions.page,
    queryOptions.supplierId ?? null,
    queryOptions.supplierName ?? null,
    queryOptions.startDate ?? null,
    queryOptions.endDate ?? null,
    queryOptions.searchTerm?.trim() ?? '',
    queryOptions.status ?? null,
  ]);
  const queryKeyRef = useRef(queryKey);
  const queryOptionsRef = useRef(queryOptions);
  queryOptionsRef.current = queryOptions;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const subscriptionRef = useRef<ReturnType<typeof subscribeToGoodsReceipts> | null>(null);

  useEffect(() => {
    const subscription = subscribeToGoodsReceipts((result) => {
      setReceiptPage(result);
      setIsLoading(false);
      if (result.page !== currentPageRef.current) setCurrentPage(result.page);
    }, queryOptionsRef.current);
    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (queryKey === queryKeyRef.current) return;
    queryKeyRef.current = queryKey;
    setIsLoading(true);
    setReceiptPage({
      items: [],
      totalCount: 0,
      page: queryOptions.page ?? 1,
      pageSize: 15,
      totalPages: 0,
      isFromCache: false,
    });
    subscriptionRef.current?.updateQuery(queryOptions);
  }, [queryKey, queryOptions]);

  useEffect(() => {
    return subscribeToPeople('suppliers', (data) =>
      setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers'))
    );
  }, []);

  const handleSelectSupplier = useCallback((id: string) => {
    setCurrentPage(1);
    setSelectedSupplierId(id);
  }, []);

  const handlePeriodChange = useCallback((nextPeriod: ReceiptPeriod) => {
    setCurrentPage(1);
    setPeriod(nextPeriod);
  }, []);
  const handleCustomStartDateChange = useCallback((date: string) => {
    setCurrentPage(1);
    setCustomStartDate(date);
  }, []);
  const handleCustomEndDateChange = useCallback((date: string) => {
    setCurrentPage(1);
    setCustomEndDate(date);
  }, []);

  const handleOpenNew = useCallback(() => {
    setSelectedReceipt(null);
    setIsCopyingReceipt(false);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setIsCopyingReceipt(false);
    setIsFormOpen(true);
  }, []);

  const handleCopyReceipt = useCallback((receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setIsCopyingReceipt(true);
    setIsFormOpen(true);
  }, []);

  const handleOpenDetails = useCallback((receipt: GoodsReceipt) => {
    setDetailsReceipt(receipt);
    setIsDetailsOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (receipt: GoodsReceipt) => {
      handleOpenDetails(receipt);
    },
    [handleOpenDetails]
  );

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!await requestConfirmation({
      title: 'Descartar rascunho de recebimento?',
      message: 'O rascunho deste recebimento será apagado.',
      confirmLabel: 'Descartar rascunho',
      type: 'danger',
    })) return;
    try {
      await deleteGoodsReceipt(id);
      toast.success('Rascunho descartado com sucesso!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir rascunho';
      toast.error(`Falha ao excluir rascunho: ${message}`);
    }
  }, []);

  const handleReverseRequest = useCallback((e: React.MouseEvent | null, receipt: GoodsReceipt) => {
    if (e) e.stopPropagation();
    setReverseCandidate(receipt);
  }, []);

  const handleConfirmReverse = useCallback(async () => {
    if (!reverseCandidate) return;
    setIsReversing(true);
    try {
      await reverseGoodsReceipt(reverseCandidate.id);
      toast.success(
        `Recebimento de ${reverseCandidate.supplierName} estornado e saldo de estoque revertido!`
      );
      setReverseCandidate(null);
      setIsDetailsOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível estornar o recebimento.';
      toast.error(message);
    } finally {
      setIsReversing(false);
    }
  }, [reverseCandidate]);

  const handleUnreverseRequest = useCallback(
    (e: React.MouseEvent | null, receipt: GoodsReceipt) => {
      if (e) e.stopPropagation();
      setUnreverseCandidate(receipt);
    },
    []
  );

  const handleConfirmUnreverse = useCallback(async () => {
    if (!unreverseCandidate) return;
    setIsUnreversing(true);
    try {
      await unreverseGoodsReceipt(unreverseCandidate.id);
      toast.success(
        `Estorno desfeito com sucesso! Recebimento reativado e movimentação de entrada efetivada.`
      );
      setUnreverseCandidate(null);
      setIsDetailsOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível desfazer o estorno do recebimento.';
      toast.error(message);
    } finally {
      setIsUnreversing(false);
    }
  }, [unreverseCandidate]);

  const receipts = receiptPage.items;
  const filteredReceipts = receipts;

  return {
    receipts,
    currentPage,
    setCurrentPage,
    totalItems: receiptPage.totalCount,
    totalPages: receiptPage.totalPages,
    isLoading,
    isFromCache: receiptPage.isFromCache,
    suppliers,
    selectedSupplierId,
    selectedSupplier,
    setSelectedSupplierId: handleSelectSupplier,
    filteredReceipts,
    supplierReceipts: filteredReceipts,
    period,
    setPeriod: handlePeriodChange,
    customStartDate,
    setCustomStartDate: handleCustomStartDateChange,
    customEndDate,
    setCustomEndDate: handleCustomEndDateChange,
    isFormOpen,
    setIsFormOpen,
    isCopyingReceipt,
    setIsCopyingReceipt,
    selectedReceipt,
    setSelectedReceipt,
    isDetailsOpen,
    setIsDetailsOpen,
    detailsReceipt,
    setDetailsReceipt,
    openMenuId,
    setOpenMenuId,
    reverseCandidate,
    setReverseCandidate,
    isReversing,
    unreverseCandidate,
    setUnreverseCandidate,
    isUnreversing,
    handleOpenNew,
    handleOpenEdit,
    handleCopyReceipt,
    handleOpenDetails,
    handleRowClick,
    handleDelete,
    handleReverseRequest,
    handleConfirmReverse,
    handleUnreverseRequest,
    handleConfirmUnreverse,
  };
};
