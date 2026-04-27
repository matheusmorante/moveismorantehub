import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useDeliverySchedule, ScheduleFilter, OrderTypeFilter } from "./useDeliverySchedule";
import OrderDetailsModal from "./OrderDetailsModal";
import DeliveryMap from "./DeliveryMap";
import ScheduleCardView from "./ScheduleCardView/Index";
import ScheduleTableView from "./ScheduleTableView/Index";
import ShowroomAssemblyModal from "./ShowroomAssemblyModal";
import OrderEditModal from "../SalesOrder/OrderEditModal";

const DeliverySchedule = () => {
    const {
        schedule,
        loading,
        viewMode: hookViewMode,
        setViewMode: setHookViewMode,
        filter,
        setFilter,
        scheduleType,
        setScheduleType,
        typeFilter,
        setTypeFilter,
        selectedOrder,
        openOrderDetails,
        closeOrderDetails,
        handleShare,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
    } = useDeliverySchedule();

    const [viewMode, setViewMode] = useState<"card" | "table" | "map">("table");
    const [showShowroomModal, setShowShowroomModal] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<any>(null);
    const hasInitialScrolled = React.useRef(false);
    const { state } = useLocation();

    useEffect(() => {
        if (state?.view === 'map') {
            setViewMode('map');
        }
    }, [state]);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const location = useLocation();
    const isStandalone = location.pathname.includes("/schedule") && !location.pathname.includes("/delivery-schedule");

    const filters: { id: ScheduleFilter; label: string; icon: string }[] = [
        { id: 'custom', label: 'Personalizado', icon: 'bi-calendar-range' },
        { id: 'default', label: 'Ontem e Seguintes', icon: 'bi-calendar-check' },
        { id: 'week', label: 'Esta Semana', icon: 'bi-calendar3-range' },
        { id: 'month', label: 'Este Mês', icon: 'bi-calendar-month' },
        { id: 'year', label: 'Este Ano', icon: 'bi-calendar3' },
    ];

    const typeFilters: { id: OrderTypeFilter; label: string; icon: string; color: string }[] = [
        { id: 'delivery', label: 'Entregas', icon: 'bi-truck', color: 'emerald' },
        { id: 'pickup', label: 'Retiradas', icon: 'bi-hand-index-thumb-fill', color: 'purple' },
        { id: 'assistance', label: 'Assistência', icon: 'bi-tools', color: 'orange' },
    ];

    const activeFilterLabel = filters.find(f => f.id === filter)?.label ?? '';
    const hasActiveFilters = filter !== 'default' || typeFilter.length !== 3; // Now 3 types: delivery, pickup, assistance

    /** Sidebar drawer – shown on mobile */
    const FilterSidebar = () => (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
                onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-left border-l border-slate-100 dark:border-slate-800">
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <i className="bi bi-sliders text-blue-600 dark:text-blue-400 text-lg" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Filtros</h3>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cronograma Logístico</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Period filter */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <i className="bi bi-calendar3" /> Período
                        </p>
                        <div className="flex flex-col gap-2">
                            {filters.map(f => (
                                <div key={f.id} className="flex flex-col gap-2">
                                    <button
                                        onClick={() => { setFilter(f.id); if (f.id !== 'custom') setSidebarOpen(false); }}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${filter === f.id
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <i className={`bi ${f.icon} text-base`} />
                                        {f.label}
                                    </button>
                                    
                                    {f.id === 'custom' && filter === 'custom' && (
                                        <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-slide-up">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">De:</label>
                                                <input 
                                                    type="date" 
                                                    value={startDate} 
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Até:</label>
                                                <input 
                                                    type="date" 
                                                    value={endDate} 
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Type filter */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <i className="bi bi-tag-fill" /> Tipo de Pedido
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {typeFilters.map(tf => {
                                const isActive = typeFilter.includes(tf.id);
                                return (
                                <button
                                    key={tf.id}
                                    onClick={() => {
                                        if (isActive) setTypeFilter(typeFilter.filter(t => t !== tf.id));
                                        else setTypeFilter([...typeFilter, tf.id]);
                                    }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${isActive
                                            ? `bg-${tf.color}-500 text-white shadow-lg shadow-${tf.color}-200 dark:shadow-${tf.color}-900/30`
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <i className={`bi ${tf.icon} text-base`} />
                                        {tf.label}
                                    </div>
                                    <i className={`bi ${isActive ? 'bi-check-circle-fill' : 'bi-circle'} text-lg`} />
                                </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <i className="bi bi-layout-text-sidebar" /> Visualização
                        </p>
                        <button
                            onClick={() => {
                                if (viewMode === 'table') setViewMode('card');
                                else if (viewMode === 'card') setViewMode('map');
                                else setViewMode('table');
                            }}
                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <i className={`bi ${viewMode === 'table' ? 'bi-table' : viewMode === 'card' ? 'bi-grid-fill' : 'bi-map-fill'} text-blue-600 dark:text-blue-400 text-lg`} />
                                <span>{viewMode === 'table' ? 'Tabela' : viewMode === 'card' ? 'Grade' : 'Mapa'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-[9px] uppercase tracking-widest font-bold">Alternar</span>
                                <i className="bi bi-arrow-repeat text-base" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Drawer footer */}
                {hasActiveFilters && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => { setFilter('default'); setTypeFilter(['delivery', 'pickup', 'assistance']); setSidebarOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                        >
                            <i className="bi bi-x-circle-fill" />
                            Limpar Filtros
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    const renderHeader = () => (
        <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 ${viewMode === 'table' ? 'px-4 sm:px-6' : ''} ${isStandalone ? 'bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300' : ''}`}>
            <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-100 dark:shadow-blue-900/20 transition-all duration-500">
                    <i className="bi bi-truck text-white text-2xl" />
                </div>
                <div className="flex-1">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                        Cronograma Logístico
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-2">
                        {isStandalone ? "Visualização em Tempo Real" : "Gestão Logística v2.0"}
                    </p>
                </div>



                {/* Mobile: Filter button */}
                <div className="flex items-center gap-2 lg:hidden">
                    <button
                        onClick={() => {
                            if (viewMode === 'table') setViewMode('card');
                            else if (viewMode === 'card') setViewMode('map');
                            else setViewMode('table');
                        }}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm active:scale-95 transition-all"
                        title="Alternar Visualização"
                    >
                        <i className={`bi ${viewMode === 'table' ? 'bi-table' : viewMode === 'card' ? 'bi-grid-fill' : 'bi-map-fill'} text-lg`} />
                    </button>

                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="relative flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <i className="bi bi-tools text-blue-500" />
                        <span className="hidden sm:inline text-[11px] uppercase tracking-widest">Filtros</span>
                        {hasActiveFilters && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-white text-[8px] font-black flex items-center justify-center">
                                !
                            </span>
                        )}
                    </button>
                </div>


                {/* Desktop: Checkbox Filters (Outside sidebar) */}
                <div className="hidden lg:flex items-center gap-3 ml-8 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-700/50">
                    {typeFilters.map(tf => {
                        const isActive = typeFilter.includes(tf.id);
                        return (
                            <button
                                key={tf.id}
                                onClick={() => {
                                    if (isActive) setTypeFilter(typeFilter.filter(t => t !== tf.id));
                                    else setTypeFilter([...typeFilter, tf.id]);
                                }}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive 
                                    ? `bg-white dark:bg-slate-700 text-${tf.color === 'emerald' ? 'emerald' : tf.color}-600 dark:text-${tf.color === 'emerald' ? 'emerald' : tf.color}-400 shadow-premium-sm border border-${tf.color === 'emerald' ? 'emerald' : tf.color}-100 dark:border-${tf.color === 'emerald' ? 'emerald' : tf.color}-900/30` 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                <i className={`bi ${isActive ? 'bi-check-square-fill' : 'bi-square'} text-sm`} />
                                {tf.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="hidden lg:flex flex-wrap items-center gap-4 w-full xl:w-auto">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="relative flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all active:scale-95 group"
                >
                    <i className="bi bi-tools text-blue-500 group-hover:rotate-12 transition-transform" />
                    Filtros do Cronograma
                    {hasActiveFilters && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    )}
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden xl:block" />

                <button
                    onClick={() => {
                        if (viewMode === 'table') setViewMode('card');
                        else if (viewMode === 'card') setViewMode('map');
                        else setViewMode('table');
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-premium-sm transition-all group"
                >
                    <i className={`bi ${viewMode === 'table' ? 'bi-table' : viewMode === 'card' ? 'bi-grid-fill' : 'bi-map-fill'} text-blue-600 dark:text-blue-400 text-base group-hover:rotate-12 transition-transform`} />
                    Vista: {viewMode === 'table' ? 'Tabela' : viewMode === 'card' ? 'Grade' : 'Mapa'}
                    <i className="bi bi-chevron-right text-slate-400 ml-1" />
                </button>

                {!isStandalone && (
                    <div className="flex items-center gap-3">
                        <Link
                            to="/logistics/assembly-list"
                            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest py-4 px-8 rounded-2xl flex items-center justify-center transition-all active:scale-95 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                        >
                            <i className="bi bi-list-check mr-2 text-lg" />
                            Lista de Montagens
                        </Link>
                        <button
                            onClick={handleShare}
                            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-4 px-8 rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-emerald-900/20 flex items-center justify-center transition-all active:scale-95 group"
                        >
                            <i className="bi bi-whatsapp mr-2 text-lg group-hover:rotate-12 transition-transform" />
                            Compartilhar
                        </button>
                        <Link
                            to="/settings"
                            className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                            title="Configurações do Cronograma"
                        >
                            <i className="bi bi-gear-fill text-xl group-hover:rotate-90 transition-transform duration-500" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile: active filter chips for quick context */}
            <div className="flex lg:hidden flex-wrap gap-2 w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <i className="bi bi-calendar3" /> {activeFilterLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <i className="bi bi-funnel-fill" /> {typeFilter.length} Tipos
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <i className={`bi ${viewMode === 'card' ? 'bi-grid-fill' : viewMode === 'table' ? 'bi-table' : 'bi-map-fill'}`} /> 
                    {viewMode === 'card' ? 'Cards' : viewMode === 'table' ? 'Tabela' : 'Mapa'}
                </span>
                {!isStandalone && (
                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                        <Link
                            to="/logistics/assembly-list"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800"
                        >
                            <i className="bi bi-list-check" /> Lista de Montagens
                        </Link>
                        <button
                            onClick={handleShare}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-md shadow-emerald-100 dark:shadow-emerald-900/20 transition-all active:scale-95"
                        >
                            <i className="bi bi-whatsapp" /> Compartilhar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-[6px] border-slate-50 dark:border-slate-800 rounded-full"></div>
                        <div className="absolute inset-0 border-[6px] border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-8 text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                        Sincronizando Agenda...
                    </p>
                </div>
            );
        }

        if (Object.keys(schedule).length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] bg-slate-50/30 dark:bg-slate-950/30 mx-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-full shadow-2xl shadow-slate-100 dark:shadow-none mb-8 border border-slate-50 dark:border-slate-800">
                        <i className="bi bi-calendar-x text-6xl text-slate-200 dark:text-slate-800" />
                    </div>
                    <h3 className="text-slate-800 dark:text-slate-100 font-black text-xl mb-2">Nada por aqui!</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Nenhum agendamento para o período selecionado
                    </p>
                    <button
                        onClick={() => setFilter('all')}
                        className="mt-8 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest hover:underline"
                    >
                        Ver todos os agendamentos
                    </button>
                </div>
            );
        }

        return (
            <div className="transition-all duration-500 ease-in-out">
                {viewMode === "card" ? (
                    <ScheduleCardView
                        schedule={schedule}
                        onOrderClick={openOrderDetails}
                        isReadOnly={isStandalone}
                        hasInitialScrolled={hasInitialScrolled}
                    />
                ) : viewMode === "table" ? (
                    <ScheduleTableView
                        schedule={schedule}
                        onOrderClick={openOrderDetails}
                        isReadOnly={isStandalone}
                        hasInitialScrolled={hasInitialScrolled}
                    />
                ) : (
                    <DeliveryMap 
                        orders={Object.values(schedule).flat()} 
                        onOrderClick={openOrderDetails} 
                        onOrderEdit={isStandalone ? undefined : setOrderToEdit}
                    />
                )}
            </div>
        );
    };

    return (
        <div className={`w-full mx-auto transition-all duration-300 ${isStandalone ? 'max-w-none p-2 sm:p-4' : `${viewMode === 'table' ? 'max-w-none mt-4 px-0 pb-0' : 'max-w-full mt-4 sm:mt-8 px-4 sm:px-6 md:px-8 pb-10'}`}`}>
            {renderHeader()}

            <div className="relative">
                {renderContent()}
            </div>

            {/* Mobile filter sidebar */}
            {sidebarOpen && <FilterSidebar />}

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={closeOrderDetails}
                        onEdit={isStandalone ? undefined : (ord) => {
                            setOrderToEdit(ord);
                            closeOrderDetails();
                        }}
                    isReadOnly={isStandalone}
                />
            )}

            {orderToEdit && (
                <OrderEditModal
                    order={orderToEdit}
                    onClose={() => setOrderToEdit(null)}
                    onSaveSuccess={() => setOrderToEdit(null)}
                />
            )}

            {showShowroomModal && (
                <ShowroomAssemblyModal
                    onClose={() => setShowShowroomModal(false)}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes slide-left { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-left { animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}} />
        </div>
    );
};

export default DeliverySchedule;
