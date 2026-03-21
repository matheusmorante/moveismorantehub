import React, { useState, useEffect } from "react";
import Purchase, { PurchaseItem } from "../../../../types/purchase.type";
import { updatePurchase } from "../../../../utils/purchaseService";
import QRScannerModal from "@/components/shared/QRScannerModal";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { toast } from "react-toastify";
import { formatToBRDate } from "../../../../utils/formatters";
import { getProductsByIds } from "../../../../utils/productService";
import Product from "../../../../types/product.type";

interface PurchaseReceiptCheckModalProps {
    purchase: Purchase | null;
    isOpen: boolean;
    onClose: () => void;
}

const PurchaseReceiptCheckModal = ({ purchase, isOpen, onClose }: PurchaseReceiptCheckModalProps) => {
    const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
    const [invoicedQuantities, setInvoicedQuantities] = useState<Record<string, number>>({});
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [discrepancyNote, setDiscrepancyNote] = useState("");

    useEffect(() => {
        if (purchase && isOpen) {
            // Initialize received quantities from purchase items if already present
            const receivedInitial: Record<string, number> = {};
            const invoicedInitial: Record<string, number> = {};
            
            purchase.items.forEach((item: PurchaseItem) => {
                const key = item.productId + (item.variationId || '');
                receivedInitial[key] = item.receivedQuantity || 0;
                invoicedInitial[key] = item.quantity; // Default invoiced to ordered qty
            });
            
            setScannedItems(receivedInitial);
            setInvoicedQuantities(invoicedInitial);
            setInvoiceNumber(purchase.invoiceNumber || "");
            setInvoiceDate(purchase.invoiceDate || "");
            setDiscrepancyNote("");

            // Fetch products to support barcode matching
            const productIds = Array.from(new Set(purchase.items.map(i => i.productId)));
            getProductsByIds(productIds).then(setProducts);
        }
    }, [purchase, isOpen]);

    if (!isOpen || !purchase) return null;

    const handleScan = (code: string) => {
        const cleanCode = code.trim().toLowerCase();
        
        // Try to find product by code or supplierRef
        const product = products.find(p => 
            p.code?.trim().toLowerCase() === cleanCode || 
            p.supplierRef?.trim().toLowerCase() === cleanCode
        );
        
        if (product) {
            const purchaseItem = purchase.items.find(i => i.productId === product.id && !i.variationId);
            if (purchaseItem) {
                const key = purchaseItem.productId;
                const current = scannedItems[key] || 0;
                updateReceivedQty(key, current + 1);
                toast.success(`+1 ${purchaseItem.description}`);
                return;
            }
        }

        // Try to find variation by SKU
        for (const p of products) {
            if (p.hasVariations && p.variations) {
                const variation = p.variations.find((v: any) => v.sku?.trim().toLowerCase() === cleanCode);
                if (variation) {
                    const purchaseItem = purchase.items.find(i => i.productId === p.id && i.variationId === variation.id);
                    if (purchaseItem) {
                        const key = purchaseItem.productId + (purchaseItem.variationId || '');
                        const current = scannedItems[key] || 0;
                        updateReceivedQty(key, current + 1);
                        toast.success(`+1 ${purchaseItem.description}`);
                        return;
                    }
                }
            }
        }

        toast.warning("Item não encontrado neste pedido.");
    };

    const updateReceivedQty = (key: string, val: number) => {
        setScannedItems(prev => ({ ...prev, [key]: val }));
    };

    const updateInvoicedQty = (key: string, val: number) => {
        setInvoicedQuantities(prev => ({ ...prev, [key]: val }));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const content = `
            <html>
                <head>
                    <title>Conferência de Compra - ${purchase.supplierName}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
                        .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                        h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; }
                        .meta { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                        th { background: #f8fafc; text-align: left; padding: 12px 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94 a3 b8; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 12px 15px; font-size: 13px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
                        .divergent { color: #f59e0b; }
                        .footer { margin-top: 60px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
                        .sig-line { border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94 a3 b8; text-align: center; }
                        @media print { body { padding: 20px; } .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Conferência de Compra (3-Way Match)</h1>
                        <div class="meta">
                            <div>Fornecedor: ${purchase.supplierName}</div>
                            <div>Pedido: #${purchase.id?.slice(-6).toUpperCase()}</div>
                            <div>Data do Pedido: ${formatToBRDate(purchase.date)}</div>
                            <div>NF: ${invoiceNumber || 'NÃO INFORMADA'}</div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Produto / Descrição</th>
                                <th style="text-align: center">Comprado</th>
                                <th style="text-align: center">Faturado (NF)</th>
                                <th style="text-align: center">Recebido (Físico)</th>
                                <th style="text-align: center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${purchase.items.map(item => {
                                const key = item.productId + (item.variationId || '');
                                const received = scannedItems[key] || 0;
                                const invoiced = invoicedQuantities[key] || 0;
                                const isDivergent = received !== item.quantity || received !== invoiced;
                                return `
                                    <tr>
                                        <td>${item.description}</td>
                                        <td style="text-align: center">${item.quantity}</td>
                                        <td style="text-align: center">${invoiced}</td>
                                        <td style="text-align: center">${received}</td>
                                        <td style="text-align: center; color: ${isDivergent ? '#f59e0b' : '#10b981'}">
                                            ${isDivergent ? 'DIVERGENTE' : 'OK'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="footer">
                        <div class="sig-line">Responsável pela Conferência</div>
                        <div class="sig-line">Data e Hora do Recebimento</div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        }
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedItems = purchase.items.map((item: PurchaseItem) => {
                const key = item.productId + (item.variationId || '');
                return {
                    ...item,
                    receivedQuantity: scannedItems[key] || 0
                };
            });

            const isAllReceived = updatedItems.every((i: PurchaseItem) => (i.receivedQuantity || 0) === i.quantity);
            const isAnyReceived = updatedItems.some((i: PurchaseItem) => (i.receivedQuantity || 0) > 0);
            
            // Check for discrepancies between Order, Invoice and Physical
            const hasDiscrepancy = updatedItems.some((i: PurchaseItem) => {
                const key = i.productId + (i.variationId || '');
                const invoiced = invoicedQuantities[key] || 0;
                const received = scannedItems[key] || 0;
                return received !== i.quantity || received !== invoiced || invoiced !== i.quantity;
            });

            let newStatus = purchase.status;
            let invStatus: 'pending' | 'partially_received' | 'received' = 'pending';

            if (isAllReceived && !hasDiscrepancy) {
                newStatus = 'completed';
                invStatus = 'received';
            } else if (isAnyReceived) {
                invStatus = 'partially_received';
            }

            await updatePurchase(purchase.id!, { 
                items: updatedItems,
                status: newStatus,
                invoiceNumber,
                invoiceDate,
                invoiceStatus: invStatus,
                observation: discrepancyNote ? `${purchase.observation || ''}\n[Divergência: ${discrepancyNote}]` : purchase.observation
            });

            toast.success("Conferência e 3-Way Match registrados! ✨");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar conferência.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">3-Way Match: Conferência de Compra</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mt-1">
                            Pedido #{purchase.id?.slice(-4)} • {purchase.supplierName} • {formatToBRDate(purchase.date)}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handlePrint}
                            className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                            <i className="bi bi-printer"></i>
                            Imprimir
                        </button>
                        <button 
                            onClick={() => setIsScannerOpen(true)}
                            className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                            <i className="bi bi-qr-code-scan"></i>
                            Escanear
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <i className="bi bi-x-lg text-xl"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* NF Info Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número da NF</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="000.000.000"
                                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da NF</label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold font-mono"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nota de Divergência</label>
                            <input
                                type="text"
                                value={discrepancyNote}
                                onChange={(e) => setDiscrepancyNote(e.target.value)}
                                placeholder="Ex: Produto avariado, falta item..."
                                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <div className="col-span-5">Produto</div>
                            <div className="col-span-2 text-center">Pedido</div>
                            <div className="col-span-2 text-center">NF (Faturado)</div>
                            <div className="col-span-3 text-center">Físico (Recebido)</div>
                        </div>

                        {purchase.items.map((item, index) => {
                            const key = item.productId + (item.variationId || '');
                            const received = scannedItems[key] || 0;
                            const invoiced = invoicedQuantities[key] || 0;
                            const isMatch = received === item.quantity && received === invoiced;
                            const hasDivergence = received !== item.quantity || received !== invoiced;
                            
                            return (
                                <div key={index} className={`p-5 rounded-[1.5rem] border transition-all ${isMatch ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10' : hasDivergence ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10' : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50'}`}>
                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-5 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMatch ? 'bg-emerald-100 text-emerald-600' : hasDivergence ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <i className={`bi ${isMatch ? 'bi-check-lg' : hasDivergence ? 'bi-exclamation-triangle' : 'bi-box-seam'} text-lg`}></i>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.description}</h4>
                                                {hasDivergence && (
                                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse uppercase tracking-tighter">Divergência</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-2 text-center text-xs font-black text-slate-400">
                                            {item.quantity}
                                        </div>

                                        <div className="col-span-2 flex justify-center">
                                            <input 
                                                type="number"
                                                value={invoiced}
                                                onChange={(e) => updateInvoicedQty(key, Number(e.target.value))}
                                                className="w-14 h-9 text-center bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="col-span-3 flex justify-center">
                                            <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                                <button 
                                                    onClick={() => updateReceivedQty(key, Math.max(0, received - 1))}
                                                    className="w-10 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all font-black"
                                                >
                                                    <i className="bi bi-dash text-lg"></i>
                                                </button>
                                                <input 
                                                    type="number" 
                                                    value={received}
                                                    onChange={(e) => updateReceivedQty(key, Number(e.target.value))}
                                                    className={`w-12 h-9 text-center bg-transparent border-none outline-none font-black text-xs ${received === invoiced ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}`}
                                                />
                                                <button 
                                                    onClick={() => updateReceivedQty(key, received + 1)}
                                                    className="w-10 h-9 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all font-black"
                                                >
                                                    <i className="bi bi-plus text-lg"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <i className="bi bi-check-lg text-xl"></i>
                        )}
                        Finalizar Conferência e Atualizar Estoque
                    </button>
                </div>
            </div>

            <ErrorBoundary name="Scanner de Recebimento">
                <QRScannerModal 
                    isOpen={isScannerOpen} 
                    onClose={() => setIsScannerOpen(false)} 
                    onScan={handleScan}
                    closeOnScan={false}
                    title="Escanear Itens do Pedido"
                />
            </ErrorBoundary>
        </div>
    );
};

export default PurchaseReceiptCheckModal;
