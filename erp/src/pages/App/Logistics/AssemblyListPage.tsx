import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatDate } from '@/pages/utils/formatters';
import Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import { getSettings, subscribeToSettings, AppSettings } from '@/pages/utils/settingsService';
import { subscribeToOrders } from '@/pages/utils/orderHistoryService';
import ShowcaseAssemblyModal from './components/ShowcaseAssemblyModal';
import { ShowcaseAssembly, getShowcaseAssemblies, deleteShowcaseAssembly } from '@/pages/utils/showcaseAssemblyService';

const AssemblyListPage = () => {
    const [assemblies, setAssemblies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const isStandalone = window.location.pathname.includes("/assembly-schedule");
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<ShowcaseAssembly | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                    // Exclusivo para depósito: inclui no cronograma E NÃO é fora
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
                    time: order.shipping.scheduling?.time
                } : null,
                items: order.items.filter(i => {
                    const isPickup = order.shipping?.deliveryMethod === 'pickup';
                    const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);
                    const hLabel = normalize(i.handlingType);
                    const opt = modalityOptions.find(o => normalize(o.label) === hLabel);
                    return opt?.includeInAssemblySchedule && !opt?.isAssemblyOutside;
                }).map(i => ({ description: i.description, quantity: i.quantity })),
                status: order.status,
                fullData: order
            }));

            // Unified with existing showcase data (refetched below or held in state)
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
            // 1. Fetch Showcase
            const showcaseData = await getShowcaseAssemblies();
            const showcaseTasks = showcaseData.map(as => ({
                id: as.id || "",
                origin: 'showcase' as const,
                title: as.description,
                subtitle: as.observation || "MOSTRUÁRIO",
                date: as.date,
                items: [{ description: as.description, quantity: as.quantity }],
                status: as.status === 'completed' ? 'fulfilled' : 'scheduled',
                fullData: as
            }));

            // Unified & Sorted (Latest date first)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const unified = [...(currentOrderTasks || orderTasks), ...showcaseTasks]
                .filter(item => !item.date || item.date >= yesterdayStr)
                .sort((a, b) => {
                    if (a.date !== b.date) return b.date.localeCompare(a.date);
                    return (b.id || "").localeCompare(a.id || "");
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
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
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
                        <i className="bi bi-arrow-clockwise text-lg"></i>
                    </button>
                )}
                {!isStandalone && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleShareWhatsApp}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#128C7E] active:scale-95 transition-all outline-none"
                        >
                            <i className="bi bi-whatsapp"></i>
                            WhatsApp
                        </button>
                        <button 
                            onClick={() => window.open('/logistics/assembly-print', '_blank')}
                            className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all outline-none"
                        >
                            <i className="bi bi-printer text-lg"></i>
                        </button>
                        <button 
                            onClick={handleAddShowcase}
                            className="p-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <i className="bi bi-plus-lg text-lg"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderMobileView = () => {
        const grouped = filteredAssemblies.reduce((acc, item) => {
            const key = item.date || 'sem-data';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        if (loading) {
            return (
                <div className="grid grid-cols-1 gap-4">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-[2rem] animate-pulse border border-slate-100 dark:border-slate-800" />
                    ))}
                </div>
            );
        }

        if (filteredAssemblies.length === 0) {
            return <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Nenhuma montagem pendente</div>;
        }

        return (
            <div className="space-y-12">
                {sortedKeys.map(dateKey => (
                    <div key={dateKey} className="space-y-4">
                        {/* Data Header */}
                        <div className="flex items-center gap-4 px-2">
                             <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-sm shadow-blue-200"></div>
                             <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                                {dateKey === 'sem-data' ? 'Data não definida' : new Date(dateKey + "T00:00:00").toLocaleDateString("pt-BR", {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'long'
                                })}
                             </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {grouped[dateKey].map((item: any, idx: number) => (
                                <div key={item.id + idx} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-800 pb-4">
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                                                    item.origin === 'order' ? 'text-blue-600 border-blue-200 bg-blue-50/50' : 'text-amber-600 border-amber-200 bg-amber-50/50'
                                                }`}>
                                                    {item.origin === 'order' ? 'Pedido' : 'Mostruário'}
                                                </span>
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Serviço Técnico</span>
                                            </div>
                                            <div className="flex flex-col">
                                                {item.timeInfo && (
                                                    <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide mt-1">
                                                        <i className="bi bi-clock-fill mr-2 opacity-70"></i>
                                                        {item.timeInfo.type === 'range' 
                                                            ? `${item.timeInfo.startTime} → ${item.timeInfo.endTime}` 
                                                            : (item.timeInfo.time || (item.timeInfo.startTime ? `${item.timeInfo.startTime}` : 'Horário Livre'))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">O que montar:</span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {item.items.map((it: any, iidx: number) => (
                                                <div key={iidx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                                    <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white text-xs font-black rounded-xl shadow-sm">{it.quantity}x</span>
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase leading-tight line-clamp-2">{it.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                                         <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Informações do Cliente</span>
                                            <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase truncate">{item.title}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{item.subtitle}</span>
                                        </div>
                                    </div>

                                    {!isStandalone && item.origin === 'showcase' && (
                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                            <button onClick={() => handleEditShowcase(item.fullData)} className="px-4 py-2 text-blue-600 font-bold text-xs"><i className="bi bi-pencil-square mr-1"></i> Editar</button>
                                            <button onClick={() => handleDeleteShowcase(item.id)} className="px-4 py-2 text-rose-500 font-bold text-xs"><i className="bi bi-trash mr-1"></i> Excluir</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-10 space-y-8 animate-fade-in pb-20">
            {renderHeader()}

            <style dangerouslySetInnerHTML={{ __html: `
                .capitalize::first-letter { text-transform: uppercase; }
            `}} />

            {isMobile ? renderMobileView() : (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Período</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Itens para Montar
                                        </th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Origem / Responsável
                                        </th>
                                        {!isStandalone && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredAssemblies.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                                Nenhuma montagem pendente
                                            </td>
                                        </tr>
                                    ) : (() => {
                                        const grouped = filteredAssemblies.reduce((acc, item) => {
                                            const key = item.date || 'sem-data';
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(item);
                                            return acc;
                                        }, {} as Record<string, any[]>);

                                        const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                                        return sortedKeys.map(dateKey => (
                                            <React.Fragment key={dateKey}>
                                                {/* Date Header Row */}
                                                <tr className="bg-slate-50/30 dark:bg-slate-800/10">
                                                    <td colSpan={isStandalone ? 3 : 4} className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-sm shadow-blue-200"></div>
                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                                                                {dateKey === 'sem-data' ? 'Data não definida' : new Date(dateKey + "T00:00:00").toLocaleDateString("pt-BR", {
                                                                    weekday: 'long',
                                                                    day: '2-digit',
                                                                    month: 'long'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {grouped[dateKey].map((item: any, idx: number) => (
                                                    <tr key={item.id + idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all text-sans">
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                {item.timeInfo && (
                                                                    <span className="text-[12px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                                                        <i className="bi bi-clock-fill mr-2 opacity-70"></i>
                                                                        {item.timeInfo.type === 'range' 
                                                                            ? `${item.timeInfo.startTime} → ${item.timeInfo.endTime}` 
                                                                            : (item.timeInfo.time || (item.timeInfo.startTime ? `${item.timeInfo.startTime}` : 'Horário Livre'))
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col gap-1.5">
                                                                {item.items.map((it: any, iidx: number) => (
                                                                    <div key={iidx} className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 min-w-[2.5rem] flex items-center justify-center bg-blue-600 text-[10px] font-black text-white rounded-lg shadow-sm">{it.quantity} un</span>
                                                                        <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase">{it.description}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                                                                        item.origin === 'order' ? 'text-blue-600 border-blue-200 bg-blue-50/50' : 'text-amber-600 border-amber-200 bg-amber-50/50'
                                                                    }`}>
                                                                        {item.origin === 'order' ? 'Pedido' : 'Mostruário'}
                                                                    </span>
                                                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase">{item.title}</span>
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.subtitle}</span>
                                                            </div>
                                                        </td>
                                                        {!isStandalone && (
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {item.origin === 'showcase' && (
                                                                        <>
                                                                            <button onClick={() => handleEditShowcase(item.fullData)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><i className="bi bi-pencil-square text-lg"></i></button>
                                                                            <button onClick={() => handleDeleteShowcase(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="bi bi-trash text-lg"></i></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                        </table>
                    </div>
                </div>
            )}

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
