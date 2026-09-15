import { useState, useEffect, useMemo, useCallback } from 'react';
import Person from '@/pages/types/person.type';
import {
    GoodsReceipt,
    deleteGoodsReceipt,
    reverseGoodsReceipt,
    unreverseGoodsReceipt,
    subscribeToGoodsReceipts
} from '@/pages/utils/goodsReceiptService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { ReceiptPeriod } from '../types/receiptPeriodFilter.types';
import { filterReceiptsByPeriod } from '../utils/receiptPeriodUtils';

export interface UseReceiptsReturn {
    receipts: GoodsReceipt[];
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
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
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

    useEffect(() => subscribeToGoodsReceipts(setReceipts), []);

    useEffect(() => {
        return subscribeToPeople('suppliers', (data) =>
            setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers'))
        );
    }, []);

    const handleSelectSupplier = useCallback((id: string) => {
        setSelectedSupplierId(id);
    }, []);

    const selectedSupplier = useMemo(
        () => suppliers.find((s) => s.id === selectedSupplierId),
        [suppliers, selectedSupplierId]
    );

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

    const handleRowClick = useCallback((receipt: GoodsReceipt) => {
        handleOpenDetails(receipt);
    }, [handleOpenDetails]);

    const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Deseja excluir este registro de rascunho?')) return;
        try {
            await deleteGoodsReceipt(id);
            toast.success('Rascunho excluído com sucesso!');
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
            toast.success(`Recebimento de ${reverseCandidate.supplierName} estornado e saldo de estoque revertido!`);
            setReverseCandidate(null);
            setIsDetailsOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Não foi possível estornar o recebimento.';
            toast.error(message);
        } finally {
            setIsReversing(false);
        }
    }, [reverseCandidate]);

    const handleUnreverseRequest = useCallback((e: React.MouseEvent | null, receipt: GoodsReceipt) => {
        if (e) e.stopPropagation();
        setUnreverseCandidate(receipt);
    }, []);

    const handleConfirmUnreverse = useCallback(async () => {
        if (!unreverseCandidate) return;
        setIsUnreversing(true);
        try {
            await unreverseGoodsReceipt(unreverseCandidate.id);
            toast.success(`Estorno desfeito com sucesso! Recebimento reativado e movimentação de entrada efetivada.`);
            setUnreverseCandidate(null);
            setIsDetailsOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Não foi possível desfazer o estorno do recebimento.';
            toast.error(message);
        } finally {
            setIsUnreversing(false);
        }
    }, [unreverseCandidate]);

    // Filtra por fornecedor (se selecionado) e por período
    const filteredReceipts = useMemo(() => {
        let list = receipts;

        if (selectedSupplierId) {
            list = list.filter((rcpt) => {
                if (rcpt.supplierId && rcpt.supplierId === selectedSupplierId) return true;
                if (selectedSupplier && rcpt.supplierName) {
                    const sName = selectedSupplier.fullName.toLowerCase();
                    const rName = rcpt.supplierName.toLowerCase();
                    return rName.includes(sName) || sName.includes(rName);
                }
                return false;
            });
        }

        return filterReceiptsByPeriod(list, period, customStartDate, customEndDate);
    }, [receipts, selectedSupplierId, selectedSupplier, period, customStartDate, customEndDate]);

    return {
        receipts,
        suppliers,
        selectedSupplierId,
        selectedSupplier,
        setSelectedSupplierId: handleSelectSupplier,
        filteredReceipts,
        supplierReceipts: filteredReceipts,
        period,
        setPeriod,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
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
        handleConfirmUnreverse
    };
};
