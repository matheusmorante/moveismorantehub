import React, { useState, useMemo } from "react";
import Order from "../../types/order.type";
import { formatCurrency, formatToBRDate } from "../../utils/formatters";

interface OrderSelectionModalProps {
    orders: Order[];
    onSelect: (order: Order) => void;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

const OrderSelectionModal = ({ orders, onSelect, onClose, title = "Selecionar Pedido Original", subtitle = "Busque a venda que originou a assistência" }: OrderSelectionModalProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<"id" | "date" | "customer">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => 
                o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                let comparison = 0;
                if (sortField === "id") comparison = (a.id || "").localeCompare(b.id || "");
                else if (sortField === "date") comparison = (a.date || "").localeCompare(b.date || "");
                else if (sortField === "customer") comparison = (a.customerData?.fullName || "").localeCompare(b.customerData?.fullName || "");
                
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [orders, searchTerm, sortField, sortOrder]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800" style={{ height: '90vh', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">{subtitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-4">
                    <div className="relative flex-1 group">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por Código ou Nome do Cliente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto custom-scrollbar p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("id")}>
                                    ID {sortField === "id" && <i className={`bi bi-sort-${sortOrder === "asc" ? "up" : "down"}`} />}
                                </th>
                                <th className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("date")}>
                                    Data {sortField === "date" && <i className={`bi bi-sort-${sortOrder === "asc" ? "up" : "down"}`} />}
                                </th>
                                <th className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("customer")}>
                                    Cliente {sortField === "customer" && <i className={`bi bi-sort-${sortOrder === "asc" ? "up" : "down"}`} />}
                                </th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(o => (
                                    <tr key={o.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                                        <td className="px-4 py-4 text-xs font-mono font-bold text-slate-500">#{o.id}</td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{formatToBRDate(o.date)}</td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">{o.customerData?.fullName}</td>
                                        <td className="px-4 py-4 text-xs font-black text-blue-600 dark:text-blue-400 text-right">
                                            {formatCurrency(o.paymentsSummary?.totalOrderValue || 0)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => onSelect(o)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                                            >
                                                Selecionar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic">Nenhum pedido encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrderSelectionModal;
