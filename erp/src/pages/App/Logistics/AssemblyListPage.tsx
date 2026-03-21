import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatToBRDate } from '@/pages/utils/formatters';
import Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import ShowcaseAssemblyModal from './components/ShowcaseAssemblyModal';
import { ShowcaseAssembly, getShowcaseAssemblies, deleteShowcaseAssembly } from '@/pages/utils/showcaseAssemblyService';

const AssemblyListPage = () => {
    const [activeTab, setActiveTab] = useState<'orders' | 'showcase'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [showcaseItems, setShowcaseItems] = useState<ShowcaseAssembly[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<ShowcaseAssembly | null>(null);

    useEffect(() => {
        if (activeTab === 'orders') fetchOrdersWithAssembly();
        else fetchShowcaseAssemblies();
    }, [activeTab]);

    const fetchOrdersWithAssembly = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('deleted', false)
                .order('date', { ascending: false });

            if (error) throw error;

            const ordersWithAssembly = (data as any[] || []).filter(order => {
                const items = order.items || [];
                return items.some((item: any) => 
                    item.handlingType === 'Montagem no Local'
                );
            });

            setOrders(ordersWithAssembly);
        } catch (error) {
            console.error('Erro ao buscar montagens:', error);
            toast.error("Erro ao carregar lista de montagens.");
        } finally {
            setLoading(false);
        }
    };

    const fetchShowcaseAssemblies = async () => {
        setLoading(true);
        try {
            const data = await getShowcaseAssemblies();
            setShowcaseItems(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar montagens de mostruário.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteShowcase = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir esta montagem de mostruário?")) return;
        try {
            await deleteShowcaseAssembly(id);
            toast.success("Montagem excluída!");
            fetchShowcaseAssemblies();
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

    const filteredOrders = orders.filter(order => 
        order.customerData.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredShowcase = showcaseItems.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Logística de Montagens</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Gestão de serviços técnicos e montagens em domicílio ou mostruário</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all w-full md:w-60 outline-none"
                        />
                    </div>
                    {activeTab === 'showcase' && (
                        <button 
                            onClick={handleAddShowcase}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <i className="bi bi-plus-lg"></i>
                            Novo Item
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <i className="bi bi-cart-check mr-2"></i> Pedidos de Venda
                </button>
                <button
                    onClick={() => setActiveTab('showcase')}
                    className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'showcase' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <i className="bi bi-shop mr-2"></i> Montagens de Mostruário
                </button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        {activeTab === 'orders' ? (
                            <>
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido / Cliente</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Data Entrega</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Itens para Montar</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status Venda</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredOrders.map(order => (
                                        <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all text-sans">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{order.customerData.fullName}</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">#{order.id?.slice(-8).toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                    {order.shipping.scheduling?.date ? formatToBRDate(order.shipping.scheduling.date) : '---'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    {order.items.filter(i => i.handlingType === 'Montagem no Local').map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <span className="w-5 h-5 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-[10px] font-black text-blue-600 dark:text-blue-400 rounded-md">{item.quantity}</span>
                                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.description}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    order.status === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                                                    order.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {order.status === 'scheduled' ? 'Agendado' : order.status === 'fulfilled' ? 'Finalizado' : 'Rascunho'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><i className="bi bi-printer text-lg"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição do Item</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Data</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {loading ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredShowcase.map(item => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all text-sans">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.description}</span>
                                                    {item.observation && <span className="text-[10px] text-slate-400 mt-0.5 italic">{item.observation}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {formatToBRDate(item.date)}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="w-8 h-8 inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black text-slate-600 dark:text-slate-400">
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    item.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                                                }`}>
                                                    {item.status === 'completed' ? 'Montado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleEditShowcase(item)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><i className="bi bi-pencil-square text-lg"></i></button>
                                                    <button onClick={() => handleDeleteShowcase(item.id!)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="bi bi-trash text-lg"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                        {!loading && ((activeTab === 'orders' && filteredOrders.length === 0) || (activeTab === 'showcase' && filteredShowcase.length === 0)) && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</td>
                            </tr>
                        )}
                    </table>
                </div>
            </div>

            <ShowcaseAssemblyModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                assembly={selectedAssembly}
                onSaveSuccess={() => activeTab === 'orders' ? fetchOrdersWithAssembly() : fetchShowcaseAssemblies()}
            />
        </div>
    );
};

export default AssemblyListPage;
