import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useDeliverySchedule, ScheduleFilter, OrderTypeFilter } from "./useDeliverySchedule";
import OrderDetailsModal from "./OrderDetailsModal";
import DeliveryMap from "./DeliveryMap";
import ScheduleCardView from "./ScheduleCardView/Index";
import ScheduleTableView from "./ScheduleTableView/Index";

const DeliverySchedule = () => {
    const {
        schedule,
        loading,
        viewMode: hookViewMode,
        setViewMode: setHookViewMode,
        filter,
        setFilter,
        typeFilter,
        setTypeFilter,
        selectedOrder,
        openOrderDetails,
        closeOrderDetails,
        handleShare,
        handleDragEnd,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
    } = useDeliverySchedule();

    const [viewMode, setViewMode] = useState<"card" | "table" | "map">("card");
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

    const typeFilters: { id: OrderTypeFilter; label: string; icon: string }[] = [
        { id: 'all', label: 'Todos', icon: 'bi-funnel' },
        { id: 'delivery', label: 'Entregas', icon: 'bi-truck' },
        { id: 'pickup', label: 'Retiradas', icon: 'bi-hand-index-thumb-fill' },
        { id: 'assistance', label: 'Assistência', icon: 'bi-tools' },
    ];

    const activeFilterLabel = filters.find(f => f.id === filter)?.label ?? '';
    const activeTypeLabel = typeFilters.find(f => f.id === typeFilter)?.label ?? '';
    const hasActiveFilters = filter !== 'default' || typeFilter !== 'all';

    /** Sidebar drawer – shown on mobile */
    const FilterSidebar = () => (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden animate-fade-in"
                onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col lg:hidden animate-slide-left border-l border-slate-100 dark:border-slate-800">
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
                                        onClick={() => setFilter(f.id)}
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
                        <div className="flex flex-col gap-2">
                            {typeFilters.map(tf => {
                                const isDelivery = tf.id === 'delivery';
                                const isPickup = tf.id === 'pickup';
                                const isAssistance = tf.id === 'assistance';
                                const colorClass = isDelivery ? 'green' : isPickup ? 'purple' : isAssistance ? 'orange' : 'amber';
                                
                                return (
                                <button
                                    key={tf.id}
                                    onClick={() => { setTypeFilter(tf.id); setSidebarOpen(false); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${typeFilter === tf.id
                                            ? `bg-${colorClass}-500 text-white shadow-lg shadow-${colorClass}-200 dark:shadow-${colorClass}-900/30`
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <i className={`bi ${tf.icon} text-base`} />
                                    {tf.label}
                                </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* View mode */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <i className="bi bi-layout-text-sidebar" /> Visualização
                        </p>
                        <div className="flex gap-2">
                            {[
                                { id: 'card', label: 'Cards', icon: 'bi-grid-fill' },
                                { id: 'table', label: 'Tabela', icon: 'bi-table' },
                                { id: 'map', label: 'Mapa', icon: 'bi-map-fill' },
                            ].map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setViewMode(v.id as any); setSidebarOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${viewMode === v.id
                                            ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <i className={`bi ${v.icon} text-base`} />
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer footer */}
                {hasActiveFilters && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => { setFilter('default'); setTypeFilter('all'); setSidebarOpen(false); }}
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
        <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 ${isStandalone ? 'bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300' : ''}`}>
            <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-100 dark:shadow-blue-900/20">
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
                        onClick={() => setSidebarOpen(true)}
                        className="relative flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <i className="bi bi-sliders text-blue-500" />
                        <span className="hidden sm:inline text-[11px] uppercase tracking-widest">Filtros</span>
                        {hasActiveFilters && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-white text-[8px] font-black flex items-center justify-center">
                                !
                            </span>
                        )}
                    </button>
                    <Link
                        to="/settings"
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                        title="Configurações do Cronograma"
                    >
                        <i className="bi bi-gear-fill" />
                    </Link>
                </div>
            </div>

            {/* Desktop: FILTERS TOOLBAR */}
            <div className="hidden lg:flex flex-wrap items-center gap-4 w-full xl:w-auto">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 w-full sm:w-auto transition-colors duration-300 items-center">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f.id
                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20 scale-105"
                                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                }`}
                        >
                            <i className={`bi ${f.icon} ${filter === f.id ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                            <span>{f.label}</span>
                        </button>
                    ))}

                    {filter === 'custom' && (
                        <div className="flex items-center gap-2 ml-4 animate-fade-in pr-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-400">De</span>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-100"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-400">Até</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 w-full lg:w-auto transition-colors duration-300">
                    {typeFilters.map((tf) => {
                        const isDelivery = tf.id === 'delivery';
                        const isPickup = tf.id === 'pickup';
                        const isAssistance = tf.id === 'assistance';
                        // Matches default colors for simplicity, or we could resolve via resolveOrderColor
                        const colorClass = isDelivery ? 'green' : isPickup ? 'purple' : isAssistance ? 'orange' : 'amber';

                        return (
                            <button
                                key={tf.id}
                                onClick={() => setTypeFilter(tf.id)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === tf.id
                                    ? `bg-white dark:bg-slate-700 text-${colorClass}-600 dark:text-${colorClass}-400 shadow-lg shadow-${colorClass}-100/50 dark:shadow-${colorClass}-900/20 scale-105`
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                    }`}
                            >
                                <i className={`bi ${tf.icon} ${typeFilter === tf.id ? `text-${colorClass}-500 dark:text-${colorClass}-400` : ''}`} />
                                <span>{tf.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden xl:block" />

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 transition-colors duration-300">
                    <button
                        onClick={() => setViewMode("card")}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "card"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg dark:shadow-blue-900/20"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                    >
                        <i className="bi bi-grid-fill mr-2" />Cards
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "table"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg dark:shadow-blue-900/20"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                    >
                        <i className="bi bi-table mr-2" />Tabela
                    </button>
                    <button
                        onClick={() => setViewMode("map")}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "map"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg dark:shadow-blue-900/20"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                    >
                        <i className="bi bi-map-fill mr-2" />Mapa
                    </button>
                </div>

                {!isStandalone && (
                    <div className="flex items-center gap-3">
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
                    <i className="bi bi-funnel-fill" /> {activeTypeLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <i className={`bi ${viewMode === 'card' ? 'bi-grid-fill' : 'bi-table'}`} /> {viewMode === 'card' ? 'Cards' : 'Tabela'}
                </span>
                {!isStandalone && (
                    <button
                        onClick={handleShare}
                        className="ml-auto inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-md shadow-emerald-100 dark:shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        <i className="bi bi-whatsapp" /> Compartilhar
                    </button>
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
                        handleDragEnd={handleDragEnd}
                        onOrderClick={openOrderDetails}
                    />
                ) : viewMode === "table" ? (
                    <ScheduleTableView
                        schedule={schedule}
                        onOrderClick={openOrderDetails}
                    />
                ) : (
                    <DeliveryMap orders={Object.values(schedule).flat()} />
                )}
            </div>
        );
    };

    return (
        <div className={`w-full mx-auto transition-all duration-300 ${isStandalone ? 'max-w-none p-4' : 'max-w-[1700px] mt-8 p-4 sm:p-6 md:p-10'}`}>
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
