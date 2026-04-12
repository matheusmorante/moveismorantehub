import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import ItemExclusionModal from './ItemExclusionModal';
import ProductReferenceModal from './ProductReferenceModal';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Line, ComposedChart, Bar, Cell, ScatterChart, Scatter, ReferenceLine, Area
} from 'recharts';
import { format, parse } from 'date-fns';
import { useSalesReport, ABCResult, SaleItem } from './useSalesReport';
import { supabase } from '@/pages/utils/supabaseConfig';
import ReportConfigModal from './ReportConfigModal';
import SupplierPerformanceView from './SupplierPerformanceView';

const ReportView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const isPublicMode = location.pathname.startsWith('/public/');
    const { 
        totalProfit, setTotalProfit, monthCount, setMonthCount,
        avgProfitPerItem, setAvgProfitPerItem, avgTurnoverPerItem, setAvgTurnoverPerItem,
        results, setResults, rawResults, setRawResults, applyFilters, loading, setLoading,
        updateReport, fetchFromERP, calculateABC, reportStartDate, reportEndDate, setReportStartDate, setReportEndDate,
        allProducts, setAllProducts
    } = useSalesReport();

    const [reportName, setReportName] = useState('');
    const [viewMode, setViewMode] = useState<'product' | 'supplier'>('product');
    const [reportType, setReportType] = useState<'abc' | 'matrix'>('abc');
    const [showFilters, setShowFilters] = useState(false);
    const [abcBasis, setAbcBasis] = useState<'revenue' | 'profit'>('revenue');
    const [reportSource, setReportSource] = useState<'erp' | 'csv'>('erp');
    const [reportConfig, setReportConfig] = useState<any>(null);

    // Filter local states
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [minProfit, setMinProfit] = useState<number>(0);
    const [maxProfit, setMaxProfit] = useState<number>(0);

    // Modal Config
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'accumulatedPercentage', direction: 'asc' });
    const [hoveredResult, setHoveredResult] = useState<any | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [productMappings, setProductMappings] = useState<Record<string, string>>({});
    const [isExclusionOpen, setIsExclusionOpen] = useState(false);
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);
    const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const fetchProductMappings = async () => {
        const { data, error } = await supabase.from('product_references').select('master_name, reference_name');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach((r: any) => { map[r.reference_name] = r.master_name; });
            setProductMappings(map);
            return map;
        }
        return {};
    };

    useEffect(() => {
        fetchProductMappings();
    }, []);

    const supplierAverages = useMemo(() => {
        const map: Record<string, { totalProfit: number, totalQty: number, count: number }> = {};
        results.forEach(r => {
            const s = r.supplier || 'N/A';
            if (!map[s]) map[s] = { totalProfit: 0, totalQty: 0, count: 0 };
            map[s].totalProfit += r.monthlyProfit;
            map[s].totalQty += (r.monthlyTurnover ?? 0);
            map[s].count += 1;
        });
        
        const finalMap: Record<string, { avgProfit: number, avgTurnover: number }> = {};
        Object.keys(map).forEach(s => {
            finalMap[s] = {
                avgProfit: map[s].totalProfit / map[s].count,
                avgTurnover: map[s].totalQty / map[s].count
            };
        });
        return finalMap;
    }, [results]);

    const salvadosBenchmark = useMemo(() => {
        const items = rawResults.filter(r => (r.supplier || '').toUpperCase().includes('SALVADOS'));
        if (items.length === 0) return null;
        const totalP = items.reduce((acc, r) => acc + (r.monthlyProfit || 0), 0);
        return totalP / items.length;
    }, [rawResults]);

    const handleRowClick = (res: any) => {
        setHoveredResult(res);
    };

    const handleCloseModal = () => {
        setHoveredResult(null);
    };
    
    const handleShareWhatsApp = () => {
        const REAL_URL = "https://moveismorantehub.vercel.app";
        const publicUrl = `${REAL_URL}/public/report/${id}${location.search}`;
        const text = `📊 *Análise Estratégica MoranteHub*\n\nConfira o relatório: *${reportName}*\n\n🔗 Acesse aqui: ${publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const sortedResults = useMemo(() => {
        const items = [...results];
        if (sortConfig.key) {
            items.sort((a: any, b: any) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'giroMensal') {
                    aVal = a.totalQuantity / (monthCount || 1);
                    bVal = b.totalQuantity / (monthCount || 1);
                }
                if (sortConfig.key === 'lucroMensal') {
                    aVal = a.totalProfit / (monthCount || 1);
                    bVal = b.totalProfit / (monthCount || 1);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [results, sortConfig, monthCount]);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <i className="bi bi-arrow-down-up opacity-20 ml-2"></i>;
        return <i className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'down' : 'up'} text-indigo-500 ml-2`}></i>;
    };

    useEffect(() => {
        if (id) loadReport(id);
        
        // Sincronização inicial URL -> Estado
        const type = searchParams.get('type') as 'abc' | 'matrix';
        if (type) setReportType(type);

        const basis = searchParams.get('basis') as 'revenue' | 'profit';
        if (basis) setAbcBasis(basis);

        const q = searchParams.get('q');
        if (q) setSearchTerm(q);

        const s = searchParams.get('s');
        if (s) setSelectedSuppliers(s.split(',').filter(Boolean));

        const minP = searchParams.get('minP');
        if (minP) setMinProfit(Number(minP));

        const maxP = searchParams.get('maxP');
        if (maxP) setMaxProfit(Number(maxP));

        const sortK = searchParams.get('sortK');
        const sortD = searchParams.get('sortD') as 'asc' | 'desc';
        if (sortK && sortD) setSortConfig({ key: sortK, direction: sortD });
    }, [id]);

    // Sincronização contínua Estado -> URL
    useEffect(() => {
        const params: any = {};
        if (reportType !== 'abc') params.type = reportType;
        if (abcBasis !== 'revenue') params.basis = abcBasis;
        if (searchTerm) params.q = searchTerm;
        if (selectedSuppliers.length > 0) params.s = selectedSuppliers.join(',');
        if (minProfit > 0) params.minP = minProfit.toString();
        if (maxProfit > 0) params.maxP = maxProfit.toString();
        if (sortConfig.key !== 'accumulatedPercentage') params.sortK = sortConfig.key;
        if (sortConfig.direction !== 'desc') params.sortD = sortConfig.direction;

        setSearchParams(params, { replace: true });
    }, [reportType, abcBasis, searchTerm, selectedSuppliers, minProfit, maxProfit, sortConfig, setSearchParams]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('print') === 'true' && !loading && results.length > 0) {
            const timer = setTimeout(() => {
                window.print();
                // Limpar o param pra não imprimir de novo no refresh
                navigate(location.pathname, { replace: true });
            }, 1000); // Dar um tempo pros gráficos renderizarem
            return () => clearTimeout(timer);
        }
    }, [location.search, loading, results.length]);

    const loadReport = async (reportId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .select('*')
                .eq('id', reportId)
                .single();
            
            if (error) throw error;
            if (data) {
                const rd = data.report_data;
                setReportName(data.name);
                setReportSource(data.source);
                setReportConfig(data.config);
                let mCount = rd.monthCount || 1;
                let aProfit = rd.avgProfitPerItem || 0;
                let aTurnover = rd.avgTurnoverPerItem || 0;

                // Se as médias vieram zeradas (relatórios antigos), recalcular a partir dos resultados
                if (aProfit === 0 || aTurnover === 0) {
                    const tempResults = rd.results || [];
                    if (tempResults.length > 0) {
                        const sumP = tempResults.reduce((acc: number, curr: any) => acc + (curr.monthlyProfit ?? (curr.totalProfit / mCount)), 0);
                        const sumT = tempResults.reduce((acc: number, curr: any) => acc + (curr.monthlyTurnover ?? (curr.totalQuantity / mCount)), 0);
                        aProfit = sumP / tempResults.length;
                        aTurnover = sumT / tempResults.length;
                    }
                }

                const resultsWithMonthly = rd.results.map((r: any) => {
                    const mP = r.monthlyProfit ?? (r.totalProfit / mCount);
                    const mT = r.monthlyTurnover ?? (r.totalQuantity / mCount);
                    
                    let q: 1 | 2 | 3 | 4 = 4;
                    if (mT >= aTurnover && mP >= aProfit) q = 1;
                    else if (mT < aTurnover && mP >= aProfit) q = 2;
                    else if (mT >= aTurnover && mP < aProfit) q = 3;

                    return {
                        ...r,
                        monthlyProfit: mP,
                        monthlyTurnover: mT,
                        quadrant: q
                    };
                });

                setRawResults(resultsWithMonthly);
                setResults(resultsWithMonthly);
                setMonthCount(mCount);
                setAvgProfitPerItem(aProfit);
                setAvgTurnoverPerItem(aTurnover);

                // Normalizar allProducts para sempre ser um array de objetos enriquecidos
                let baseAllProducts = rd.allProducts || [];
                
                if (baseAllProducts.length === 0 || (baseAllProducts.length > 0 && typeof baseAllProducts[0] === 'string')) {
                    baseAllProducts = resultsWithMonthly.map((r: any) => ({
                        product: r.product,
                        qty: r.totalQuantity,
                        profit: r.totalProfit,
                        supplier: r.supplier
                    }));
                }

                const enrichedAllProducts = baseAllProducts.map((p: any) => {
                    const mP = (p.profit || 0) / mCount;
                    const mT = (p.qty || 0) / mCount;
                    let q: 1 | 2 | 3 | 4 = 4;
                    if (mT >= aTurnover && mP >= aProfit) q = 1;
                    else if (mT < aTurnover && mP >= aProfit) q = 2;
                    else if (mT >= aTurnover && mP < aProfit) q = 3;
                    return { ...p, quadrant: q };
                });

                setAllProducts(enrichedAllProducts);
                setTotalProfit(rd.totalProfit);
                setAbcBasis(data.config?.abcBasis || 'revenue');
                
                // Carregar filtros salvos
                if (data.config?.filters) {
                    const f = data.config.filters;
                    if (f.suppliers) setSelectedSuppliers(f.suppliers);
                    if (f.minProfit) setMinProfit(f.minProfit);
                    if (f.maxProfit) setMaxProfit(f.maxProfit);
                    if (f.search) setSearchTerm(f.search);
                }
                
                if (rd.reportStartDate) setReportStartDate(new Date(rd.reportStartDate));
                if (rd.reportEndDate) setReportEndDate(new Date(rd.reportEndDate));
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao carregar relatório.");
            navigate('/sales-order/reports');
        } finally {
            setLoading(false);
        }
    };

    // Garantir recálculo do monthCount se as datas mudarem (correção em tempo real)
    useEffect(() => {
        if (reportStartDate && reportEndDate && !isNaN(reportStartDate.getTime()) && !isNaN(reportEndDate.getTime())) {
            const months = ((reportEndDate.getFullYear() - reportStartDate.getFullYear()) * 12) + (reportEndDate.getMonth() - reportStartDate.getMonth()) + 1;
            if (months !== monthCount && months > 0) {
                setMonthCount(months);
            }
        }
    }, [reportStartDate, reportEndDate, monthCount]);

    const handleUpdateReport = async (newConfig: any) => {
        setLoading(true);
        try {
            let items: SaleItem[] = [];
            const parseNum = (val: any) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                // Lidar com R$ 1.234,56 ou 1,234.56
                let str = val.toString().replace(/[^\d.,-]/g, '');
                // Se houver vírgula e ponto, assumimos que a vírgula é o separador decimal se for a última
                if (str.includes(',') && str.includes('.')) {
                    if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
                    else str = str.replace(/,/g, '');
                } else if (str.includes(',')) {
                    // Apenas vírgula: assumimos decimal
                    str = str.replace(',', '.');
                }
                const parsed = parseFloat(str);
                return isNaN(parsed) ? 0 : parsed;
            };

            if (newConfig.source === 'erp') {
                items = await fetchFromERP();
            } else {
                if (newConfig.csvData && newConfig.csvData.length > 0) {
                    items = newConfig.csvData
                        .filter((row: any) => {
                            const prodVal = row[newConfig.config.product];
                            return prodVal && prodVal !== newConfig.config.product && prodVal !== 'Nome do Produto';
                        })
                        .map((row: any) => {
                            const dateStr = row[newConfig.config.date];
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
    
                        const qty = parseNum(row[newConfig.config.quantity]);
                        const sVal = parseNum(row[newConfig.config.salesValue]);
                        const cost = parseNum(row[newConfig.config.cost]);
                        const profit = parseNum(row[newConfig.config.profit]);
    
                        return {
                            date, product: row[newConfig.config.product] || 'Nome não encontrado', supplier: row[newConfig.config.supplier] || 'S/ Fornecedor',
                            quantity: qty, cost: cost, salesValue: sVal, profit: profit
                        };
                    });
                } else if (id) {
                    // Se estivermos editando um relatório CSV sem anexar arquivo, usamos o que já temos em memória
                    items = allProducts;
                } else {
                    alert("Para processar dados de CSV, você precisa anexar o arquivo.");
                    setLoading(false);
                    return;
                }
            }
    
            if (newConfig.source === 'erp' && items.length === 0) {
                alert("Nenhum dado encontrado no ERP para o período.");
                setLoading(false);
                return;
            }

            const currentMappings = await fetchProductMappings();
            const reportData = calculateABC(
                items, 
                newConfig.config.abcBasis, 
                true, 
                newConfig.config, 
                currentMappings,
                monthCount // Passamos o monthCount atual para não perder a referência de tempo
            );
            if (!reportData || reportData.results.length === 0) {
                const totalParsed = items.length;
                alert(`A análise resultou em zero resultados úteis (de ${totalParsed} itens). Verifique se as novas colunas selecionadas contêm valores numéricos válidos (Lucro/Venda).`);
                setLoading(false);
                return;
            }

            setIsConfigOpen(false); // Fechar imediatamente para dar feedback de progresso
            await updateReport(id!, newConfig.name, newConfig.source, newConfig.config, reportData);
            
            // Refresh local state
            setReportName(newConfig.name);
            setReportSource(newConfig.source);
            setReportConfig(newConfig.config);
            setRawResults(reportData.results);
            setResults(reportData.results);
            if (reportData.allProducts) setAllProducts(reportData.allProducts);
            setTotalProfit(reportData.totalProfit || 0);
            setMonthCount(reportData.monthCount || 1);
            setAvgProfitPerItem(reportData.avgProfitPerItem || 0);
            setAvgTurnoverPerItem(reportData.avgTurnoverPerItem || 0);
            setAbcBasis(newConfig.config.abcBasis);
            
            if (reportData.reportStartDate) setReportStartDate(reportData.reportStartDate);
            if (reportData.reportEndDate) setReportEndDate(reportData.reportEndDate);
            
            alert("Relatório atualizado com sucesso!");
        } catch (e: any) {
            console.error("Erro ao atualizar relatório:", e);
            alert(`Erro crítico ao atualizar: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save filters
    useEffect(() => {
        if (!id || !reportConfig) return;
        
        const saveTimeout = setTimeout(async () => {
            const newConfig = {
                ...reportConfig,
                filters: {
                    suppliers: selectedSuppliers,
                    minProfit,
                    maxProfit,
                    search: searchTerm
                }
            };
            
            // Apenas salvar se houver mudança real no config
            if (JSON.stringify(newConfig) !== JSON.stringify(reportConfig)) {
                await supabase
                    .from('sales_order_reports')
                    .update({ config: newConfig })
                    .eq('id', id);
                setReportConfig(newConfig);
            }
        }, 1000);

        return () => clearTimeout(saveTimeout);
    }, [selectedSuppliers, minProfit, maxProfit, searchTerm, id]);

    useEffect(() => {
        if (rawResults.length > 0 && selectedSuppliers.length === 0 && !reportConfig?.filters) {
            const suppliers = Array.from(new Set(rawResults.map(r => r.supplier)));
            setSelectedSuppliers(suppliers);
        }
    }, [rawResults, reportConfig]);

    const allSuppliers = useMemo(() => {
        const suppliers = Array.from(new Set(allProducts.map(r => r.supplier)));
        return suppliers.sort();
    }, [allProducts]);

    useEffect(() => {
        applyFilters({
            suppliers: selectedSuppliers,
            minProfit,
            maxProfit,
            search: searchTerm
        }, reportConfig);
    }, [selectedSuppliers, minProfit, maxProfit, searchTerm, rawResults, monthCount]);

    const scatterData = useMemo(() => results.map(r => ({
        x: r.monthlyTurnover || (r.totalQuantity / (monthCount || 1)),
        y: r.monthlyProfit,
        name: r.product,
        quadrant: r.quadrant
    })), [results, monthCount]);

    const chartData = useMemo(() => {
        let accValor = 0;
        const totalItems = results.length;
        const divider = monthCount || 1;
        
        return results.map((i_item, i) => {
            const val = abcBasis === 'revenue' ? (i_item.totalRevenue / divider) : i_item.monthlyProfit;
            accValor += val;
            
            return {
                name: i_item.product.substring(0, 20),
                valor: val,
                lucroAcumulado: accValor,
                numeroItens: i + 1,
                percItens: ((i + 1) / (totalItems || 1)) * 100,
                perc: i_item.accumulatedPercentage,
                class: i_item.classification
            };
        });
    }, [results, abcBasis, monthCount]);

    // Métricas dinâmicas para o refinamento (respeitando fornecedores selecionados)
    const refinementMetrics = useMemo(() => {
        const base = allProducts.filter(i => selectedSuppliers.includes(i.supplier || 'N/A') || selectedSuppliers.length === 0);
        const excluded = (reportConfig?.excludedItems || []).filter((name: string) => base.some(i => i.product === name));
        return {
            total: base.length,
            excluded: excluded.length,
            active: base.length - excluded.length
        };
    }, [allProducts, selectedSuppliers, reportConfig?.excludedItems]);

    if (loading && !results.length) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10">
                <div className="w-16 h-16 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">Carregando Dados Estratégicos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
                {/* Linha 1: Identidade e Métricas Rápidas */}
                <div className="px-6 py-4">
                    <div className="max-w-[1800px] mx-auto flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            {!isPublicMode && (
                                <Link to="/sales-order/reports" className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800">
                                    <i className="bi bi-arrow-left text-lg"></i>
                                </Link>
                            )}
                            <div>
                                <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                                    {isPublicMode && <i className="bi bi-shield-check text-emerald-500 mr-2"></i>}
                                    {reportName}
                                </h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{reportSource === 'erp' ? 'VIA ERP' : 'VIA CSV'}:</span>
                                    <span className="text-xs font-black text-emerald-600">{totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amostragem:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-blue-600">{monthCount} {monthCount === 1 ? 'mês' : 'meses'}</span>
                                        {reportStartDate && reportEndDate && !isNaN(reportStartDate.getTime()) && !isNaN(reportEndDate.getTime()) && (
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                                {format(reportStartDate, 'MM/yyyy')} — {format(reportEndDate, 'MM/yyyy')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Indicadores de Meta no Header */}
                        <div className="hidden lg:flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Giro Mensal Médio</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{avgTurnoverPerItem.toFixed(1)} un/mês</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lucro Mensal Médio</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linha 2: Controles de Navegação e Ações */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 px-6 py-3">
                    <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <button 
                                    onClick={() => setViewMode('product')} 
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'product' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <i className="bi bi-box-seam mr-2"></i>
                                    Desempenho dos Produtos
                                </button>
                                <button 
                                    onClick={() => setViewMode('supplier')} 
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'supplier' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <i className="bi bi-truck mr-2"></i>
                                    Desempenho por Fornecedor
                                </button>
                            </div>

                            {viewMode === 'product' && (
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <button 
                                        onClick={() => setReportType('abc')} 
                                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${reportType === 'abc' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Curva ABC
                                    </button>
                                    <button 
                                        onClick={() => setReportType('matrix')} 
                                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${reportType === 'matrix' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Matriz Giro
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => window.print()}
                                className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
                                title="Imprimir / Exportar PDF"
                            >
                                <i className="bi bi-printer-fill text-sm"></i> 
                                <span className="hidden sm:inline">Imprimir / PDF</span>
                            </button>
                            
                            {!isPublicMode && (
                                <>
                                    <button 
                                        onClick={handleShareWhatsApp}
                                        className="h-10 px-5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest shadow-sm"
                                        title="Compartilhar pelo WhatsApp"
                                    >
                                        <i className="bi bi-whatsapp text-sm"></i> 
                                        <span className="hidden sm:inline">Compartilhar</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsConfigOpen(true)}
                                        className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
                                    >
                                        <i className="bi bi-gear-wide-connected text-sm"></i>
                                        <span className="hidden sm:inline">Configurar</span>
                                    </button>
                                    <button 
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`h-10 px-5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${showFilters ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600'}`}
                                    >
                                        <i className="bi bi-funnel-fill text-sm"></i>
                                        <span className="hidden sm:inline">Filtros</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    @media print {
                        @page {
                            size: landscape;
                            margin: 0.5cm;
                        }
                        body {
                            background: white !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        nav, aside, .print\\:hidden, button, header, .custom-scrollbar::-webkit-scrollbar, .translate-x-full {
                            display: none !important;
                        }
                        main {
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                        .flex-1 {
                            height: auto !important;
                            flex: none !important;
                            overflow: visible !important;
                        }
                        .overflow-y-auto {
                            overflow: visible !important;
                            max-height: none !important;
                        }
                        .max-h-[500px] {
                            max-height: none !important;
                        }
                        .shadow-premium, .shadow-2xl, .shadow-inner, .shadow-sm {
                            box-shadow: none !important;
                            border: 1px solid #f1f5f9 !important;
                        }
                        .bg-slate-950, .dark\\:bg-slate-950, .dark\\:bg-slate-900 {
                            background-color: white !important;
                        }
                        .text-slate-100, .dark\\:text-slate-100, .dark\\:text-white {
                            color: #1e293b !important;
                        }
                        
                        /* Forçar Insights visíveis na impressão */
                        .group-hover\\/insight\\:opacity-100 {
                            opacity: 1 !important;
                            visibility: visible !important;
                            position: relative !important;
                            display: block !important;
                            width: 100% !important;
                            bottom: auto !important;
                            left: auto !important;
                            margin-top: 10px !important;
                            transform: none !important;
                            box-shadow: none !important;
                            border: 1px dashed #cbd5e1 !important;
                            background: #f8fafc !important;
                        }
                        .group\\/insight button {
                            display: none !important;
                        }
                        .group\\/insight::before {
                            content: 'ANÁLISE DE POTENCIAL (INSIGHT)';
                            display: block;
                            font-size: 8px;
                            font-weight: 900;
                            color: #6366f1;
                            letter-spacing: 0.1em;
                            margin-bottom: 5px;
                        }
                    }
                `}</style>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
                        {viewMode === 'product' ? (
                            reportType === 'abc' ? (
                                <>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                                        Análise de Pareto Completa
                                        <div className="flex items-center gap-6">
                                                {refinementMetrics.active} Itens Analisados
                                            <div className="flex gap-4 border-l border-slate-100 dark:border-slate-800 pl-6">
                                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Classe A</span></div>
                                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Classe B</span></div>
                                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Classe C</span></div>
                                            </div>
                                        </div>
                                    </h3>
                                    <div className="h-[450px] overflow-hidden">
                                        <div className="w-full h-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={chartData} margin={{ bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis 
                                                        dataKey="percItens" 
                                                        fontSize={9} 
                                                        fontWeight="900" 
                                                        tickLine={false} 
                                                        axisLine={false} 
                                                        tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                                                    />

                                                    <YAxis 
                                                        yAxisId="left" 
                                                        fontSize={9} 
                                                        fontWeight="900" 
                                                        tickLine={false} 
                                                        axisLine={false} 
                                                        tickFormatter={(val) => {
                                                            if (val >= 1000000) return `R$ ${(val/1000000).toFixed(1)}M`;
                                                            if (val >= 1000) return `R$ ${(val/1000).toFixed(0)}k`;
                                                            return `R$ ${val}`;
                                                        }}
                                                        domain={[0, 'dataMax']}
                                                    />
                                                    <YAxis 
                                                        yAxisId="right" 
                                                        orientation="right" 
                                                        fontSize={9} 
                                                        fontWeight="900" 
                                                        tickLine={false} 
                                                        axisLine={false} 
                                                        tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                                                        domain={[0, 100]}
                                                    />
                                                    <Tooltip 
                                                        formatter={(value, name) => {
                                                            if (name === 'percItens') return [`${Number(value).toFixed(1)}%`, 'da Quantidade de Itens'];
                                                            if (name === 'perc') return [`${Number(value).toFixed(1)}%`, '% do Lucro Total'];
                                                            if (name === 'lucroAcumulado') return [Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Lucro Mensal Acumulado'];
                                                            return [value, name];
                                                        }}
                                                        labelFormatter={(label, payload) => {
                                                            if (payload && payload.length > 0) {
                                                                const p = payload[0].payload;
                                                                return `${p.percItens.toFixed(1)}% dos itens (${p.numeroItens} produtos até ${p.name})`;
                                                            }
                                                            return `${Number(label).toFixed(1)}% dos Itens`;
                                                        }}
                                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }} 
                                                    />

                                                    <Area yAxisId="right" type="monotone" dataKey="perc" stroke="transparent" fill="url(#colorPerc)" strokeWidth={0} dot={false} fillOpacity={0.1} />
                                                    <Line yAxisId="left" type="monotone" dataKey="lucroAcumulado" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                                    <defs>
                                                        <linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800">
                                                <th onClick={() => handleSort('classification')} className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    Classe <SortIcon column="classification" />
                                                </th>
                                                <th onClick={() => handleSort('product')} className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                                                    Produto <SortIcon column="product" />
                                                </th>
                                                <th onClick={() => handleSort('giroMensal')} className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right">
                                                    Giro Mensal <SortIcon column="giroMensal" />
                                                </th>
                                                <th onClick={() => handleSort('totalProfit')} className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right">
                                                    Lucro Total <SortIcon column="totalProfit" />
                                                </th>
                                                <th onClick={() => handleSort('lucroMensal')} className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right">
                                                    Lucro Mensal <SortIcon column="lucroMensal" />
                                                </th>
                                                <th onClick={() => handleSort('accumulatedPercentage')} className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right">
                                                    % Acum. <SortIcon column="accumulatedPercentage" />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {sortedResults.map((res, i) => (
                                                <tr 
                                                    key={i} 
                                                    onClick={() => handleRowClick(res)}
                                                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer active:scale-[0.99]"
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] ${res.classification === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : res.classification === 'B' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                                                            {res.classification}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 max-w-[400px]">
                                                        <p className="text-[12px] font-black text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">{res.product}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{res.supplier}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-right"><span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[11px] font-black text-slate-800 dark:text-slate-200">{(res.totalQuantity / (monthCount || 1)).toFixed(1)}</span></td>
                                                    <td className="px-6 py-5 text-right"><span className="text-[12px] font-black text-emerald-600">{res.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                                                    <td className="px-6 py-5 text-right"><span className="text-[12px] font-black text-indigo-600">{(res.totalProfit / (monthCount || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                                                    <td className="px-8 py-5 text-right text-[11px] font-black text-slate-300">{res.accumulatedPercentage.toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                                        Matriz Giro vs Lucratividade
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
                                            {refinementMetrics.active} Itens Analisados
                                        </span>
                                    </h3>
                                    <div className="h-[500px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 40, right: 120, bottom: 40, left: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
                                                <XAxis type="number" dataKey="x" name="Giro Mensal" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(val) => val.toFixed(1)} domain={['auto', 'auto']} />
                                                <YAxis type="number" dataKey="y" name="Lucro Mensal" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`} domain={['auto', 'auto']} />
                                                <Tooltip 
                                                    cursor={{ strokeDasharray: '3 3' }} 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[200px]">
                                                                    <p className="text-[11px] font-black uppercase text-indigo-600 mb-1">{data.name}</p>
                                                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                                                                        <span className="text-slate-400 font-black uppercase text-[8px]">Lucro Mensal:</span>
                                                                        {data.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </p>
                                                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                                                                        <span className="text-slate-400 font-black uppercase text-[8px]">Giro Mensal:</span>
                                                                        {data.x.toFixed(1)} un.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <ReferenceLine x={avgTurnoverPerItem} stroke="#94a3b8" strokeDasharray="8 8" strokeWidth={1} label={{ position: 'top', value: `MÉD. GIRO: ${avgTurnoverPerItem.toFixed(1)} un/mês`, fill: '#94a3b8', fontSize: 8, fontWeight: 900 }} />
                                                <ReferenceLine y={avgProfitPerItem} stroke="#94a3b8" strokeDasharray="8 8" strokeWidth={1} label={{ position: 'right', value: `MÉD. LUCRO: ${avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, fill: '#94a3b8', fontSize: 8, fontWeight: 900 }} />
                                                <Scatter name="Produtos" data={scatterData}>
                                                    {scatterData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.quadrant === 1 ? '#10b981' : entry.quadrant === 2 ? '#3b82f6' : entry.quadrant === 3 ? '#f59e0b' : '#94a3b8'} fillOpacity={0.8} />
                                                    ))}
                                                </Scatter>
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                        {(() => {
                                            const totalViewQty = results.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0);
                                            const q1ResTotal = results.filter(r => r.quadrant === 1);
                                            const q1ProfitSum = q1ResTotal.reduce((acc, curr) => acc + (curr.totalProfit || 0), 0);
                                            const q1AvgProfitPerItem = q1ResTotal.length > 0 ? q1ProfitSum / q1ResTotal.length : 0;

                                            return [
                                                { id: 1, label: 'Q1: Estrelas', sub: 'Alto Giro Mensal + Alto Lucro Mensal', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/50', text: 'text-emerald-600', valText: 'text-emerald-800 dark:text-emerald-400' },
                                                { id: 2, label: 'Q2: Potencial', sub: 'Baixo Giro Mensal + Alto Lucro Mensal', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-955/20', border: 'border-blue-100 dark:border-blue-900/50', text: 'text-blue-600', valText: 'text-blue-800 dark:text-blue-400' },
                                                { id: 3, label: 'Q3: Volume', sub: 'Alto Giro Mensal + Baixo Lucro Mensal', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-955/20', border: 'border-amber-100 dark:border-amber-900/50', text: 'text-amber-600', valText: 'text-amber-800 dark:text-amber-400' },
                                                { id: 4, label: 'Q4: Problemas', sub: 'Baixo Giro Mensal + Baixo Lucro Mensal', color: 'slate', bg: 'bg-slate-50 dark:bg-slate-950/40', border: 'border-slate-100 dark:border-slate-800/50', text: 'text-slate-500', valText: 'text-slate-800 dark:text-slate-400' },
                                            ].map(q => {
                                                const qResults = results.filter(r => r.quadrant === q.id);
                                                const qProfit = qResults.reduce((acc, curr) => acc + (curr.totalProfit || 0), 0);
                                                const qQty = qResults.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0);
                                                
                                                const qPerc = totalProfit > 0 ? (qProfit / totalProfit) * 100 : 0;
                                                const qItemsPerc = results.length > 0 ? (qResults.length / results.length) * 100 : 0;
                                                const qMonthlyProfit = qProfit / (monthCount || 1);

                                                const qSupplierProfitSum = qResults.reduce((acc, r) => {
                                                    const sAvg = supplierAverages[r.supplier || 'N/A']?.avgProfit || 0;
                                                    return acc + (sAvg * (monthCount || 1));
                                                }, 0);
                                                
                                                return (
                                                    <div key={q.id} className={`${q.bg} p-6 rounded-[2.5rem] border ${q.border} flex flex-col gap-2 shadow-sm transition-all hover:scale-[1.02]`}>
                                                        <div className="flex flex-col mb-2">
                                                            <h4 className={`text-[9px] font-black ${q.text} uppercase tracking-[0.2em]`}>{q.label}</h4>
                                                            <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">{q.sub}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <p className={`text-xl font-black ${q.valText}`}>{qResults.length} <span className="text-[10px] font-bold opacity-60 uppercase">itens</span></p>
                                                            <div className="flex flex-col">
                                                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">{qProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[8px] font-bold opacity-30 ml-1">TOTAL</span></p>
                                                                <p className={`text-[11px] font-black ${q.text}`}>{qMonthlyProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[8px] font-bold opacity-40 ml-1">/ MÊS</span></p>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 mt-1 border-t border-black/5 dark:border-white/5 pt-2">
                                                                <p className={`text-[10px] font-black opacity-60 ${q.text}`}>{qPerc.toFixed(1)}% <span className="text-[8px] uppercase tracking-tighter">do lucro total</span></p>
                                                                <p className={`text-[10px] font-black opacity-60 ${q.text}`}>{qItemsPerc.toFixed(1)}% <span className="text-[8px] uppercase tracking-tighter">da quantidade de itens</span></p>
                                                            </div>
                                                            {q.id !== 1 && qResults.length > 0 && (
                                                                <div className="mt-4 pt-2 -mx-2">
                                                                    <div className="relative group/insight">
                                                                        <button className="flex items-center gap-2 px-3 py-2 bg-white/40 dark:bg-black/10 hover:bg-white dark:hover:bg-indigo-600 hover:text-white rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-help">
                                                                            <i className="bi bi-lightbulb-fill text-amber-500 group-hover/insight:text-white text-[10px]"></i>
                                                                            <span className="text-[8px] font-black uppercase tracking-widest">Ver Insights</span>
                                                                        </button>
                                                                        
                                                                        <div className="absolute bottom-full left-0 mb-3 w-[400px] p-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover/insight:opacity-100 group-hover/insight:visible transition-all z-50 transform translate-y-2 group-hover/insight:translate-y-0">
                                                                            <div className="flex items-center gap-3 mb-6">
                                                                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                                                                    <i className="bi bi-graph-up-arrow text-indigo-600 dark:text-indigo-400 text-lg"></i>
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none mb-1">Análise de Potencial</h5>
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Simulações de Melhoria de Margem</p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-6">
                                                                                {/* Coluna 1: Cenário Realista (Benchmark SALVADOS) */}
                                                                                <div className={`flex flex-col gap-4 ${!salvadosBenchmark ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                                                                                        <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Padrão SALVADOS</h6>
                                                                                    </div>
                                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">
                                                                                        {salvadosBenchmark 
                                                                                            ? "Simula elevar itens para o lucro médio do fornecedor Salvados." 
                                                                                            : "Fornecedor SALVADOS não encontrado neste relatório."}
                                                                                    </p>
                                                                                    
                                                                                    {salvadosBenchmark && [100, 50, 25].map(perc => {
                                                                                        const ratio = perc / 100;
                                                                                        const scenarioProfit = (qResults.length * ratio * salvadosBenchmark * (monthCount || 1)) + (qProfit * (1 - ratio));
                                                                                        const profitIncrease = scenarioProfit - qProfit;
                                                                                        const monthlyIncrease = profitIncrease / (monthCount || 1);

                                                                                        return (
                                                                                            <div key={perc} className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/20 transition-all">
                                                                                                <div className="flex justify-between items-center mb-1">
                                                                                                    <span className="text-[9px] font-black text-slate-600">{perc}% dos itens</span>
                                                                                                    <span className="text-[9px] font-black text-emerald-600">+{monthlyIncrease.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/mês</span>
                                                                                                </div>
                                                                                                <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                                    <div className="h-full bg-indigo-500" style={{ width: `${perc}%` }}></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                {/* Coluna 2: Cenário Otimista (Benchmark Q1) */}
                                                                                <div className="flex flex-col gap-4">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-2 h-4 bg-emerald-500 rounded-full"></div>
                                                                                        <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Meta Estrela (Q1)</h6>
                                                                                    </div>
                                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">Simula elevar itens para a média geral dos melhores itens (Q1).</p>

                                                                                    {[100, 50, 25].map(perc => {
                                                                                        const ratio = perc / 100;
                                                                                        const scenarioProfit = (qResults.length * ratio * q1AvgProfitPerItem) + (qProfit * (1 - ratio));
                                                                                        const profitIncrease = scenarioProfit - qProfit;
                                                                                        const monthlyIncrease = profitIncrease / (monthCount || 1);

                                                                                        return (
                                                                                            <div key={perc} className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all">
                                                                                                <div className="flex justify-between items-center mb-1">
                                                                                                    <span className="text-[9px] font-black text-slate-600">{perc}% dos itens</span>
                                                                                                    <span className="text-[9px] font-black text-emerald-600">+{monthlyIncrease.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/mês</span>
                                                                                                </div>
                                                                                                <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                                    <div className="h-full bg-emerald-500" style={{ width: `${perc}%` }}></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    {salvadosBenchmark ? (
                                                                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                                                                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Média SALVADOS</p>
                                                                                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">R$ {salvadosBenchmark.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / item</p>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Média SALVADOS</p>
                                                                                            <p className="text-[11px] font-black text-slate-400 italic">Não disponível</p>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                                                                                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Média Estrela (Q1)</p>
                                                                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">R$ {(q1AvgProfitPerItem / (monthCount || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / item</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800 rotate-45"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pb-10">
                                    {[1, 2, 3, 4].map(q => (
                                        <div key={q} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 flex flex-col min-h-[400px] overflow-hidden">
                                            <div className={`p-8 border-b ${q === 1 ? 'border-emerald-100 bg-emerald-50/30' : q === 2 ? 'border-blue-100 bg-blue-50/30' : q === 3 ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100 bg-slate-50/30'}`}>
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">
                                                        {q === 1 ? 'Q1: ESTRELAS' : q === 2 ? 'Q2: POTENCIAL' : q === 3 ? 'Q3: VOLUME' : 'Q4: PROBLEMAS'}
                                                    </h3>
                                                    <i className={`bi ${q === 1 ? 'bi-stars' : q === 2 ? 'bi-lightning-fill' : q === 3 ? 'bi-box-seam-fill' : 'bi-exclamation-triangle-fill'} text-xs opacity-50`}></i>
                                                </div>
                                                <p className="text-[7px] font-black opacity-60 uppercase tracking-widest">
                                                    {q === 1 ? 'Alto Giro + Alto Lucro' : q === 2 ? 'Baixo Giro + Alto Lucro' : q === 3 ? 'Alto Giro + Baixo Lucro' : 'Baixo Giro + Baixo Lucro'}
                                                </p>
                                            <div className="flex-1 overflow-y-auto">
                                                <table className="w-full">
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                        {results.filter(r => r.quadrant === q).map((res, i) => (
                                                            <tr 
                                                                key={i} 
                                                                onClick={() => handleRowClick(res)}
                                                                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer active:scale-[0.98]"
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">{res.product}</p>
                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{res.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    ) : (
                        <SupplierPerformanceView results={results} monthCount={monthCount} />
                    )}
                    </div>
                </div>

                <aside className={`${showFilters ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden flex flex-col`}>
                    <div className="p-8 flex flex-col gap-8 w-80">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filtros Ativos</h3>
                            <button onClick={() => setShowFilters(false)} className="text-slate-300 hover:text-red-500 transition-colors"><i className="bi bi-x-lg"></i></button>
                        </div>

                        <div className="flex flex-col gap-8">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Busca</label>
                                <div className="relative">
                                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar produtos..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold shadow-inner" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Lucratividade Mínima / Máxima</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">Min</span>
                                        <input 
                                            type="number" 
                                            value={minProfit || ''} 
                                            onChange={(e) => setMinProfit(Number(e.target.value))} 
                                            placeholder="0" 
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-2 py-3 text-[11px] font-bold shadow-inner" 
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">Max</span>
                                        <input 
                                            type="number" 
                                            value={maxProfit || ''} 
                                            onChange={(e) => setMaxProfit(Number(e.target.value))} 
                                            placeholder="∞" 
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-2 py-3 text-[11px] font-bold shadow-inner" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fornecedores</label>
                                    <button 
                                        onClick={() => selectedSuppliers.length === allSuppliers.length ? setSelectedSuppliers([]) : setSelectedSuppliers(allSuppliers)}
                                        className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
                                    >
                                        {selectedSuppliers.length === allSuppliers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                    {allSuppliers.map(s => (
                                        <label key={s} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedSuppliers.includes(s) ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={selectedSuppliers.includes(s)} onChange={(e) => e.target.checked ? setSelectedSuppliers([...selectedSuppliers, s]) : setSelectedSuppliers(selectedSuppliers.filter(x => x !== s))} className="hidden" />
                                            <i className={`bi ${selectedSuppliers.includes(s) ? 'bi-check-circle-fill' : 'bi-circle'} text-lg`}></i>
                                            <span className="text-[11px] font-black truncate">{s}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-5 block">Refinamento de Dados</label>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => setIsExclusionOpen(true)}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-900 transition-all group shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                                            <i className="bi bi-filter-square-fill text-lg"></i>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase">Gerenciar Itens</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">
                                                {refinementMetrics.excluded} excluídos / {refinementMetrics.active} ativos
                                            </p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => setIsReferenceOpen(true)}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-900 transition-all group shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                                            <i className="bi bi-tag-fill text-lg"></i>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase">Referências</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Mapear itens duplicados</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-5 block">Ordenação do Relatório</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: 'accumulatedPercentage', label: 'Participação no Lucro' },
                                        { key: 'giroMensal', label: 'Giro Mensal' },
                                        { key: 'lucroMensal', label: 'Lucro Mensal' },
                                        { key: 'product', label: 'Nome do Produto' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.key}
                                            onClick={() => handleSort(opt.key)}
                                            className={`flex items-center justify-between p-4 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${sortConfig.key === opt.key ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600'}`}
                                        >
                                            {opt.label}
                                            {sortConfig.key === opt.key && <i className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'down' : 'up'}`}></i>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            <ReportConfigModal 
                isOpen={isConfigOpen} 
                onClose={() => setIsConfigOpen(false)} 
                onSave={handleUpdateReport} 
                initialConfig={reportConfig}
                initialSource={reportSource}
                initialName={reportName}
                initialExcludedItems={reportConfig?.excludedItems || []}
                availableItems={rawResults.map(r => ({ product: r.product, qty: r.totalQuantity, profit: r.totalProfit, supplier: r.supplier }))}
                loading={loading}
            />

            <ItemExclusionModal 
                isOpen={isExclusionOpen}
                onClose={() => setIsExclusionOpen(false)}
                items={allProducts.filter(i => selectedSuppliers.includes(i.supplier || 'N/A') || selectedSuppliers.length === 0)}
                initialExcludedItems={reportConfig?.excludedItems || []}
                onConfirm={(nextExcluded: string[]) => {
                    setReportConfig((prev: any) => {
                        const nextConfig = { ...prev, excludedItems: nextExcluded };
                        handleUpdateReport({ name: reportName, source: reportSource, config: nextConfig });
                        return nextConfig;
                    });
                }}
            />

            <ProductReferenceModal 
                isOpen={isReferenceOpen}
                onClose={() => setIsReferenceOpen(false)}
                availableProducts={rawResults.map(i => ({ name: i.product, supplier: i.supplier || '' }))}
            />

            {hoveredResult && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-fade-in" onClick={handleCloseModal}></div>
                    <div 
                        className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-[4rem] shadow-2xl w-full max-w-[550px] flex flex-col gap-10 animate-scale-in"
                    >
                        <button 
                            onClick={handleCloseModal}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
                        >
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>

                        <div className="flex justify-between items-start pr-12">
                            <div className="flex-1">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">Análise Estratégica</h4>
                                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-[1.1] tracking-tighter">{hoveredResult.product}</p>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-3">{hoveredResult.supplier}</p>
                            </div>
                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner ${hoveredResult.classification === 'A' ? 'bg-blue-50 text-blue-600' : hoveredResult.classification === 'B' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                                {hoveredResult.classification}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Giro Período</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-blue-500">{hoveredResult.totalQuantity} <span className="text-[10px] font-bold opacity-40 uppercase ml-1">un.</span></span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Preço de Custo</span>
                                <span className="text-2xl font-black text-amber-600">{(hoveredResult.avgCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Giro Mensal</span>
                                <span className="text-2xl font-black text-indigo-600">{(hoveredResult.totalQuantity / (monthCount || 1)).toFixed(1)} <span className="text-[10px] font-bold opacity-40 uppercase ml-1">un.</span></span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-end py-5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Faturamento Período</span>
                                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{hoveredResult.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between items-end py-5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Lucro Total Acumulado</span>
                                <span className="text-xl font-black text-emerald-600">{hoveredResult.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between items-end p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-500/30 mt-4">
                                <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">Lucro Médio/Mês</span>
                                <span className="text-2xl font-black text-white">{hoveredResult.monthlyProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-955 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                Participação no Lucro Total: <span className="text-indigo-600 ml-1">{hoveredResult.accumulatedPercentage.toFixed(2)}%</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportView;
