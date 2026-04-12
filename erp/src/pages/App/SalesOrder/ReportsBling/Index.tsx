import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSalesReport, SaleItem } from './useSalesReport';

const SalesOrderReportsBling = () => {
    const navigate = useNavigate();
    const { 
        calculateABC, fetchFromBling, loading, setLoading, 
        savedReports, saveReport, listSavedReports, deleteReport
    } = useSalesReport();
    
    // UI States
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({
        start: '2025-07-01',
        end: '2026-03-31'
    });

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        listSavedReports();
    }, []);

    const handleCreateReport = async () => {
        setLoading(true);
        try {
            const items = await fetchFromBling(dateRange.start, dateRange.end);
            
            if (items.length === 0) {
                alert("Nenhum dado encontrado no Bling para este período.");
                setLoading(false);
                return;
            }

            const reportData = calculateABC(items, 'revenue', true);
            const reportName = `Análise Bling ${format(new Date(dateRange.start), 'MM/yy')} - ${format(new Date(dateRange.end), 'MM/yy')}`;
            
            const newReport = await saveReport(reportName, 'bling', {}, reportData);
            
            if (newReport?.id) {
                navigate(`/sales-order/reports-bling/${newReport.id}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao processar dados do Bling.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">Relatórios do Bling</h1>
                        <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full tracking-widest uppercase">BETA</span>
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Dados extraídos em tempo real via API v3</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1 px-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Início</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                    </div>
                    <div className="hidden md:block w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                    <div className="flex flex-col gap-1 px-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fim</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <button 
                        onClick={handleCreateReport}
                        disabled={loading}
                        className="px-8 py-4 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <i className="bi bi-clouds-fill text-lg"></i>
                        )}
                        <span className="text-[12px] font-black uppercase tracking-widest">Sincronizar e Gerar</span>
                    </button>
                </div>
            </header>

            <section>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <i className="bi bi-collection-fill text-indigo-600 text-lg"></i> Análises Salvas
                    </h2>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-6"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {savedReports.length > 0 ? savedReports.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 flex flex-col justify-between group h-[260px] transition-all hover:-translate-y-1 hover:shadow-2xl">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-2">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600`}>
                                            Bling API
                                        </span>
                                        <span className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                            {report.report_data?.results?.length || 0} itens
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === report.id ? null : report.id); }} 
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${openMenuId === report.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-indigo-600'}`}
                                        >
                                            <i className="bi bi-three-dots-vertical"></i>
                                        </button>

                                        {openMenuId === report.id && (
                                            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => navigate(`/sales-order/reports-bling/${report.id}?print=true`)}
                                                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <i className="bi bi-printer-fill text-indigo-500"></i> Imprimir / PDF
                                                </button>
                                                <div className="h-px bg-slate-50 dark:bg-slate-800"></div>
                                                <button 
                                                    onClick={() => { if(confirm("Deseja realmente excluir este relatório?")) deleteReport(report.id); }}
                                                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                                >
                                                    <i className="bi bi-trash3-fill"></i> Lixeira
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-2 uppercase">{report.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    {format(new Date(report.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(`/sales-order/reports-bling/${report.id}`)} 
                                className="w-full py-4 bg-slate-950 dark:bg-slate-800 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/10 group-hover:shadow-indigo-500/20"
                            >
                                Abrir Análise
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-full py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-6">
                                <i className="bi bi-cloud-slash text-3xl text-slate-200"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Sem histórico disponível</h3>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Selecione o período acima e clique em Sincronizar</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default SalesOrderReportsBling;
