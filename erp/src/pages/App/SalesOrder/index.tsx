import React, { useState, useRef } from "react";
import OrderHistoryList from "./OrderHistoryList";
import OrderEditModal from "./OrderEditModal";
import NewSaleOrder from "./NewSaleOrder";
import AssistanceOrderModal from "./AssistanceOrderModal";
import NewOrderDropdown from "./NewOrderDropdown";
import BudgetDropdown from "./BudgetDropdown";
import Order, { VisibilitySettings } from "../../types/order.type";
import OrderFilters, { Filters } from "./OrderFilters";
import { OrderHistoryListRef } from "./OrderHistoryList";
import PostOrderActionsModal from "./OrderActions/PostOrderActionsModal";
import ReturnOrderModal from "./OrderActions/ReturnOrderModal";
import OrderDetailsModal from "../DeliverySchedule/OrderDetailsModal";
import { useLocation, useNavigate } from "react-router-dom";

const SalesOrder = () => {
    const [orderModalType, setOrderModalType] = useState<'sale' | 'assistance' | 'budget' | 'return' | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [editingInitialStep, setEditingInitialStep] = useState<number | undefined>(undefined);
    const [editingHighlightTemporary, setEditingHighlightTemporary] = useState<boolean>(false);
    const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
    const [postOrderDetails, setPostOrderDetails] = useState<Order | null>(null);
    const [returningOrder, setReturningOrder] = useState<Order | null>(null);
    const [duplicatingOrder, setDuplicatingOrder] = useState<Order | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isBudgetRoute = location.pathname === '/budgets';
    const isAssistanceRoute = location.pathname === '/assistance-orders';
    const isReturnRoute = location.pathname === '/returns';

    const [filters, setFilters] = useState<Filters>({
        dateRange: { start: "", end: "" },
        dateType: "personalizado" as "personalizado" | "hoje" | "esse_mes" | "mes_passado" | "ultimo_semestre" | "esse_ano",
        customerName: "",
        productName: "",
        status: "",
        orderType: isBudgetRoute ? "budget" : (isAssistanceRoute ? "assistance" : (isReturnRoute ? "return" : "sale")),
        isBudgetView: isBudgetRoute,
        isAssistanceView: isAssistanceRoute,
        isReturnView: isReturnRoute,
        seller: "",
        valueRange: { min: 0, max: 1000000 },
        sortBy: "date" as any,
        sortOrder: "desc" as any,
        multiSort: [{ key: 'date', order: 'desc' }] as { key: string, order: 'asc' | 'desc' }[],
        searchId: ""
    });

    // Sincronizar filtro quando a rota mudar
    React.useEffect(() => {
        setFilters(prev => ({
            ...prev,
            orderType: isBudgetRoute ? "budget" : (isAssistanceRoute ? "assistance" : (isReturnRoute ? "return" : "sale")),
            isBudgetView: isBudgetRoute,
            isAssistanceView: isAssistanceRoute,
            isReturnView: isReturnRoute
        }));
        
        const title = isBudgetRoute ? 'Orçamentos' : (isAssistanceRoute ? 'Assistências' : (isReturnRoute ? 'Devoluções' : 'Pedidos de Venda'));
        document.title = `${title} | Móveis Morante`;
    }, [isBudgetRoute, isAssistanceRoute, isReturnRoute]);

    React.useEffect(() => {
        const saleOrderId = location.state?.saleOrderIdToOpen as string | undefined;
        if (!saleOrderId) return;
        setFilters(prev => ({ ...prev, searchId: saleOrderId }));
        setHighlightOrderId(saleOrderId);
        navigate('/sales-order', { replace: true, state: null });
    }, [location.state, navigate]);

    React.useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const typeParam = queryParams.get('type');
        const newParam = queryParams.get('new');

        if (typeParam === 'budget') {
            setFilters(prev => ({ ...prev, orderType: 'budget' }));
            if (newParam === 'true') {
                setOrderModalType('budget');
            }
        }
    }, [window.location.search]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Legado de lixeira mantido apenas para compatibilidade interna; não há mais acesso na interface.
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
        labels: true,

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

    const handleOrderAction = (key: string, order: Order) => {
        if (key === 'generateReturn') {
            setReturningOrder(order);
        } else if (key === 'duplicateOrder') {
            const { deleted, deletedAt, ...cleanOrder } = order;
            if (cleanOrder.orderType === 'assistance') {
                setDuplicatingOrder({
                    ...cleanOrder,
                    id: undefined,
                    status: 'draft',
                    date: new Date().toISOString()
                });
            } else {
                const duplicated = {
                    ...cleanOrder,
                    id: undefined,
                    status: 'draft' as const,
                    date: new Date().toISOString()
                };
                sessionStorage.setItem("pdv_duplicate_order", JSON.stringify(duplicated));
                navigate(`/sales-order/new?type=${cleanOrder.orderType || 'sale'}&duplicate=true`);
            }
        } else if (key === 'generateSaleFromBudget') {
            const { deleted, deletedAt, ...cleanOrder } = order;
            const duplicated = {
                ...cleanOrder,
                id: undefined,
                status: 'draft' as const,
                orderType: 'sale' as const,
                date: new Date().toISOString()
            };
            sessionStorage.setItem("pdv_duplicate_order", JSON.stringify(duplicated));
            navigate(`/sales-order/new?type=sale&duplicate=true`);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 relative pb-16">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 p-2 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Title (escondido em telas pequenas para economizar espaço) */}
                        <div className="min-w-0 hidden lg:block">
                            <h1 className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-all leading-tight">
                                {isBudgetRoute ? 'Orçamentos' : (isAssistanceRoute ? 'Assistências' : (isReturnRoute ? 'Devoluções' : 'Pedidos de Venda'))}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] mt-0.5 hidden lg:block">
                                {isBudgetRoute ? 'Gestão de Propostas e Orçamentos' : (isAssistanceRoute ? 'Atendimento Técnico e Manutenção' : (isReturnRoute ? 'Controle de Devoluções e Estornos' : 'Gestão de Vendas e Fluxo de Pedidos'))}
                            </p>
                        </div>

                        {/* Top Control Bar on Mobile & Desktop */}
                        <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-wrap sm:flex-nowrap">
                            {/* Action Buttons Group */}
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                                {/* Visualizacao Dropdown */}
                                {!isReturnRoute && <div className="relative hidden lg:block">
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider active:scale-95 ${
                                            showSettings
                                                ? 'border-blue-300 text-blue-600 dark:border-blue-800'
                                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                                        }`}
                                        title="Visualização"
                                    >
                                        <i className={`bi ${showSettings ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-sm`}></i>
                                        <span>Visualização</span>
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
                                                        { key: 'labels', label: 'Rótulos' },
                                                        { key: 'status', label: 'Status' },
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
                                </div>}

                                {/* Filtros: exibidos antes da criação e alinhados à direita em telas menores. */}
                                {!isReturnRoute && <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className={`min-[1701px]:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-widest border ${isSidebarOpen
                                        ? 'bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30'
                                        : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                                        }`}
                                    title="Filtros"
                                >
                                    <i className={`bi ${isSidebarOpen ? 'bi-funnel-fill' : 'bi-funnel'} text-sm`}></i>
                                    <span>Filtros</span>
                                </button>}

                                {/* Main Create Button */}
                                {isBudgetRoute && (
                                    <button
                                        onClick={() => setOrderModalType('budget')}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        <i className="bi bi-plus-lg text-sm" />
                                        <span>Novo Orçamento</span>
                                    </button>
                                )}
                                {isAssistanceRoute && (
                                    <button
                                        onClick={() => setOrderModalType('assistance')}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-orange-500/20 transition-all active:scale-95"
                                    >
                                        <i className="bi bi-tools text-sm" />
                                        <span>Nova Assistência</span>
                                    </button>
                                )}
                                {isReturnRoute && (
                                    <button
                                        onClick={() => setOrderModalType('return')}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-amber-500/20 transition-all active:scale-95"
                                    >
                                        <i className="bi bi-arrow-return-left text-sm" />
                                        <span>Nova devolução sem venda vinculada</span>
                                    </button>
                                )}
                                {!isBudgetRoute && !isAssistanceRoute && !isReturnRoute && (
                                    <button
                                        onClick={() => setOrderModalType('sale')}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                                    >
                                        <i className="bi bi-plus-lg text-sm" />
                                        <span>Nova Venda</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 flex-1">
                    <div className="bg-transparent transition-colors flex-1 flex flex-col overflow-visible">
                        <div className="flex flex-1 min-w-0 gap-4 items-start">
                            {!isReturnRoute && <div className={`transition-all duration-300 ease-in-out border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 fixed inset-0 lg:relative lg:inset-auto z-50 h-full rounded-2xl ${isSidebarOpen ? 'w-full lg:w-80 shadow-2xl lg:shadow-none' : 'w-0 opacity-0 overflow-hidden border-none'} min-[1701px]:!sticky min-[1701px]:!top-20 min-[1701px]:!inset-auto min-[1701px]:!z-auto min-[1701px]:!w-80 min-[1701px]:!opacity-100 min-[1701px]:!overflow-hidden min-[1701px]:!border min-[1701px]:!shadow-none min-[1701px]:!shrink-0`}>
                                <div className="lg:hidden flex justify-end p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2">
                                        <i className="bi bi-x-lg text-xl" />
                                    </button>
                                </div>
                                <OrderFilters filters={filters} setFilters={setFilters} />
                            </div>}
                            {!isReturnRoute && isSidebarOpen && <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

                            <div className="flex-1 min-w-0 flex flex-col">
                                <OrderHistoryList
                                    onEdit={(order, initialStep, highlightTemporary) => {
                                        setEditingInitialStep(initialStep);
                                        setEditingHighlightTemporary(!!highlightTemporary);
                                        setEditingOrder(order);
                                    }}
                                    onViewDetails={setDetailsOrder}
                                    filters={activeFilters}
                                    visibilitySettings={visibilitySettings}
                                    onToggleColumn={toggleVisibility}
                                    onSort={handleSort}
                                    highlightOrderId={highlightOrderId}
                                    ref={orderListRef}
                                    onFilterByOrderId={(id) => setFilters(prev => ({ ...prev, searchId: id }))}
                                    onAction={handleOrderAction}
                                    onShowPostSaleActions={setPostOrderDetails}
                                />
                            </div>
                        </div>
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
                                    onEdit={(order, initialStep, highlightTemporary) => {
                                        setEditingInitialStep(initialStep);
                                        setEditingHighlightTemporary(!!highlightTemporary);
                                        setEditingOrder(order);
                                    }}
                                    filters={trashFilters}
                                    visibilitySettings={visibilitySettings}
                                    onToggleColumn={toggleVisibility}
                                    onSort={handleSort}
                                    highlightOrderId={highlightOrderId}
                                    ref={trashListRef}
                                    onFilterByOrderId={(id) => setFilters(prev => ({ ...prev, searchId: id }))}
                                    onAction={handleOrderAction}
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
                                    onEdit={(order) => {
                                        if (order.orderType === 'assistance') {
                                            setEditingOrder(order);
                                        } else {
                                            setEditingOrder(order);
                                        }
                                    }}
                                    filters={draftFilters}
                                    visibilitySettings={visibilitySettings}
                                    onToggleColumn={toggleVisibility}
                                    onSort={handleSort}
                                    highlightOrderId={highlightOrderId}
                                    ref={draftsListRef}
                                    onFilterByOrderId={(id) => setFilters(prev => ({ ...prev, searchId: id }))}
                                    onAction={handleOrderAction}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {orderModalType && orderModalType !== 'assistance' && (
                <NewSaleOrder
                    orderType={orderModalType}
                    onClose={() => {
                        setOrderModalType(null);
                        orderListRef.current?.refresh();
                        draftsListRef.current?.refresh();
                    }}
                    onSaveSuccess={(id, order) => {
                        setOrderModalType(null);
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            // Ao concluir/salvar o formulário, abre o modal de tarefas pós-venda se for venda (sale)
                            if (order && order.orderType === 'sale') {
                                setPostOrderDetails(order);
                            }
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {orderModalType === 'assistance' && (
                <AssistanceOrderModal
                    onClose={() => {
                        setOrderModalType(null);
                        orderListRef.current?.refresh();
                        draftsListRef.current?.refresh();
                    }}
                    onSaveSuccess={(id, order) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            if (order) setPostOrderDetails(order);
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {editingOrder && editingOrder.orderType !== 'assistance' && (
                <OrderEditModal
                    order={editingOrder}
                    orderId={editingOrder.id}
                    initialStep={editingInitialStep}
                    highlightTemporaryItems={editingHighlightTemporary}
                    onClose={() => {
                        setEditingOrder(null);
                        setEditingInitialStep(undefined);
                        setEditingHighlightTemporary(false);
                        orderListRef.current?.refresh();
                        draftsListRef.current?.refresh();
                    }}
                    onSaveSuccess={(id, order) => {
                        setEditingOrder(null);
                        setEditingInitialStep(undefined);
                        setEditingHighlightTemporary(false);
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            // Abre o modal de tarefas pós-venda se for venda
                            if (order && order.orderType === 'sale') {
                                setPostOrderDetails(order);
                            }
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {editingOrder && editingOrder.orderType === 'assistance' && (
                <AssistanceOrderModal
                    order={editingOrder}
                    onClose={() => {
                        setEditingOrder(null);
                        orderListRef.current?.refresh();
                        draftsListRef.current?.refresh();
                    }}
                    onSaveSuccess={(id, order) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            if (order) setPostOrderDetails(order);
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {duplicatingOrder && duplicatingOrder.orderType === 'assistance' && (
                <AssistanceOrderModal
                    order={duplicatingOrder}
                    onClose={() => {
                        setDuplicatingOrder(null);
                        orderListRef.current?.refresh();
                        draftsListRef.current?.refresh();
                    }}
                    onSaveSuccess={(id, order) => {
                        if (id) {
                            setHighlightOrderId(id);
                            orderListRef.current?.refresh();
                            draftsListRef.current?.refresh();
                            if (order) setPostOrderDetails(order);
                            setTimeout(() => setHighlightOrderId(null), 5000);
                        }
                    }}
                />
            )}

            {postOrderDetails && (
                <PostOrderActionsModal 
                    order={postOrderDetails} 
                    onClose={() => setPostOrderDetails(null)} 
                />
            )}

            {detailsOrder && (
                <OrderDetailsModal
                    order={detailsOrder}
                    isReadOnly
                    onClose={() => setDetailsOrder(null)}
                />
            )}

            {returningOrder && (
                <ReturnOrderModal
                    order={returningOrder}
                    onClose={() => setReturningOrder(null)}
                    onSuccess={(newId) => {
                        setReturningOrder(null);
                        orderListRef.current?.refresh();
                        // Redirect or show return OS? 
                        // For now just refresh
                    }}
                />
            )}

        </div>
    );
};

export default SalesOrder;
