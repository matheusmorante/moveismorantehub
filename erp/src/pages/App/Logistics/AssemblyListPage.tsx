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

const AssemblyListPage = () => {
    const [assemblies, setAssemblies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const isStandalone = window.location.pathname.includes("/assembly-schedule");
    const hasInitialScrolled = React.useRef(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<ShowcaseAssembly | null>(null);
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [settingsLoaded, setSettingsLoaded] = useState(false);



    useEffect(() => {
        const unsubscribe = subscribeToSettings((newSettings) => {
            setSettings(newSettings);
            setSettingsLoaded(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (settingsLoaded) {
            fetchAllAssemblies();
        }
    }, [settingsLoaded]);

    useEffect(() => {
        if (!settingsLoaded) return;

        const unsubscribe = subscribeToOrders((allOrders) => {
            const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const orderTasks = allOrders.filter(order => {
                if (order.deleted || order.status === 'cancelled') return false;
                const isPickup = order.shipping?.deliveryMethod === 'pickup';
                const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);

                return order.items?.some(i => {
                    const hLabel = normalize(i.handlingType);
                    const opt = modalityOptions.find(o => normalize(o.label) === hLabel);
                    return opt?.includeInAssemblySchedule && !opt?.isAssemblyOutside;
                });
            }).map(order => ({
                id: order.id,
                origin: 'order' as const,
                title: order.customerData.fullName,
                subtitle: `PEDIDO #${order.id?.slice(-8).toUpperCase()}`,
                date: order.shipping?.scheduling?.date || "",
                timeInfo: order.shipping?.scheduling ? {
                    type: order.shipping.scheduling?.type,
                    startTime: order.shipping.scheduling?.startTime,
                    endTime: order.shipping.scheduling?.endTime,
                    time: order.shipping.scheduling?.time,
                    dateType: order.shipping.scheduling?.dateType,
                    endDate: order.shipping.scheduling?.endDate
                } : null,
                items: order.items.filter(i => {
                    const isPickup = order.shipping?.deliveryMethod === 'pickup';
                    const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);
                    const hLabel = normalize(i.handlingType);
                    const opt = modalityOptions.find(o => normalize(o.label) === hLabel);
                    return opt?.includeInAssemblySchedule && !opt?.isAssemblyOutside;
                }).map(i => ({ description: i.description, quantity: i.quantity })),
                status: order.status,
                deliveryMethod: order.shipping?.deliveryMethod,
                observation: order.shipping?.deliveryAddress?.observation || order.observation || "",
                fullData: order
            }));

            updateUnifiedList(orderTasks);
        });

        return () => unsubscribe();
    }, [settingsLoaded, settings]);

    const [orderTasks, setOrderTasks] = useState<any[]>([]);

    const updateUnifiedList = (newOrderTasks: any[]) => {
        setOrderTasks(newOrderTasks);
        fetchAllAssemblies(newOrderTasks);
    };

    const fetchAllAssemblies = async (currentOrderTasks?: any[]) => {
        setLoading(true);
        try {
            const showcaseData = await getShowcaseAssemblies();
            const showcaseTasks = showcaseData.map(as => ({
                id: as.id || "",
                origin: 'showcase' as const,
                title: as.description,
                subtitle: as.observation || "MOSTRUÁRIO",
                date: as.date,
                items: [{ description: as.description, quantity: as.quantity }],
                status: as.status === 'completed' ? 'fulfilled' : 'scheduled',
                observation: as.observation || "",
                fullData: as
            }));

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const unified = [...(currentOrderTasks || orderTasks), ...showcaseTasks]
                .filter(item => !item.date || item.date >= yesterdayStr)
                .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.id || "").localeCompare(b.id || "");
                });

            setAssemblies(unified);
        } catch (error) {
            console.error('Erro ao buscar montagens:', error);
            toast.error("Erro ao carregar mostruários.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteShowcase = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir esta montagem de mostruário?")) return;
        try {
            await deleteShowcaseAssembly(id);
            toast.success("Montagem excluída!");
            fetchAllAssemblies();
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
        const REAL_URL = "https://moveismorantehub.vercel.app";
        const url = `${REAL_URL}/assembly-schedule`;
        const message = `🛠️ *Móveis Morante - Cronograma de Montagens*\n\nOlá! Segue o link para *visualização em tempo real* da lista de montagens atualizada:\n\n🔗 ${url}\n\n_Favor conferir os itens e horários no link antes de iniciar os serviços._`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const filteredAssemblies = assemblies.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        onClick={() => fetchAllAssemblies()}
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
                        {/* ── Cabeçalho de Data (igual ao Cronograma) ── */}
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
                                    <div key={item.id + idx} className="relative pl-16 pb-16 group last:pb-8">
                                        {/* Nó da timeline (idêntico ao cronograma, 24x24px shadow-lg) */}
                                        <div className={`absolute left-0 top-8 w-6 h-6 -ml-3 rounded-full border-4 border-white dark:border-slate-900 z-10 shadow-lg transition-all duration-300 group-hover:scale-125 ${
                                            isFulfilled ? 'bg-emerald-500' : isShowcase ? 'bg-rose-500' : 'bg-orange-500'
                                        }`} />

                                        {/* Linha conectora vertical */}
                                        <div className="absolute left-0 top-14 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800 -ml-0.25 group-last:hidden" />

                                        {/* Card da Montagem (Visual de Cronograma com cores dinâmicas e hover suave) */}
                                        <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 hover:shadow-premium-lg group-hover:border-blue-300 dark:group-hover:border-blue-800 relative overflow-hidden ${cls.cardBg} ${cls.cardBorder}`}>

                                            {/* ─ Linha de badges + status + ações ─ */}
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* badge origem */}
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${
                                                        isShowcase ? 'bg-rose-600' : 'bg-orange-600'
                                                    }`}>
                                                        {isShowcase ? 'Mostruário' : 'Pedido'}
                                                    </span>

                                                    {/* badge modalidade */}
                                                    {item.origin === 'order' && (
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                            item.deliveryMethod === 'pickup'
                                                                ? 'text-purple-600 border-purple-200 bg-purple-50/50'
                                                                : 'text-cyan-600 border-cyan-200 bg-cyan-50/50'
                                                        }`}>
                                                            {item.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                                                        </span>
                                                    )}

                                                    {/* horário */}
                                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                                        <i className="bi bi-clock-fill text-xs opacity-50" />
                                                        <span className="text-xs font-black tracking-tight">{displayTime}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* badge status */}
                                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                        isFulfilled
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {isFulfilled ? 'Finalizado' : 'Agendado'}
                                                    </span>

                                                    {/* botões mostruário */}
                                                    {!isStandalone && isShowcase && (
                                                        <div className="flex items-center gap-1 ml-1">
                                                            <button
                                                                onClick={() => handleEditShowcase(item.fullData)}
                                                                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all border border-slate-100 dark:border-slate-800"
                                                                title="Editar"
                                                            >
                                                                <i className="bi bi-pencil-square text-sm" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteShowcase(item.id)}
                                                                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-800"
                                                                title="Excluir"
                                                            >
                                                                <i className="bi bi-trash text-sm" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ─ Nome / subtítulo ─ */}
                                            <div className="flex flex-col gap-1 mb-4">
                                                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {item.subtitle}
                                                </p>
                                            </div>

                                            {/* Badges de Modalidade de Montagem (Visual Cromograma) */}
                                            <div className="flex flex-col gap-2 mt-4 mb-4">
                                                {!isShowcase ? (
                                                    <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-4 rounded-[1.5rem] border-2 border-orange-100 dark:border-orange-900/30 animate-pulse shadow-lg w-fit">
                                                        <i className="bi bi-hammer text-orange-500 text-xl shrink-0" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                                                Montagem no Depósito
                                                            </span>
                                                            <span className="text-[9px] font-bold opacity-70 uppercase">Agendado para o depósito</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-[1.5rem] border-2 border-rose-100 dark:border-rose-900/30 animate-pulse shadow-lg w-fit">
                                                        <i className="bi bi-shop text-rose-500 text-xl shrink-0" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                                                Montagem de Mostruário
                                                            </span>
                                                            <span className="text-[9px] font-bold opacity-70 uppercase">Organização física da loja</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ─ Observação ─ */}
                                            {item.observation && (
                                                <div className="mb-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-800/30 p-3 rounded-2xl">
                                                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-1">
                                                        Observações da Montagem:
                                                    </span>
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
                                                        "{item.observation}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* ─ Itens ─ */}
                                            <div className="space-y-2 mt-4">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Itens para Montagem:
                                                </span>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {item.items.map((it: any, iidx: number) => (
                                                        <div
                                                            key={iidx}
                                                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2"
                                                        >
                                                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[10px]">
                                                                {it.quantity}x
                                                            </span>
                                                            {it.description}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Accent decorativo */}
                                            <div className={`absolute top-0 right-0 w-24 h-24 rotate-45 translate-x-12 -translate-y-12 opacity-5 pointer-events-none ${
                                                isShowcase ? 'bg-rose-500' : 'bg-orange-500'
                                            }`} />
                                        </div>
                                    </div>
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
