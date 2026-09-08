import { useState, useEffect, useMemo } from 'react';
import Person from '@/pages/types/person.type';
import { GoodsReceipt, deleteGoodsReceipt, reverseGoodsReceipt, subscribeToGoodsReceipts } from '@/pages/utils/goodsReceiptService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { ReceiptPeriod } from './receiptPeriodFilter.types';
import { filterReceiptsByPeriod } from './receiptPeriodUtils';

const LOCAL_STORAGE_SUPPLIER_KEY = 'morantehub_receipts_selected_supplier';

export const useReceipts = () => {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
        try {
            return localStorage.getItem(LOCAL_STORAGE_SUPPLIER_KEY) || '';
        } catch {
            return '';
        }
    });

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
    const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsReceipt, setDetailsReceipt] = useState<GoodsReceipt | null>(null);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [reverseCandidate, setReverseCandidate] = useState<GoodsReceipt | null>(null);
    const [isReversing, setIsReversing] = useState(false);

    useEffect(() => subscribeToGoodsReceipts(setReceipts), []);

    useEffect(() => {
        return subscribeToPeople('suppliers', (data) =>
            setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers'))
        );
    }, []);

    const handleSelectSupplier = (id: string) => {
        setSelectedSupplierId(id);
        try {
            if (id) {
                localStorage.setItem(LOCAL_STORAGE_SUPPLIER_KEY, id);
            } else {
                localStorage.removeItem(LOCAL_STORAGE_SUPPLIER_KEY);
            }
        } catch (err) {
            console.error('Erro ao salvar fornecedor no localStorage:', err);
        }
    };

    const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

    const handleOpenNew = () => {
        setSelectedReceipt(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (receipt: GoodsReceipt) => {
        setSelectedReceipt(receipt);
        setIsFormOpen(true);
    };

    const handleOpenDetails = (receipt: GoodsReceipt) => {
        setDetailsReceipt(receipt);
        setIsDetailsOpen(true);
    };

    const handleRowClick = (receipt: GoodsReceipt) => {
        const isDraft = receipt.isDraft || receipt.status === 'draft';
        if (isDraft) {
            handleOpenEdit(receipt);
        } else {
            handleOpenDetails(receipt);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Deseja excluir este registro de rascunho?')) {
            await deleteGoodsReceipt(id);
            toast.success('Rascunho excluído com sucesso!');
        }
    };

    const handleReverseRequest = (e: React.MouseEvent | null, receipt: GoodsReceipt) => {
        if (e) e.stopPropagation();
        setReverseCandidate(receipt);
    };

    const handleConfirmReverse = async () => {
        if (!reverseCandidate) return;
        setIsReversing(true);
        try {
            await reverseGoodsReceipt(reverseCandidate.id);
            toast.success(`Recebimento de ${reverseCandidate.supplierName} estornado e saldo de estoque revertido!`);
            setReverseCandidate(null);
            setIsDetailsOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Não foi possível estornar o recebimento.');
        } finally {
            setIsReversing(false);
        }
    };

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
        handleOpenNew,
        handleOpenEdit,
        handleOpenDetails,
        handleRowClick,
        handleDelete,
        handleReverseRequest,
        handleConfirmReverse
    };
};
