import { useState, useEffect } from 'react';
import Person from '@/pages/types/person.type';
import { GoodsReceipt, deleteGoodsReceipt, reverseGoodsReceipt, subscribeToGoodsReceipts } from '@/pages/utils/goodsReceiptService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { toast } from 'react-toastify';

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

    // Filtra por fornecedor selecionado
    const supplierReceipts = selectedSupplierId
        ? receipts.filter((rcpt) => {
              if (rcpt.supplierId && rcpt.supplierId === selectedSupplierId) return true;
              if (selectedSupplier && rcpt.supplierName) {
                  const sName = selectedSupplier.fullName.toLowerCase();
                  const rName = rcpt.supplierName.toLowerCase();
                  return rName.includes(sName) || sName.includes(rName);
              }
              return false;
          })
        : [];

    return {
        receipts,
        suppliers,
        selectedSupplierId,
        selectedSupplier,
        setSelectedSupplierId: handleSelectSupplier,
        supplierReceipts,
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
