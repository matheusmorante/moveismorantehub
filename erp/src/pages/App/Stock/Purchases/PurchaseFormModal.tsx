import React, { useState, useEffect } from "react";
import Purchase, { PurchaseItem } from "../../../types/purchase.type";
import Product, { Variation } from "../../../types/product.type";
import Person from "../../../types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { savePurchase } from "../../../utils/purchaseService";
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { toast } from "react-toastify";
import { formatCurrency } from "../../../utils/formatters";
import ProductSearchModal from "../../SalesOrder/ProductSearchModal";
import SupplierSearchModal from "./components/SupplierSearchModal";
import SmartInput from "../../../../components/SmartInput";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const PurchaseFormModal = ({ isOpen, onClose }: Props) => {
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [observation, setObservation] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Current item being added
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
    const [currentProductId, setCurrentProductId] = useState("");
    const [currentVariationId, setCurrentVariationId] = useState<string | undefined>(undefined);
    const [currentDescription, setCurrentDescription] = useState("");
    const [currentQty, setCurrentQty] = useState(1);
    const [currentCost, setCurrentCost] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const unsubSuppliers = subscribeToPeople('suppliers', (data) => {
                setSuppliers(data.filter(p => !p.deleted && p.type === 'suppliers'));
            });
            const unsubProducts = subscribeToProducts((data) => {
                setProducts(data.filter(p => !p.deleted && p.itemType === 'product'));
            });
            return () => { unsubSuppliers(); unsubProducts(); };
        }
    }, [isOpen]);

    const handleAddItem = () => {
        if ((!currentProductId && !currentDescription) || currentQty <= 0) return;

        let finalDescription = currentDescription;
        let productId = currentProductId;

        if (currentProductId) {
            const product = products.find(p => p.id === currentProductId);
            if (product) {
                if (!finalDescription) finalDescription = product.description;
                if (currentVariationId) {
                    const v = product.variations?.find(varItem => varItem.id === currentVariationId);
                    if (v && !finalDescription.includes(v.name)) finalDescription += ` - ${v.name}`;
                }
            }
        }

        const newItem: PurchaseItem = {
            productId: productId || "",
            variationId: currentVariationId,
            description: finalDescription,
            quantity: currentQty,
            unitCost: currentCost,
            totalCost: currentQty * currentCost
        };

        setItems([...items, newItem]);
        setCurrentProductId("");
        setCurrentVariationId(undefined);
        setCurrentDescription("");
        setCurrentQty(1);
        setCurrentCost(0);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const totalValue = items.reduce((sum, item) => sum + item.totalCost, 0);

    const handleSave = async (status: 'opened' | 'ordered' | 'fulfilled') => {
        if (!selectedSupplierId || items.length === 0) {
            toast.error("Selecione um fornecedor e adicione pelo menos um item.");
            return;
        }

        const supplier = suppliers.find(s => s.id === selectedSupplierId);

        setIsSaving(true);
        try {
            const purchase: Purchase = {
                supplierId: selectedSupplierId,
                supplierName: supplier!.fullName,
                date: new Date().toISOString(),
                items,
                totalValue,
                observation,
                status,
                invoiceNumber,
                invoiceDate,
                invoiceStatus: status === 'fulfilled' ? 'received' : 'pending'
            };

            await savePurchase(purchase);
            
            let message = "Pedido de compra salvo!";
            if (status === 'ordered') message = "Pedido confirmado e estoque atualizado! 📦";
            if (status === 'fulfilled') message = "Pedido atendido e estoque atualizado! ✨";
            
            toast.success(message);
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar o pedido de compra.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">Novo Pedido de Compra</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mt-1">Entrada de mercadorias via fornecedor</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Supplier Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="flex flex-col gap-2 relative">
                            <SmartInput
                                label="Fornecedor"
                                value={selectedSupplierId ? (suppliers.find(s => s.id === selectedSupplierId)?.fullName || "") : ""}
                                onValueChange={(val: string) => {
                                    const supplier = suppliers.find(s => s.fullName === val || s.tradeName === val);
                                    if (supplier?.id) setSelectedSupplierId(supplier.id);
                                }}
                                tableName="people"
                                columnName="fullName"
                                placeholder="Buscar fornecedor..."
                                icon="bi-truck"
                            />
                            <button
                                type="button"
                                onClick={() => setIsSupplierSearchOpen(true)}
                                className="absolute right-3 top-[34px] p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <i className="bi bi-search text-xs"></i>
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <SmartInput
                                label="Observações / Referência"
                                value={observation}
                                onValueChange={(val: string) => setObservation(val)}
                                patterns={["Pedido pelo WhatsApp", "Compra via Bling", "Reposição de estoque", "Nota Fiscal emitida"]}
                                tableName="purchases"
                                columnName="observation"
                                placeholder="Ref. Nota Fiscal, canal de compra..."
                                icon="bi-chat-left-text"
                            />
                        </div>
                    </div>

                    {/* Invoice Info Section */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/30 flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200/50">
                                <i className="bi bi-file-earmark-text text-white text-sm" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Dados da Nota Fiscal (Opcional)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número da NF</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    placeholder="Ex: 000.123.456"
                                    className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Emissão</label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Add Item Section */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">Adicionar Item</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <ProductAutocomplete
                                    value={currentDescription}
                                    onChange={setCurrentDescription}
                                    onSelect={(p, v) => {
                                        // setCurrentProductId(p.id!); // Comentado por solicitação do usuário, para agir apenas como autocomplete
                                        // setCurrentVariationId(v?.id);
                                        setCurrentDescription(v ? `${p.description} (${v.name})` : p.description);
                                        if (v?.costPrice) setCurrentCost(v.costPrice);
                                        else if (p.costPrice) setCurrentCost(p.costPrice);
                                    }}
                                    onSelectDescription={setCurrentDescription}
                                    onSearch={() => setIsProductSearchOpen(true)}
                                    placeholder="Buscar ou digitar produto..."
                                />
                            </div>
                            <div>
                                <input 
                                    type="number"
                                    placeholder="Qtd"
                                    value={currentQty}
                                    onChange={(e) => setCurrentQty(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-center"
                                />
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="number"
                                    placeholder="Custo Un."
                                    value={currentCost}
                                    onChange={(e) => setCurrentCost(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-center"
                                />
                                <button 
                                    onClick={handleAddItem}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-hidden bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Custo Un.</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.description}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-black text-slate-600 dark:text-slate-400">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                                            {formatCurrency(item.unitCost)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-black text-blue-600 dark:text-blue-400">
                                            {formatCurrency(item.totalCost)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum item adicionado</td>
                                    </tr>
                                )}
                            </tbody>
                            {items.length > 0 && (
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Valor Total da Compra</td>
                                        <td className="px-6 py-4 text-right text-xl font-black">{formatCurrency(totalValue)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <button 
                        onClick={() => handleSave('opened')}
                        disabled={isSaving || items.length === 0}
                        className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                        Salvar como Aberto
                    </button>
                    <button 
                        onClick={() => handleSave('ordered')}
                        disabled={isSaving || items.length === 0}
                        className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 text-[9px]"
                    >
                        Confirmar Pedido (Em Ordem)
                    </button>
                    <button 
                        onClick={() => handleSave('fulfilled')}
                        disabled={isSaving || items.length === 0}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-[9px]"
                    >
                        {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="bi bi-check-lg" />}
                        Finalizar (Atendido)
                    </button>
                </div>
            </div>

            {isProductSearchOpen && (
                <ProductSearchModal 
                    priceType="cost"
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(p, v) => {
                        // setCurrentProductId(p.id!); // Comentado por solicitação do usuário, para agir apenas como autocomplete
                        // setCurrentVariationId(v?.id);
                        setCurrentDescription(v ? `${p.description} (${v.name})` : p.description);
                        setCurrentCost((v ? v.costPrice : p.costPrice) || 0);
                    }}
                />
            )}

            {isSupplierSearchOpen && (
                <SupplierSearchModal 
                    onClose={() => setIsSupplierSearchOpen(false)}
                    onSelect={(s) => setSelectedSupplierId(s.id!)}
                />
            )}
        </div>
    );
};

export default PurchaseFormModal;
