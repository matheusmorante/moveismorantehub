import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSalesReport, SaleItem } from './useSalesReport';
import ReportConfigModal from './ReportConfigModal';

const SalesOrderReports = () => {
    const navigate = useNavigate();
    const { 
        calculateABC, fetchFromERP, loading, setLoading, 
        savedReports, saveReport, listSavedReports, deleteReport
    } = useSalesReport();
    
    // UI States
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        listSavedReports();
    }, []);

    const handleCreateReport = async (data: any) => {
        setLoading(true);
        try {
            let items: SaleItem[] = [];
            if (data.source === 'erp') {
                items = await fetchFromERP();
            } else {
                if (!data.csvData || data.csvData.length === 0) {
                    alert("Selecione um arquivo CSV primeiro.");
                    setLoading(false);
                    return;
                }
                const parseNum = (val: any) => {
                    if (typeof val === 'number') return val;
                    if (!val) return 0;
                    // Lidar com R$ 1.234,56 ou 1,234.56
                    let str = val.toString().replace(/[^\d.,-]/g, '');
                    if (str.includes(',') && str.includes('.')) {
                        if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
                        else str = str.replace(/,/g, '');
                    } else if (str.includes(',')) {
                        str = str.replace(',', '.');
                    }
                    const parsed = parseFloat(str);
                    return isNaN(parsed) ? 0 : parsed;
                };

                items = data.csvData
                    .filter((row: any) => {
                        // Ignorar linhas que sejam exatamente o cabeçalho (comum em alguns exports)
                        const prodVal = row[data.config.product];
                        return prodVal && prodVal !== data.config.product && prodVal !== 'Nome do Produto';
                    })
                    .map((row: any) => {
                        const dateStr = row[data.config.date];
                    let date = new Date();
                        try {
                            if (dateStr?.includes('/')) {
                                const parts = dateStr.split('/');
                                if (parts.length === 2) {
                                    // Formato MM/AAAA
                                    date = parse(dateStr, 'MM/yyyy', new Date());
                                } else if (parts[0].length === 4) {
                                    // Formato AAAA-MM-DD
                                    date = new Date(dateStr);
                                } else {
                                    // Formato DD/MM/AAAA
                                    date = parse(dateStr.split(' ')[0], 'dd/MM/yyyy', new Date());
                                }
                            } else { 
                                date = new Date(dateStr); 
                            }
                        } catch (e) {
                            console.error("Erro ao converter data:", dateStr, e);
                        }

                    const qty = parseNum(row[data.config.quantity]);
                    const sVal = parseNum(row[data.config.salesValue]);
                    const cost = parseNum(row[data.config.cost]);
                    const profit = data.config.profit && row[data.config.profit] ? parseNum(row[data.config.profit]) : (sVal - (cost * qty));

                    return {
                        date, product: row[data.config.product] || 'N/A', supplier: row[data.config.supplier] || 'N/A',
                        quantity: qty, cost: cost, salesValue: sVal, profit: profit
                    };
                });
            }

            if (items.length === 0) {
                alert("Nenhum dado encontrado no CSV. Verifique se o arquivo está correto e se o mapeamento de colunas foi realizado.");
                setLoading(false);
                return;
            }

            const reportData = calculateABC(items, data.config.abcBasis, true);
            if (!reportData || reportData.results.length === 0) {
                const totalParsed = items.length;
                alert(`A análise resultou em zero resultados úteis (de ${totalParsed} itens). Isso geralmente acontece quando as colunas de 'Valor de Venda' ou 'Lucro' mapeadas contêm apenas texto ou zeros. Por favor, revise o mapeamento.`);
                setLoading(false);
                return;
            }

            const newReport = await saveReport(data.name || `Relatório ${format(new Date(), 'dd/MM')}`, data.source, data.config, reportData);
            
            setIsConfigModalOpen(false);
            if (newReport?.id) {
                navigate(`/sales-order/reports/${newReport.id}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao processar dados.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">Relatório de Vendas CSV</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Gestão de Inteligência Strategic Business</p>
                </div>

                <button 
                    onClick={() => setIsConfigModalOpen(true)}
                    className="px-8 py-5 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                >
                    <i className="bi bi-plus-circle-fill text-xl"></i>
                    <span className="text-[12px] font-black uppercase tracking-widest text-white">Criar Nova Análise</span>
                </button>
            </header>

            <section>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <i className="bi bi-collection-fill text-blue-600 text-lg"></i> Relatórios Salvos
                    </h2>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-6"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {savedReports.length > 0 ? savedReports.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 flex flex-col justify-between group h-[260px] transition-all hover:-translate-y-1 hover:shadow-2xl">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-2">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${report.source === 'erp' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {report.source}
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
                                                    onClick={() => navigate(`/sales-order/reports/${report.id}?print=true`)}
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
                                onClick={() => navigate(`/sales-order/reports/${report.id}`)} 
                                className="w-full py-4 bg-slate-950 dark:bg-slate-800 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/10 group-hover:shadow-indigo-500/20"
                            >
                                Abrir
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-full py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-6">
                                <i className="bi bi-archive text-3xl text-slate-200"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Sem histórico disponível</h3>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Gere um novo relatório para começar</p>
                        </div>
                    )}
                </div>
            </section>

            <ReportConfigModal 
                isOpen={isConfigModalOpen} 
                onClose={() => setIsConfigModalOpen(false)} 
                onSave={handleCreateReport}
                loading={loading}
            />
        </div>
    );
};

export default SalesOrderReports;
