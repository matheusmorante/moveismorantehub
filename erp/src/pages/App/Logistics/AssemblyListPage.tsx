import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatDate } from '@/pages/utils/formatters';
import Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import { getSettings, subscribeToSettings, AppSettings } from '@/pages/utils/settingsService';
import { subscribeToOrders } from '@/pages/utils/orderHistoryService';
import ShowcaseAssemblyModal from './components/ShowcaseAssemblyModal';
import { ShowcaseAssembly, getShowcaseAssemblies, deleteShowcaseAssembly } from '@/pages/utils/showcaseAssemblyService';
import { getOrderTypeClasses } from '@/pages/utils/orderTypeColorUtils';
import { Drill } from '@/components/shared/DrillIcon';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { useAssemblyListQuery } from './hooks/useAssemblyListQuery';
import AssemblyCard from './components/AssemblyCard';

const AssemblyListPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const isStandalone = window.location.pathname.includes("/assembly-schedule");
    const hasInitialScrolled = React.useRef(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<ShowcaseAssembly | null>(null);

    const { assemblies, loading, refetchAssemblies } = useAssemblyListQuery();

    const handleDeleteShowcase = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir esta montagem de mostruário?")) return;
        try {
            await deleteShowcaseAssembly(id);
            toast.success("Montagem excluída!");
            refetchAssemblies();
        } catch (error) {
            toast.error("Erro ao excluir montagem.");
        }
    };

    const handleEditShowcase = (item: ShowcaseAssembly) => {
        setSelectedAssembly(item);
        setIsModalOpen(true);
    };

    const handleAddShowcase = () => {
        setSelectedAssembly(null);
        setIsModalOpen(true);
    };

    const handleShareWhatsApp = () => {
        const REAL_URL = "https://morantehub.vercel.app";
        const url = `${REAL_URL}/assembly-schedule`;
        const message = `🛠️ *Móveis Morante - Agenda de Montagens*\n\nOlá! Segue o link para *visualização em tempo real* da lista de montagens atualizada:\n\n🔗 ${url}\n\n_Favor conferir os itens e horários no link antes de iniciar os serviços._`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const filteredAssemblies = assemblies.filter(item =>
        normalizeSearchTerm(item.title).includes(normalizeSearchTerm(searchTerm)) ||
        normalizeSearchTerm(item.id || '').includes(normalizeSearchTerm(searchTerm))
    );

    useEffect(() => {
        if (loading || filteredAssemblies.length === 0 || hasInitialScrolled.current) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Find the closest date (today or future)
        const availableDates = filteredAssemblies.map(a => a.date).filter(Boolean).sort();
        const targetDate = availableDates.find(d => d >= todayStr) || availableDates[0];

        if (!targetDate) return;

        setTimeout(() => {
            const element = document.getElementById(`timeline-date-${targetDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                hasInitialScrolled.current = true;
            }
        }, 500);
    }, [filteredAssemblies, loading]);

    // ─── Header ───────────────────────────────────────────────────
    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Montagem no Depósito</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                    {isStandalone ? "Visualização em Tempo Real" : "Gestão de serviços técnicos e montagens"}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 md:flex-none">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all w-full md:w-60 outline-none"
                    />
                </div>
                {isStandalone && (
                    <button
                        onClick={() => refetchAssemblies()}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                        title="Recarregar lista"
                    >
                        <i className="bi bi-arrow-clockwise text-lg" />
                    </button>
                )}
                {!isStandalone && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handleShareWhatsApp}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#128C7E] active:scale-95 transition-all outline-none"
                        >
                            <i className="bi bi-whatsapp" />
                            WhatsApp
                        </button>
                        <button
                            onClick={() => window.open('/logistics/assembly-print', '_blank')}
                            className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all outline-none"
                        >
                            <i className="bi bi-printer text-lg" />
                        </button>
                        <button
                            onClick={handleAddShowcase}
                            className="p-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <i className="bi bi-plus-lg text-lg" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // ─── Timeline View ────────────────────────────────────────────
    const renderTimelineView = () => {
        if (loading) {
            return (
                <div className="space-y-12 max-w-[95%] mx-auto py-6">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="space-y-6">
                            <div className="h-16 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 animate-pulse" />
                            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-12 space-y-8">
                                <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-48 animate-pulse relative">
                                    <div className="absolute -left-[59px] top-8 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-900" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (filteredAssemblies.length === 0) {
            return (
                <div className="py-24 text-center flex flex-col items-center justify-center">
                    <i className="bi bi-calendar-x text-5xl mb-4 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">Nenhuma montagem agendada</p>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-300 dark:text-slate-700 mt-1">
                        Todas as tarefas de montagem foram concluídas ou não há agendamentos.
                    </p>
                </div>
            );
        }

        const grouped = filteredAssemblies.reduce((acc, item) => {
            const key = item.date || 'sem-data';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

        return (
            <div className="max-w-[95%] mx-auto py-2 space-y-12">
                {sortedKeys.map(dateKey => (
                    <div key={dateKey} id={`timeline-date-${dateKey}`} className="space-y-8">
                        {/* ── Cabeçalho de Data (igual à Agenda) ── */}
                        <div className="sticky top-0 z-20 flex items-center gap-6 mb-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-8 py-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                                    {dateKey === 'sem-data'
                                        ? 'Sem data'
                                        : new Date(dateKey + "T00:00:00").toLocaleDateString("pt-BR", { weekday: 'long' })}
                                </span>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                    {dateKey === 'sem-data' ? 'Data não definida' : (() => {
                                        const firstItem = grouped[dateKey][0];
                                        const isRange = firstItem?.timeInfo?.dateType === 'range' && firstItem?.timeInfo?.endDate;
                                        if (isRange) {
                                            return `De ${new Date(dateKey + "T00:00:00").toLocaleDateString("pt-BR")} até ${new Date(firstItem.timeInfo.endDate + "T00:00:00").toLocaleDateString("pt-BR")}`;
                                        }
                                        return new Date(dateKey + "T00:00:00").toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' });
                                    })()}
                                </h3>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
                            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {grouped[dateKey].length} {grouped[dateKey].length === 1 ? 'Montagem' : 'Montagens'}
                            </div>
                        </div>

                        {/* ── Linha vertical da timeline ── */}
                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3">
                            {grouped[dateKey].map((item: any, idx: number) => {
                                const isShowcase = item.origin === 'showcase';
                                const isFulfilled = item.status === 'fulfilled';
                                
                                // Cores dinâmicas como no cronograma
                                const cls = getOrderTypeClasses(isShowcase ? 'rose' : 'orange');

                                let displayTime = "Horário Livre";
                                if (item.timeInfo) {
                                    displayTime = item.timeInfo.type === 'range' && item.timeInfo.startTime && item.timeInfo.endTime
                                        ? `${item.timeInfo.startTime} - ${item.timeInfo.endTime}`
                                        : (item.timeInfo.startTime || item.timeInfo.time || 'Horário Livre');
                                }

                                return (
                                <AssemblyCard 
                                    key={item.id + idx} 
                                    item={item} 
                                    idx={idx} 
                                    isStandalone={isStandalone}
                                    handleEditShowcase={handleEditShowcase}
                                    handleDeleteShowcase={handleDeleteShowcase}
                                />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="p-2 md:p-6 space-y-8 animate-fade-in pb-20 w-full">
            {renderHeader()}

            <style dangerouslySetInnerHTML={{ __html: `.capitalize::first-letter { text-transform: uppercase; }` }} />

            {renderTimelineView()}

            <ShowcaseAssemblyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                assembly={selectedAssembly}
                onSaveSuccess={() => fetchAllAssemblies()}
            />
        </div>
    );
};

export default AssemblyListPage;
