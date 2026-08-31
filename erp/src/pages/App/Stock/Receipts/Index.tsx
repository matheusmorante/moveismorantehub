import { useEffect, useState } from 'react';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '../../../types/person.type';
import { formatCurrency, formatToBRDate } from '../../../utils/formatters';
import { GoodsReceipt, deleteGoodsReceipt, reverseGoodsReceipt, subscribeToGoodsReceipts } from '../../../utils/goodsReceiptService';
import { formatGoodsReceiptCode } from '../../../utils/goodsReceiptCode';
import { subscribeToPeople } from '../../../utils/personService';
import { toast } from 'react-toastify';
import ReceiptFormModal from './ReceiptFormModal';
import ReceiptCard from './ReceiptCard';
import ReceiptDetailsModal from './ReceiptDetailsModal';
import ConfirmReverseModal from './ConfirmReverseModal';

const LOCAL_STORAGE_SUPPLIER_KEY = 'morantehub_receipts_selected_supplier';

export default function ReceiptsPage() {
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

    return <div className="flex flex-col">
        <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><i className="bi bi-box-seam" /></div>
                <div><h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Recebimentos de Mercadorias</h1></div>
            </div>
            <button type="button" onClick={handleOpenNew} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 transition-all shadow-md"><i className="bi bi-plus-lg mr-2" />Registrar recebimento</button>
        </header>

        {/* Campo de Seleção de Fornecedor em destaque acima da tabela */}
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SupplierAutocomplete
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelect={setSelectedSupplierId}
                placeholder="Pesquise e selecione o fornecedor para listar os recebimentos..."
            />
        </div>

        <section className="overflow-hidden">
            {!selectedSupplierId ? (
                <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <i className="bi bi-person-lines-fill text-4xl text-slate-300 dark:text-slate-700" />
                    <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Selecione um fornecedor acima</p>
                    <p className="mt-1 text-xs text-slate-400">Pesquise o fornecedor para visualizar o histórico de recebimentos e rascunhos.</p>
                </div>
            ) : supplierReceipts.length === 0 ? (
                <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <i className="bi bi-box2-heart text-3xl text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-400">Nenhum recebimento encontrado para este fornecedor.</p>
                    <p className="mt-1 text-xs text-slate-400">Clique em "Registrar recebimento" para iniciar um novo recebimento deste fornecedor.</p>
                </div>
            ) : (
                <>
                    {/* Visualização em Tabela (Apenas telas XL ou maiores: >= 1280px) */}
                    <div className="hidden xl:block overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-955/30">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recebimento</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nota Fiscal</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total recebido</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {supplierReceipts.map((receipt) => {
                                    const isDraft = receipt.isDraft || receipt.status === 'draft';
                                    const isEstornado = receipt.status === 'estornado';
                                    const hasNF = Boolean(receipt.fiscalKey && receipt.fiscalKey.replace(/\D/g, '').length === 44);

                                    return (
                                        <tr key={receipt.id} onClick={() => handleRowClick(receipt)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-mono font-bold text-slate-500">#{formatGoodsReceiptCode(receipt)}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{receipt.items.length} itens recebidos</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isDraft ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-900/40">
                                                        <i className="bi bi-clock-history text-[11px]" /> Rascunho
                                                    </span>
                                                ) : isEstornado ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/40">
                                                        <i className="bi bi-arrow-counterclockwise text-[11px]" /> Estornado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                                                        <i className="bi bi-check-circle-fill text-[11px]" /> Recebido
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.supplierName}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{formatToBRDate(receipt.receivedAt)}</td>
                                            <td className="px-6 py-4">
                                                {hasNF ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                                                        <i className="bi bi-file-earmark-check-fill text-[11px]" /> Com NF {receipt.invoiceNumber ? `(${receipt.invoiceNumber})` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 rounded-md">
                                                        <i className="bi bi-file-earmark-x text-[11px]" /> Sem NF
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(receipt.totalValue)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === receipt.id ? null : receipt.id);
                                                        }}
                                                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
                                                        title="Ações"
                                                    >
                                                        <i className="bi bi-three-dots-vertical text-base" />
                                                    </button>

                                                    {openMenuId === receipt.id && (
                                                        <div
                                                            className="absolute right-0 mt-2 z-50 w-48 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    handleOpenDetails(receipt);
                                                                }}
                                                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                                            >
                                                                <i className="bi bi-eye text-emerald-600" /> Ver Detalhes
                                                            </button>

                                                            {isDraft && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleOpenEdit(receipt);
                                                                    }}
                                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                                >
                                                                    <i className="bi bi-pencil-square" /> Editar Rascunho
                                                                </button>
                                                            )}

                                                            {!isDraft && !isEstornado && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        setOpenMenuId(null);
                                                                        handleReverseRequest(e, receipt);
                                                                    }}
                                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                >
                                                                    <i className="bi bi-arrow-counterclockwise" /> Estornar Recebimento
                                                                </button>
                                                            )}

                                                            {isDraft && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        setOpenMenuId(null);
                                                                        handleDelete(e, receipt.id);
                                                                    }}
                                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                >
                                                                    <i className="bi bi-trash" /> Excluir Rascunho
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Visualização em Cards (Telas menores que XL: < 1280px) */}
                    <div className="block xl:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {supplierReceipts.map((receipt) => (
                                <ReceiptCard
                                    key={receipt.id}
                                    receipt={receipt}
                                    onClick={handleRowClick}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleDelete}
                                    onReverse={handleReverseRequest}
                                    onViewDetails={handleOpenDetails}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>

        <ReceiptFormModal
            isOpen={isFormOpen}
            onClose={() => { setIsFormOpen(false); setSelectedReceipt(null); }}
            initialReceipt={selectedReceipt}
            preselectedSupplierId={selectedSupplierId}
        />

        <ReceiptDetailsModal
            isOpen={isDetailsOpen}
            onClose={() => { setIsDetailsOpen(false); setDetailsReceipt(null); }}
            receipt={detailsReceipt}
            onReverse={(receipt) => handleReverseRequest(null, receipt)}
        />

        <ConfirmReverseModal
            isOpen={Boolean(reverseCandidate)}
            onClose={() => setReverseCandidate(null)}
            onConfirm={handleConfirmReverse}
            receipt={reverseCandidate}
            isProcessing={isReversing}
        />
    </div>;
}
