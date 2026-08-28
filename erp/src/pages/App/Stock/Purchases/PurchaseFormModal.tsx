import React, { useState, useEffect } from "react";
import Purchase, { PurchaseItem } from "../../../types/purchase.type";
import Product from "../../../types/product.type";
import Person from "../../../types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { savePurchase, updatePurchase } from "../../../utils/purchaseService";
import { toast } from "react-toastify";
import { formatCurrency } from "../../../utils/formatters";
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { supabase } from "@/pages/utils/supabaseConfig";
import imageCompression from 'browser-image-compression';
import { PurchaseItemsSection } from "@/components/PurchaseItemsSection";
import PurchaseReceiptCheckModal from "./components/PurchaseReceiptCheckModal";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialPurchase?: Purchase | null;
}

const PurchaseFormModal = ({ isOpen, onClose, initialPurchase }: Props) => {
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [fiscalKey, setFiscalKey] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [ipiPercent, setIpiPercent] = useState(0);
    const [freightPercent, setFreightPercent] = useState(0);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    // Legacy fields held as constants
    const observation = "";
    const invoiceNumber = "";
    const invoiceDate = "";

    useEffect(() => {
        if (isOpen) {
            const unsubSuppliers = subscribeToPeople('suppliers', (data) => {
                setSuppliers(data.filter(p => !p.deleted && p.type === 'suppliers'));
            });
            const unsubProducts = subscribeToProducts((data) => {
                setProducts(data.filter(p => !p.deleted && p.itemType === 'product'));
            });

            if (initialPurchase) {
                setSelectedSupplierId(initialPurchase.supplierId || "");
                setItems(initialPurchase.items || []);
                setFiscalKey(initialPurchase.fiscalKey || "");
                setAttachments(initialPurchase.attachments || []);
                setPurchaseDate(initialPurchase.date ? new Date(initialPurchase.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                setIpiPercent(initialPurchase.ipiPercent || 0);
                setFreightPercent(initialPurchase.freightPercent || 0);
            } else {
                setSelectedSupplierId("");
                setItems([]);
                setFiscalKey("");
                setAttachments([]);
                setPurchaseDate(new Date().toISOString().split('T')[0]);
                setIpiPercent(0);
                setFreightPercent(0);
            }

            return () => { unsubSuppliers(); unsubProducts(); };
        }
    }, [isOpen, initialPurchase]);

    const handleAddItem = (newItem: PurchaseItem) => {
        const product = products.find(p => p.id === newItem.productId);
        const prodSupplierId = product?.mainSupplierId || product?.supplierId || (product as any)?.main_supplier_id || (product as any)?.supplier_id;

        if (!selectedSupplierId && prodSupplierId) {
            setSelectedSupplierId(prodSupplierId);
        } else if (selectedSupplierId && prodSupplierId && prodSupplierId !== selectedSupplierId) {
            const prodSupplier = suppliers.find(s => s.id === prodSupplierId);
            toast.error(`Este produto pertence ao fornecedor "${prodSupplier?.fullName || 'outro fornecedor'}". Remova os itens para trocar de fornecedor.`);
            return;
        }

        setItems([...items, newItem]);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const compressImage = async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/')) return file;
        if (file.size <= 2 * 1024 * 1024) return file;

        const options = {
            maxSizeMB: 2,
            useWebWorker: true
        };
        try {
            return await imageCompression(file, options);
        } catch (error) {
            console.error("Erro ao comprimir imagem:", error);
            return file;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (attachments.length + files.length > 5) {
            toast.error("Você pode anexar no máximo 5 arquivos (PDF ou imagem).");
            return;
        }

        setIsUploading(true);
        try {
            const uploadedUrls = [...attachments];
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                
                // Comprimir imagem se maior que 2MB
                if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
                    file = await compressImage(file);
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `purchases/${fileName}`;

                const { error } = await supabase.storage
                    .from('purchase-attachments')
                    .upload(filePath, file);

                if (error) throw error;

                const { data: publicUrlData } = supabase.storage
                    .from('purchase-attachments')
                    .getPublicUrl(filePath);

                if (publicUrlData?.publicUrl) {
                    uploadedUrls.push(publicUrlData.publicUrl);
                }
            }
            setAttachments(uploadedUrls);
            toast.success("Arquivo(s) anexado(s) com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer upload do arquivo:", error);
            toast.error("Erro ao fazer upload dos anexos de nota fiscal.");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const handleRemoveAttachment = (idx: number) => {
        setAttachments(attachments.filter((_, i) => i !== idx));
    };

    const handleCancelOrClose = async () => {
        if (!initialPurchase && (selectedSupplierId || items.length > 0)) {
            try {
                const supplier = suppliers.find(s => s.id === selectedSupplierId);
                const purchase: Purchase = {
                    supplierId: selectedSupplierId,
                    supplierName: supplier?.fullName || 'Fornecedor Rascunho',
                    date: new Date(purchaseDate).toISOString(),
                    items: processedItems,
                    totalValue,
                    observation,
                    status: 'opened',
                    invoiceNumber,
                    invoiceDate,
                    invoiceStatus: 'pending',
                    fiscalKey,
                    attachments,
                    ipiPercent,
                    freightPercent
                };

                await savePurchase(purchase);
                toast.info("Pedido de compra salvo como rascunho!");
            } catch (err) {
                console.error("Erro ao salvar rascunho de compra:", err);
            }
        }
        onClose();
    };

    // Computed dynamic item cost calculation
    const processedItems = items.map(item => {
        const baseCost = item.baseCost || item.unitCost;
        const itemIpi = baseCost * (ipiPercent / 100);
        const itemFreight = baseCost * (freightPercent / 100);
        const itemUnitCost = baseCost + itemIpi + itemFreight;
        const itemTotalCost = item.quantity * itemUnitCost;

        return {
            ...item,
            unitCost: Number(itemUnitCost.toFixed(2)),
            totalCost: Number(itemTotalCost.toFixed(2))
        };
    });

    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    const handleSave = async (status: 'opened' | 'ordered' | 'fulfilled') => {
        if (!selectedSupplierId || items.length === 0) {
            toast.error("Selecione um fornecedor e adicione pelo menos um item.");
            return;
        }

        if (fiscalKey && fiscalKey.length !== 44) {
            toast.error("A Chave de Acesso da Nota Fiscal deve conter exatamente 44 dígitos numéricos.");
            return;
        }

        const supplier = suppliers.find(s => s.id === selectedSupplierId);

        setIsSaving(true);
        try {
            const purchase: Purchase = {
                supplierId: selectedSupplierId,
                supplierName: supplier!.fullName,
                date: new Date(purchaseDate).toISOString(),
                items: processedItems,
                totalValue,
                observation,
                status: initialPurchase?.status === 'cancelled' ? 'cancelled' : status,
                invoiceNumber,
                invoiceDate,
                invoiceStatus: status === 'fulfilled' ? 'received' : 'pending',
                fiscalKey,
                attachments,
                ipiPercent,
                freightPercent
            };

            if (initialPurchase?.id) {
                await updatePurchase(initialPurchase.id, purchase);
                toast.success("Pedido de compra atualizado com sucesso!");
            } else {
                await savePurchase(purchase);
                let message = "Pedido de compra salvo!";
                if (status === 'ordered') message = "Pedido confirmado e estoque atualizado! 📦";
                if (status === 'fulfilled') message = "Pedido atendido e estoque atualizado! ✨";
                toast.success(message);
            }
            
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar o pedido de compra.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 xl:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={handleCancelOrClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full h-full xl:h-auto xl:max-h-[90vh] xl:max-w-7xl rounded-none xl:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 xl:border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="px-4 py-3 xl:px-6 xl:py-3 bg-blue-600 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base xl:text-lg font-black tracking-tight uppercase">
                            {initialPurchase ? `Pedido de Compra #${initialPurchase.id?.slice(-4)}` : 'Novo Pedido de Compra'}
                        </h2>
                        {initialPurchase && (() => {
                            const status = initialPurchase.status;
                            const isFulfilled = status === 'fulfilled';
                            const isOrdered = status === 'ordered';
                            const isCancelled = status === 'cancelled';
                            const label = isFulfilled ? 'Atendido' : isOrdered ? 'Em Ordem' : isCancelled ? 'Cancelado' : 'Em Aberto';
                            const dotColor = isFulfilled ? 'bg-emerald-300' : isOrdered ? 'bg-amber-300' : isCancelled ? 'bg-rose-300' : 'bg-slate-300';
                            
                            return (
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/15 text-white border border-white/20">
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                    {label}
                                </span>
                            );
                        })()}
                    </div>
                    <button onClick={handleCancelOrClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 xl:p-8 space-y-6 xl:space-y-8 custom-scrollbar">
                    {/* Supplier, Date, IPI & Freight */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <SupplierAutocomplete
                                suppliers={suppliers}
                                selectedSupplierId={selectedSupplierId}
                                onSelect={setSelectedSupplierId}
                                disabled={items.length > 0}
                                disabledReason="Para alterar o fornecedor, remova todos os itens do pedido."
                                placeholder="Buscar fornecedor..."
                                inputClassName="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm rounded-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data do Pedido</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all focus:ring-0 rounded-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">IPI (%)</label>
                            <div className="relative border-0 border-b-2 border-slate-200 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={ipiPercent || ""}
                                    onChange={(e) => setIpiPercent(Number(e.target.value))}
                                    className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-700 dark:text-slate-200 border-none focus:ring-0 rounded-none"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                                    %
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frete (%)</label>
                            <div className="relative border-0 border-b-2 border-slate-200 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={freightPercent || ""}
                                    onChange={(e) => setFreightPercent(Number(e.target.value))}
                                    className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-700 dark:text-slate-200 border-none focus:ring-0 rounded-none"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                                    %
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nota Fiscal Attachments & Chave de Acesso */}
                    <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/30 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Lado esquerdo: Upload e Listagem de arquivos */}
                            <div className="flex flex-col gap-2 w-full">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anexar Documento / Nota Fiscal (PDF ou Imagem - Máx: 5)</label>
                                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-slate-50/20 dark:hover:bg-slate-950/10 ${attachments.length >= 5 ? 'opacity-50 pointer-events-none border-slate-200' : 'border-slate-300 dark:border-slate-800 hover:border-blue-500'}`}>
                                    <i className={`bi ${isUploading ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} text-blue-600 dark:text-blue-400 text-2xl mb-1`} />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {isUploading ? 'Enviando arquivos...' : 'Arraste ou clique para anexar nota fiscal'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Formatos: PDF, PNG, JPG (Enviados: {attachments.length}/5)</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="application/pdf,image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading || attachments.length >= 5}
                                        className="hidden"
                                    />
                                </label>

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mt-2">
                                        {attachments.map((url, idx) => {
                                            const fileName = url.split('/').pop()?.slice(-25) || `Nota Fiscal #${idx + 1}`;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-xl gap-3 shadow-sm animate-slide-up">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <i className="bi bi-file-earmark-pdf-fill text-red-500 shrink-0 text-base" />
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate hover:underline">
                                                            {fileName}
                                                        </a>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAttachment(idx)}
                                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors shrink-0"
                                                        title="Remover anexo"
                                                    >
                                                        <i className="bi bi-trash text-xs" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Lado direito: Input da Chave de Acesso */}
                            <div className="flex flex-col gap-2 w-full">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chave de Acesso (NF-e - 44 dígitos)</label>
                                <input
                                    type="text"
                                    value={fiscalKey}
                                    maxLength={44}
                                    onChange={(e) => setFiscalKey(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Digite a chave da nota fiscal..."
                                    className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold tracking-widest text-slate-700 dark:text-slate-200 transition-all focus:ring-0 focus:shadow-sm rounded-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section of Purchase Items */}
                    <PurchaseItemsSection
                        items={items}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        ipiPercent={ipiPercent}
                        freightPercent={freightPercent}
                        formatCurrency={formatCurrency}
                        supplierId={selectedSupplierId}
                        onSupplierAutoSelect={(supId) => setSelectedSupplierId(supId)}
                    />
                </div>

                {/* Footer Actions */}
                <div className="p-4 xl:p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCancelOrClose}
                            className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs uppercase tracking-wider"
                        >
                            Cancelar / Fechar
                        </button>
                        {initialPurchase && initialPurchase.status !== 'cancelled' && (
                            <button
                                type="button"
                                onClick={() => setIsReceiptModalOpen(true)}
                                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                            >
                                <i className="bi bi-qr-code-scan text-sm"></i>
                                Conferir Recebimento
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => handleSave('ordered')}
                            disabled={isSaving}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none text-xs uppercase tracking-wider"
                        >
                            Confirmar Pedido
                        </button>
                    </div>
                </div>
            </div>

            {initialPurchase && (
                <PurchaseReceiptCheckModal
                    isOpen={isReceiptModalOpen}
                    purchase={initialPurchase}
                    onClose={() => setIsReceiptModalOpen(false)}
                />
            )}
        </div>
    );
};

export default PurchaseFormModal;
