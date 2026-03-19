import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import OrderHistoryList from "./OrderHistoryList";
import OrderEditModal from "./OrderEditModal";
import NewSaleOrder from "./NewSaleOrder";
import AssistanceOrderModal from "./AssistanceOrderModal";
import NewOrderDropdown from "./NewOrderDropdown";
import Order, { VisibilitySettings } from "../../types/order.type";
import OrderFilters, { Filters } from "./OrderFilters";
import { OrderHistoryListRef } from "./OrderHistoryList";

const SalesOrder = () => {
    const [orderModalType, setOrderModalType] = useState<'sale' | 'pickup' | 'assistance' | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [filters, setFilters] = useState<Filters>({
        dateRange: { start: "", end: "" },
        dateType: "personalizado" as "personalizado" | "hoje" | "esse_mes" | "mes_passado" | "ultimo_semestre" | "esse_ano",
        customerName: "",
        productName: "",
        status: "",
        orderType: "",
        seller: "",
        valueRange: { min: 0, max: 1000000 },
        sortBy: "date" as any, // Legacy field
        sortOrder: "desc" as any, // Legacy field
        multiSort: [{ key: 'date', order: 'desc' }] as { key: string, order: 'asc' | 'desc' }[]
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isDraftsOpen, setIsDraftsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
    const orderListRef = useRef<OrderHistoryListRef>(null);
    const trashListRef = useRef<OrderHistoryListRef>(null);
    const draftsListRef = useRef<OrderHistoryListRef>(null);
    const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
        id: true,
        orderDate: true,
        deliveryDate: true,
        customer: true,
        totalValue: true,
        status: true,
        orderType: true,

        actions: true,
    });

    const toggleVisibility = (column: keyof VisibilitySettings) => {
        setVisibilitySettings(prev => ({ ...prev, [column]: !prev[column] }));
    };

    const handleSort = (key: string, order: 'asc' | 'desc', isMulti: boolean = false) => {
        setFilters(prev => {
            let newMultiSort = [...prev.multiSort];

            if (isMulti) {
                // If column already in list, update its order
                const existingIdx = newMultiSort.findIndex(s => s.key === key);
                if (existingIdx !== -1) {
                    newMultiSort[existingIdx] = { key, order };
                } else {
                    newMultiSort.push({ key, order });
                }
            } else {
                // Single sort: replace all with just this one
                newMultiSort = [{ key, order }];
            }

            return {
                ...prev,
                sortBy: key as any,
                sortOrder: order,
                multiSort: newMultiSort
            };
        });
    };

    const activeFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: false }), [filters]);
    const trashFilters = React.useMemo(() => ({ ...filters, showTrash: true, isDraft: false }), [filters]);
    const draftFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: true }), [filters]);

    return (
        <div className="flex -m-4 xl:-m-8 h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
            {/* Sidebar for Filters */}
            <div className={`transition-all duration-300 ease-in-out border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 absolute md:relative z-30 h-full ${isSidebarOpen ? 'w-[calc(100vw-32px)] md:w-80 shadow-2xl md:shadow-none' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                <div className="md:hidden flex justify-end p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>
                <OrderFilters filters={filters} setFilters={setFilters} />
            </div>
            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div className="md:hidden fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 p-4 md:p-10">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-4 xl:gap-0">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Pedidos de Venda
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                                Gestão de Vendas e Fluxo de Pedidos
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Link
                            to="/app/configuracoes"
                            className="flex items-center justify-center p-3 xl:p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                            title="Configurar Campos Obrigatórios"
                        >
                            <i className="bi bi-gear-fill text-lg xl:text-xl" />
                        </Link>
                        <NewOrderDropdown onSelect={(type) => setOrderModalType(type)} />
                    </div>
                </div>

                <div className="flex flex-col gap-6 flex-1 min-h-0">
                    {/* Header Actions Container - Invisible with space-between */}
                    <div className="flex justify-between items-center px-2">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${isSidebarOpen
                                    ? 'bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30'
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                                    }`}
                                title="Mostrar ou esconder filtros da lateral"
                            >
                                <i className={`bi ${isSidebarOpen ? 'bi-funnel-fill' : 'bi-funnel'}`}></i>
                                Filtros
                            </button>

                            <button
                                onClick={() => setIsTrashOpen(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500`}
                                title="Ver pedidos que foram para a lixeira"
                            >
                                <i className="bi bi-trash3"></i>
                                Lixeira
                            </button>

                            <button
                                onClick={() => setIsDraftsOpen(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-500`}
                                title="Ver pedidos rascunhos"
                            >
                                <i className="bi bi-pencil-square"></i>
                                Rascunhos
                            </button>


                            <Link
                                to="/delivery-schedule"
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 hover:border-emerald-300 hover:bg-emerald-100 dark:hover:border-emerald-700`}
                                title="Acessar o Cronograma Logístico"
                            >
                                <i className="bi bi-calendar3"></i>
                                Cronograma
                            </Link>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest ${showSettings
                                    ? 'border-blue-200 text-blue-600 dark:border-blue-800'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                title="Personalizar quais colunas aparecem na tabela abaixo"
                            >
                                <i className={`bi ${showSettings ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                                Visualização
                            </button>

                            {showSettings && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                                    <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-slide-up">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Colunas da Tabela</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { key: 'id', label: 'ID do Pedido' },
                                                { key: 'orderDate', label: 'Data do Pedido' },
                                                { key: 'deliveryDate', label: 'Data de Entrega' },
                                                { key: 'customer', label: 'Cliente' },
                                                { key: 'totalValue', label: 'Valor Total' },
                                                { key: 'status', label: 'Status' },
                                                { key: 'orderType', label: 'Tipo de Pedido' },

                                                { key: 'actions', label: 'Ações' },
                                            ].map((col) => (
                                                <button
                                                    key={col.key}
                                                    onClick={() => toggleVisibility(col.key as keyof VisibilitySettings)}
                                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all group outline-none"
                                                >
                                                    <span className={`text-[11px] font-bold ${visibilitySettings[col.key as keyof VisibilitySettings] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'}`}>
                                                        {col.label}
                                                    </span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${visibilitySettings[col.key as keyof VisibilitySettings] ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                        <div className={`w-3 h-3 bg-white dark:bg-slate-300 rounded-full transition-transform ${visibilitySettings[col.key as keyof VisibilitySettings] ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none md:shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors flex-1 flex flex-col min-h-0">
                        <OrderHistoryList
                            onEdit={setEditingOrder}
                            filters={activeFilters}
                            visibilitySettings={visibilitySettings}
                            onToggleColumn={toggleVisibility}
                            onSort={handleSort}
                            highlightOrderId={highlightOrderId}
                            ref={orderListRef}
                        />
                    </div>
                </div>
            </div>

            {/* Trash Modal */}
            {isTrashOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-900/50 backdrop-blur-md animate-fade-in"
                    onClick={() => setIsTrashOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-8 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
                            <div className="flex items-center gap-5">
                                <div className="bg-red-600 p-3 rounded-2xl shadow-xl shadow-red-100 dark:shadow-red-900/20">
                                    <i className="bi bi-trash3-fill text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Lixeira de Pedidos</h2>
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                                        Gerencie pedidos excluídos, restaure-os ou exclua permanentemente.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTrashOpen(false)}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-2xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95"
                            >
                                <i className="bi bi-x-lg text-xl" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950">
                            <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none overflow-visible md:overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors">
                                <OrderHistoryList
                                    onEdit={setEditingOrder}
                                    filters={trashFilters}
                                    visibilitySettings={visibilitySettings}
                                    onToggleColumn={toggleVisibility}
                                    onSort={handleSort}
                                    highlightOrderId={highlightOrderId}
                                    ref={trashListRef}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Drafts Modal */}
            {isDraftsOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-900/50 backdrop-blur-md animate-fade-in"
                    onClick={() => setIsDraftsOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-8 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
                            <div className="flex items-center gap-5">
                                <div className="bg-amber-500 p-3 rounded-2xl shadow-xl shadow-amber-100 dark:shadow-amber-900/20">
                                    <i className="bi bi-pencil-square text-white text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Rascunhos de Pedidos</h2>
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                                        Pedidos iniciados mas não finalizados.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDraftsOpen(false)}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 rounded-2xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95"
                            >
                                <i className="bi bi-x-lg text-xl" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950">
                            <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none overflow-visible md:overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors">
                                <OrderHistoryList
                                    onEdit={setEditingOrder}
                                    filters={draftFilters}
                                    visibilitySettings={visibilitySettings}
                                    onToggleColumn={toggleVisibility}
                                    onSort={handleSort}
                                    highlightOrderId={highlightOrderId}
                                    ref={draftsListRef}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {(orderModalType === 'sale' || orderModalType === 'pickup') && (
                <NewSaleOrder
                    initialDeliveryMethod={orderModalType === 'pickup' ? 'pickup' : 'delivery'}
                    onClose={() => setOrderModalType(null)}
                    onSaveSuccess={(id) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {orderModalType === 'assistance' && (
                <AssistanceOrderModal
                    onClose={() => setOrderModalType(null)}
                    onSaveSuccess={(id) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {editingOrder && editingOrder.orderType === 'assistance' ? (
                <AssistanceOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSaveSuccess={(id) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            ) : editingOrder ? (
                <OrderEditModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSaveSuccess={(id) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            trashListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            ) : null}
        </div>
    );
};

export default SalesOrder;