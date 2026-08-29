import React from 'react';
import { createPortal } from 'react-dom';
import Purchase from '../../../../types/purchase.type';
import { formatCurrency, formatToBRDate } from '../../../../utils/formatters';
import { toast } from 'react-toastify';

interface PurchaseDetailsModalProps {
    isOpen: boolean;
    purchase: Purchase | null;
    onClose: () => void;
    onEdit?: (purchase: Purchase) => void;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
    isOpen,
    purchase,
    onClose,
    onEdit
}) => {
    if (!isOpen || !purchase) return null;

    const totalQuantity = purchase.items.reduce((acc, item) => acc + (item.quantity || 0), 0);

    const handleCopyFiscalKey = () => {
        if (purchase.fiscalKey) {
            navigator.clipboard.writeText(purchase.fiscalKey);
            toast.success("Chave de Acesso copiada para a área de transferência!");
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const content = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Pedido de Compra #${purchase.id?.slice(-6).toUpperCase()}</title>
                    <style>
                        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; margin: 0; }
                        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
                        h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; }
                        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 13px; }
                        .meta-item { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                        .meta-value { font-size: 14px; font-weight: 700; color: #1e293b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                        th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #cbd5e1; }
                        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .total-card { margin-top: 24px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; text-align: right; font-size: 16px; font-weight: 900; color: #1e40af; }
                        @media print { body { padding: 15px; } .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Pedido de Compra</h1>
                            <div style="font-size: 12px; font-weight: 700; color: #64748b;">MÓVEIS MORANTE HUB • CÓDIGO: #${purchase.id?.slice(-6).toUpperCase()}</div>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">
                            <div>Data: <strong>${formatToBRDate(purchase.date)}</strong></div>
                            <div>Status: <strong>${purchase.status.toUpperCase()}</strong></div>
                        </div>
                    </div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <div class="meta-label">Fornecedor</div>
                            <div class="meta-value">${purchase.supplierName}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Nota Fiscal / Chave</div>
                            <div class="meta-value">${purchase.invoiceNumber || 'Não informada'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th class="text-center">Qtd. Pedida</th>
                                <th class="text-center">Qtd. Recebida</th>
                                <th class="text-right">Custo Unitário</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${purchase.items.map(item => `
                                <tr>
                                    <td><strong>${item.description}</strong></td>
                                    <td class="text-center">${item.quantity} un</td>
                                    <td class="text-center">${item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '-'}</td>
                                    <td class="text-right">${formatCurrency(item.unitCost)}</td>
                                    <td class="text-right">${formatCurrency(item.totalCost || (item.quantity * item.unitCost))}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="total-card">
                        VALOR TOTAL DO PEDIDO: ${formatCurrency(purchase.totalValue)}
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-0 xl:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
                onClick={onClose} 
            />

            {/* Modal Container */}
            <div className="relative bg-white dark:bg-slate-900 w-full h-full xl:h-auto xl:max-h-[90vh] xl:max-w-5xl rounded-none xl:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 xl:border border-slate-100 dark:border-slate-800 transition-all">
                
                {/* Header */}
                <div className="p-5 sm:p-6 xl:p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-lg">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                            <i className="bi bi-box-seam text-2xl"></i>
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl xl:text-2xl font-black tracking-tight uppercase">
                                    Pedido de Compra #{purchase.id?.slice(-4)}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    purchase.status === 'fulfilled' ? 'bg-emerald-500 text-white' :
                                    purchase.status === 'ordered' ? 'bg-blue-200 text-blue-900' :
                                    'bg-red-500 text-white'
                                }`}>
                                    {purchase.status === 'fulfilled' ? 'Atendido' : 
                                     purchase.status === 'ordered' ? 'Em Ordem' : 
                                     'Cancelado'}
                                </span>
                                {purchase.stockProcessed && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 flex items-center gap-1">
                                        <i className="bi bi-check-circle-fill text-xs" /> Estoque Lançado
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-blue-100 mt-1 flex items-center gap-2 flex-wrap">
                                <span><i className="bi bi-building mr-1" />{purchase.supplierName}</span>
                                <span>•</span>
                                <span><i className="bi bi-calendar3 mr-1" />{formatToBRDate(purchase.date)}</span>
                            </p>
                        </div>
                    </div>

                    {/* Actions Header */}
                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(purchase)}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95"
                                title="Editar Informações do Pedido"
                            >
                                <i className="bi bi-pencil-square text-sm"></i>
                                <span className="hidden md:inline">Editar</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95"
                            title="Imprimir / Exportar Pedido"
                        >
                            <i className="bi bi-printer text-sm"></i>
                        </button>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                        >
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 xl:p-8 custom-scrollbar space-y-6">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Total</p>
                            <p className="text-xl xl:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                                {formatCurrency(purchase.totalValue)}
                            </p>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Itens / Volumes</p>
                            <p className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                                {purchase.items.length} itens <span className="text-xs font-semibold text-slate-400">({totalQuantity} un)</span>
                            </p>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IPI & Frete</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1.5">
                                IPI: <span className="font-extrabold">{purchase.ipiPercent || 0}%</span> • Frete: <span className="font-extrabold">{purchase.freightPercent || 0}%</span>
                            </p>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status da Entrada</p>
                            <p className={`text-xs font-black uppercase mt-1.5 ${
                                purchase.stockProcessed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                                {purchase.stockProcessed ? 'Estoque Integrado' : 'Aguardando Lançamento'}
                            </p>
                        </div>
                    </div>

                    {/* Itens List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <i className="bi bi-list-task text-blue-500" />
                            Itens do Pedido ({purchase.items.length})
                        </h3>

                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-800/20">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-5 py-3">Produto</th>
                                        <th className="px-5 py-3 text-center">Qtd. Pedida</th>
                                        <th className="px-5 py-3 text-center">Qtd. Recebida</th>
                                        <th className="px-5 py-3 text-right">Custo Unitário</th>
                                        <th className="px-5 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                                    {purchase.items.map((item, index) => {
                                        const unitCost = item.unitCost || 0;
                                        const lineTotal = item.totalCost || (item.quantity * unitCost);
                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-bold text-slate-900 dark:text-white">{item.description}</p>
                                                    {item.baseCost && item.baseCost !== item.unitCost && (
                                                        <p className="text-[10px] text-slate-400 font-normal">Base: {formatCurrency(item.baseCost)}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center font-bold">{item.quantity} un</td>
                                                <td className="px-5 py-3.5 text-center font-bold text-blue-600 dark:text-blue-400">
                                                    {item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '-'}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">{formatCurrency(unitCost)}</td>
                                                <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Fiscal & Observation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nota Fiscal & Chave */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <i className="bi bi-file-earmark-text text-blue-500" />
                                Informações Fiscais
                            </h4>
                            
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Número da NF</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {purchase.invoiceNumber || 'Não informada'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Chave de Acesso (44 dígitos)</span>
                                    {purchase.fiscalKey ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 select-all">
                                                {purchase.fiscalKey}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyFiscalKey}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                                                title="Copiar Chave"
                                            >
                                                <i className="bi bi-clipboard" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">Nenhuma chave cadastrada</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Observações & Anexos */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <i className="bi bi-chat-left-text text-blue-500" />
                                Observações & Anexos
                            </h4>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Observação</span>
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                                        {purchase.observation || 'Nenhuma observação registrada.'}
                                    </p>
                                </div>

                                {purchase.attachments && purchase.attachments.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Arquivos Anexados ({purchase.attachments.length})</span>
                                        <div className="flex flex-wrap gap-2">
                                            {purchase.attachments.map((url, i) => (
                                                <a
                                                    key={i}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-blue-600 hover:text-blue-700 shadow-sm transition-all"
                                                >
                                                    <i className="bi bi-paperclip" />
                                                    <span>Anexo {i + 1}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs uppercase tracking-widest"
                    >
                        Fechar
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(purchase)}
                                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                            >
                                <i className="bi bi-pencil-square" />
                                <span>Editar Compra</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default PurchaseDetailsModal;
