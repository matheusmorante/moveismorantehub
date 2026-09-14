import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { crmIntelligenceService, CustomerDesire } from '../../utils/crmIntelligenceService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MatchWithData {
    id: string;
    desire_id: string;
    product_id: string;
    notified: boolean;
    created_at: string;
    product?: {
        description: string;
        unit_price: number;
    };
    desire?: CustomerDesire;
}

const CustomerDesiresPage = () => {
    const [desires, setDesires] = useState<CustomerDesire[]>([]);
    const [matches, setMatches] = useState<MatchWithData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: desiresData, error: desiresError } = await supabase
                .from('customer_desires')
                .select('*')
                .order('created_at', { ascending: false });

            if (desiresError) throw desiresError;

            const { data: matchesData, error: matchesError } = await supabase
                .from('desire_matches')
                .select('*, product:products(description, unit_price), desire:customer_desires(*)')
                .eq('notified', false);

            if (matchesError) throw matchesError;

            setDesires(desiresData || []);
            setMatches(matchesData || []);
        } catch (err: unknown) {
            console.error("Erro ao carregar lista de desejos:", err);
        } finally {
            setLoading(false);
        }
    };

    const markAsNotified = async (matchId: string) => {
        try {
            const { error } = await supabase
                .from('desire_matches')
                .update({ notified: true })
                .eq('id', matchId);
            if (error) throw error;
            void fetchData();
        } catch (err: unknown) {
            console.error("Erro ao marcar desejo como notificado:", err);
        }
    };

    const updateDesireStatus = async (desireId: string, status: string) => {
        try {
            const { error } = await supabase
                .from('customer_desires')
                .update({ status })
                .eq('id', desireId);
            if (error) throw error;
            void fetchData();
        } catch (err: unknown) {
            console.error("Erro ao atualizar status do desejo:", err);
        }
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <header>
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    🔥 CRM de Desejos
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium italic">
                    Monitore o que seus clientes querem e receba alertas de estoque.
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Matches Recentes */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <h2 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <i className="bi bi-stars"></i> Matches de Estoque
                    </h2>
                    
                    {matches.length === 0 ? (
                        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum match pendente</p>
                        </div>
                    ) : (
                        matches.map(match => (
                            <div key={match.id} className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col gap-4">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Produto em Estoque</span>
                                    <h3 className="text-lg font-black leading-tight">{match.product?.description}</h3>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Interessado</span>
                                    <p className="font-bold">{match.desire?.customer_name || 'Cliente identificado'}</p>
                                    <p className="text-xs opacity-90">{match.desire?.customer_phone}</p>
                                </div>
                                <button 
                                    onClick={() => markAsNotified(match.id)}
                                    className="w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-colors"
                                >
                                    Marcar como Notificado
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Lista de Desejos */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">
                        Lista Geral de Desejos
                    </h2>

                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-950/50">
                                <tr>
                                     <th scope="col" className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                     <th scope="col" className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto Desejado</th>
                                     <th scope="col" className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                     <th scope="col" className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {desires.map(desire => (
                                    <tr key={desire.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-slate-800 dark:text-slate-200">{desire.customer_name || 'N/A'}</p>
                                            <p className="text-xs text-slate-400">{desire.customer_phone}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">{desire.product_name}</p>
                                            <p className="text-[10px] text-slate-400 italic">{desire.details || 'Sem detalhes informados'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                desire.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                desire.status === 'notified' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                {desire.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select 
                                                value={desire.status}
                                                aria-label={`Atualizar status do desejo de ${desire.customer_name || 'cliente'}`}
                                                onChange={(e) => updateDesireStatus(desire.id!, e.target.value)}
                                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 focus:ring-0 cursor-pointer"
                                            >
                                                <option value="pending">Pendente</option>
                                                <option value="notified">Notificado</option>
                                                <option value="cancelled">Cancelado</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDesiresPage;
