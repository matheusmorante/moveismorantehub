import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';

import { blingService } from '@/pages/services/blingService';

const BlingStock: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            handleOAuthCallback(code);
        } else {
            loadProducts();
        }
    }, [page]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await blingService.fetchProducts({ 
                pagina: page,
                limite: 20,
                criterio: 1,
                pesquisa: searchTerm || undefined
            });
            setProducts(data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar produtos do Bling.");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthCallback = async (code: string) => {
        setLoading(true);
        const toastId = toast.loading("Conectando ao Bling...");
        try {
            await blingService.exchangeCode(code);
            toast.update(toastId, { render: "Conta Bling conectada com sucesso! 🚀", type: "success", isLoading: false, autoClose: 5000 });
            window.history.replaceState({}, document.title, window.location.pathname);
            loadProducts();
        } catch (err) {
            toast.update(toastId, { render: "Erro na autenticação. Verifique as credenciais.", type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setLoading(false);
        }
    };

    // Ordenação e Agrupamento
    const sortedProducts = useMemo(() => {
        const productNameMap = new Map();
        products.forEach(p => productNameMap.set(p.id.toString(), p.nome));

        return [...products].sort((a, b) => {
            const idPaiA = a.idProdutoPai?.toString();
            const idPaiB = b.idProdutoPai?.toString();

            const refNameA = idPaiA ? (productNameMap.get(idPaiA) || a.nome) : a.nome;
            const refNameB = idPaiB ? (productNameMap.get(idPaiB) || b.nome) : b.nome;

            if (refNameA !== refNameB) {
                return refNameA.localeCompare(refNameB);
            }

            if (!idPaiA && idPaiB) return -1;
            if (idPaiA && !idPaiB) return 1;

            return a.nome.localeCompare(b.nome);
        });
    }, [products]);

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleViewDetail = (product: any) => {
        setSelectedProduct(product);
        setIsDetailOpen(true);
    };

    return (
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-reveal">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-premium-lg">
                        <i className="bi bi-clouds-fill text-3xl"></i>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">
                            Estoque <span className="text-blue-600">Bling</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            Página {page} • Sincronização v3
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-premium-sm flex items-center gap-4 group focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                        <i className="bi bi-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="Pesquisar no Bling..." 
                            className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 w-48 lg:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setPage(1);
                                    loadProducts();
                                }
                            }}
                        />
                    </div>
                    
                    <button 
                        onClick={() => { setPage(1); loadProducts(); }}
                        disabled={loading}
                        className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:shadow-premium-md transition-all active:scale-95"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-arrow-clockwise text-xl"></i>}
                    </button>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm disabled:opacity-30 transition-all"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <span className="px-4 text-[10px] font-black uppercase text-slate-500">{page}</span>
                        <button 
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading || products.length < 20}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm disabled:opacity-30 transition-all"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-premium-lg">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-8 py-6">Produto</th>
                            <th className="px-8 py-6 text-center">SKU/Código</th>
                            <th className="px-8 py-6 text-center">Saldo / Mínimo</th>
                            <th className="px-8 py-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedProducts.length > 0 ? sortedProducts.map((product) => {
                            const isChild = !!product.idProdutoPai;
                            const isParent = product.formato === 'V';
                            const saldo = product.estoque?.saldoTotal || 0;
                            const estoqueMinimo = product.estoqueMinimo || 0;
                            const isLowStock = saldo <= estoqueMinimo && saldo > 0;
                            const isOutOfStock = saldo <= 0;

                            return (
                                <tr key={product.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${isChild ? 'bg-slate-50/20' : ''}`}>
                                    <td className="px-8 py-6">
                                        <div className={`relative flex items-center gap-4 ${isChild ? 'ml-12' : ''}`}>
                                            {isChild && <div className="absolute -left-8 top-[-30px] w-6 h-[46px] border-l-2 border-b-2 border-slate-200 dark:border-slate-700 rounded-bl-xl"></div>}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm ${isChild ? 'bg-amber-50 text-amber-500 scale-90' : 'bg-slate-100 text-slate-400'}`}>
                                                <i className={`bi ${isChild ? 'bi-dot' : (isParent ? 'bi-stack' : 'bi-box-seam')}`}></i>
                                            </div>
                                            <div>
                                                <p className={`text-[12px] font-black uppercase truncate max-w-xs ${isChild ? 'text-slate-500 font-bold' : 'text-slate-800 dark:text-white'}`}>{product.nome}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {isChild ? 'Variação' : (isParent ? 'Produto com variações' : 'Produto Simples')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono font-bold text-slate-500">{product.codigo || '---'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-black ${isOutOfStock ? 'bg-rose-50 text-rose-600' : (isLowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}`}>
                                            <i className={`bi ${isOutOfStock ? 'bi-x-circle-fill' : (isLowStock ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill')}`}></i>
                                            {saldo} / <span className="text-[10px] opacity-60">{estoqueMinimo}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => handleViewDetail(product)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : !loading && (
                            <tr><td colSpan={4} className="px-8 py-20 text-center"><i className="bi bi-inbox text-4xl text-slate-200 mb-4 block"></i><p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Nenhum produto encontrado</p></td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalhes Premium */}
            {isDetailOpen && selectedProduct && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 scrollbar-hide">
                        {/* Header do Modal */}
                        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 pb-4 z-20">
                            <button 
                                onClick={() => setIsDetailOpen(false)} 
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white text-3xl mb-4">
                                    <i className="bi bi-box-seam"></i>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2 px-4">
                                    {selectedProduct.nome}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        SKU: {selectedProduct.codigo || 'S/ SKU'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Corpo do Modal */}
                        <div className="p-8 pt-0 space-y-4">
                            {/* Grid de Informações Financeiras e Técnicas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Valores & Peso</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                            <span className="text-slate-400 uppercase">Venda:</span>
                                            <span className="text-blue-600">R$ {parseFloat(selectedProduct.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                            <span className="text-slate-400 uppercase">Custo:</span>
                                            <span className="text-slate-500">R$ {parseFloat(selectedProduct.precoCusto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                            <span className="text-slate-400 uppercase">Peso:</span>
                                            <span className="text-slate-500">{selectedProduct.pesoBruto || '0'} kg</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Localização</p>
                                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase truncate">
                                        {selectedProduct.localizacao || 'NÃO DEF.'}
                                    </p>
                                </div>
                            </div>

                            {/* Card de Estoque de Destaque */}
                            <div className={`p-6 rounded-[2rem] border-2 transition-all ${(selectedProduct.estoque?.saldoTotal || 0) <= (selectedProduct.estoqueMinimo || 0) ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/40' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/40'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${(selectedProduct.estoque?.saldoTotal || 0) <= (selectedProduct.estoqueMinimo || 0) ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                            <i className={`bi ${(selectedProduct.estoque?.saldoTotal || 0) <= (selectedProduct.estoqueMinimo || 0) ? 'bi-exclamation-octagon-fill' : 'bi-check-all'}`}></i>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo de Estoque</p>
                                            <p className={`text-[11px] font-black uppercase ${(selectedProduct.estoque?.saldoTotal || 0) <= (selectedProduct.estoqueMinimo || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {(selectedProduct.estoque?.saldoTotal || 0) <= (selectedProduct.estoqueMinimo || 0) ? 'Reposição Necessária' : 'Estoque em Dia'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex flex-col items-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Atual</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedProduct.estoque?.saldoTotal || 0}</p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex flex-col items-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mínimo</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedProduct.estoqueMinimo || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rodapé do Modal */}
                        <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 pt-0 z-20">
                            <button 
                                onClick={() => setIsDetailOpen(false)} 
                                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Fechar agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlingStock;
