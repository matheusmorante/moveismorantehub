import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { Product, Variation } from '@/pages/types/product.type';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { updateProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';

const ChannelCatalog: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'ecommerce'>('all');
    const [apiError, setApiError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            // Check settings
            const settings = getSettings();
            if (!settings.whatsappConfig?.accessToken || !settings.whatsappConfig?.catalogId) {
                setApiError("Configurações do WhatsApp incompletas. Vá em Configurações > WhatsApp para ajustar.");
            }

            // Fetch products and their variations
            const { data: productsData, error: pError } = await supabase
                .from('products')
                .select(`
                    *,
                    variations(*)
                `)
                .eq('deleted', false)
                .order('description');

            if (pError) throw pError;
            setProducts(productsData || []);
        } catch (error: any) {
            toast.error("Erro ao carregar catálogo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleWhatsAppSync = async (product: any) => {
        const newValue = !product.whatsapp_sync;
        setIsActionLoading(product.id + '_wa');
        
        try {
            // 1. Sync with Meta API
            if (newValue) {
                await whatsappGraphService.syncProductToCatalog(product, 'UPDATE');
            } else {
                await whatsappGraphService.deleteProductFromCatalog(product.code || product.id);
            }

            // 2. Update local database
            await updateProduct(product.id, { 
                whatsappSync: newValue,
                lastWhatsappSync: new Date().toISOString()
            } as any);

            toast.success(newValue ? "Publicado no WhatsApp!" : "Removido do WhatsApp!");
            
            // Update local state
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, whatsapp_sync: newValue } : p));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar visibilidade");
            if (error.message?.includes("Bloqueado")) {
                setApiError(error.message);
            }
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleToggleAutoSync = async (product: any) => {
        const newValue = !product.whatsapp_auto_sync;
        setIsActionLoading(product.id + '_auto');
        
        try {
            await updateProduct(product.id, { whatsappAutoSync: newValue } as any);
            toast.success(newValue ? "Sincronização automática ativada!" : "Sincronização automática desativada.");
            
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, whatsapp_auto_sync: newValue } : p));
        } catch (error: any) {
            toast.error("Erro ao alternar auto-sync");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleSyncAllActive = async () => {
        const toSync = products.filter(p => p.whatsapp_sync);
        if (toSync.length === 0) {
            toast.info("Nenhum produto marcado para sincronizar.");
            return;
        }

        if (!window.confirm(`Deseja atualizar a publicação de ${toSync.length} produtos no WhatsApp agora?`)) return;

        setLoading(true);
        let count = 0;
        let errors = 0;

        for (const p of toSync) {
            try {
                await whatsappGraphService.syncProductToCatalog(p, 'UPDATE');
                await updateProduct(p.id, { lastWhatsappSync: new Date().toISOString() } as any);
                count++;
            } catch (err) {
                console.error(`Erro ao sincronizar ${p.description}:`, err);
                errors++;
            }
        }

        setLoading(false);
        if (count > 0) toast.success(`${count} produtos atualizados com sucesso!`);
        if (errors > 0) toast.error(`${errors} produtos falharam na sincronização.`);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.description?.toLowerCase().includes(search.toLowerCase()) || 
                             p.code?.toLowerCase().includes(search.toLowerCase());
        
        if (filterChannel === 'whatsapp') return matchesSearch && p.whatsapp_sync;
        if (filterChannel === 'ecommerce') return matchesSearch && p.ecommerce_sync;
        return matchesSearch;
    });

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight italic">
                        Catálogo de <span className="text-blue-600">Canais</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Gestão de Visibilidade e Marketplaces</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleSyncAllActive}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                    >
                        <i className="bi bi-cloud-upload-fill mr-2"></i>
                        Atualizar WhatsApp
                    </button>

                    <div className="relative group">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="BUSCAR PRODUTO OU SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value.toUpperCase())}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                        />
                    </div>

                    <select 
                        value={filterChannel}
                        onChange={(e: any) => setFilterChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 px-6 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
                    >
                        <option value="all">TODOS OS CANAIS</option>
                        <option value="whatsapp">WHATSAPP SHOP</option>
                        <option value="ecommerce">LOJA VIRTUAL</option>
                    </select>

                    <button 
                        onClick={fetchData}
                        className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all border border-blue-100 dark:border-blue-800"
                    >
                        <i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {apiError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-6 rounded-[2rem] flex items-center gap-4 animate-shake">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                        <i className="bi bi-exclamation-triangle-fill text-xl"></i>
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">Erro de Acesso à API</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-500 mt-1 font-medium">{apiError}</p>
                    </div>
                    <a href="/settings#whatsapp" className="ml-auto px-6 py-3 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                        Resolver
                    </a>
                </div>
            )}

            {/* Catalog List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sincronizando Canais...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                        <i className="bi bi-search text-4xl text-slate-200 mb-4 font-black"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum produto encontrado</p>
                    </div>
                ) : (
                    filteredProducts.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm hover:shadow-premium transition-all group overflow-hidden relative">
                             {/* Side progress Bar */}
                             <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

                             <div className="flex flex-col lg:flex-row items-center gap-6">
                                {/* Image Box */}
                                <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-950 flex-shrink-0 border border-slate-100 dark:border-slate-800 overflow-hidden relative group/img">
                                    {p.images && p.images[0] ? (
                                        <img src={p.images[0]} alt={p.description} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                                            <i className="bi bi-image text-2xl font-black"></i>
                                        </div>
                                    )}
                                    <div className="absolute top-1 right-1 px-2 py-0.5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md rounded-lg text-[7px] font-black text-slate-600 dark:text-slate-400 uppercase">
                                        {p.code || 'S/ SKU'}
                                    </div>
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 text-center lg:text-left min-w-0">
                                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-1 flex-wrap">
                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800 flex-shrink-0">
                                            {p.groupName || 'TIPO NÃO DEFINIDO'}
                                        </span>
                                        {p.line && (
                                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800 flex-shrink-0">
                                                LINHA {p.line}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
                                        {p.description}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        ESTOQUE: <span className={p.stock > 0 ? 'text-emerald-500' : 'text-rose-500'}>{p.stock} UNIDADES</span> | VALOR: R$ {p.unitPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {/* Channel Status & Actions */}
                                <div className="flex items-center gap-6 px-8 border-x border-slate-50 dark:border-slate-800/50">
                                    {/* WhatsApp */}
                                    <div className="flex flex-col items-center gap-2 group/ch relative">
                                        <button 
                                            onClick={() => handleToggleWhatsAppSync(p)}
                                            disabled={isActionLoading === p.id + '_wa'}
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${p.whatsapp_sync ? 'bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/10 border-2 border-emerald-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800 grayscale'}`}
                                            title={p.whatsapp_sync ? "Publicado no WhatsApp. Clique para remover." : "Não publicado. Clique para publicar no WhatsApp."}
                                        >
                                            {isActionLoading === p.id + '_wa' ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-whatsapp text-xl"></i>}
                                        </button>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${p.whatsapp_sync ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {p.whatsapp_sync ? 'Publicado' : 'Não Pub.'}
                                        </span>
                                    </div>

                                    {/* Auto-Sync Toggle */}
                                    <div className="flex flex-col items-center gap-2 group/ch">
                                        <button 
                                            onClick={() => handleToggleAutoSync(p)}
                                            disabled={isActionLoading === p.id + '_auto'}
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${p.whatsapp_auto_sync ? 'bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10 border-2 border-blue-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800 grayscale'}`}
                                            title={p.whatsapp_auto_sync ? "Auto-Sync Ativado: Atualiza WhatsApp se o estoque mudar." : "Auto-Sync Desativado."}
                                        >
                                            {isActionLoading === p.id + '_auto' ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-magic text-xl"></i>}
                                        </button>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${p.whatsapp_auto_sync ? 'text-blue-600' : 'text-slate-400'}`}>
                                            Auto-Sync
                                        </span>
                                    </div>

                                    {/* E-commerce (Read Only for now) */}
                                    <div className="flex flex-col items-center gap-2 group/ch">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${p.ecommerce_sync ? 'bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800 grayscale'}`}>
                                            <i className="bi bi-globe text-xl"></i>
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${p.ecommerce_sync ? 'text-blue-600' : 'text-slate-400'}`}>Site</span>
                                    </div>
                                </div>

                                {/* Status Toggle View */}
                                <div className="flex flex-col items-center gap-2 w-32">
                                    <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {p.active ? 'Ativo' : 'Inativo'}
                                    </div>
                                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">
                                        Sinc: {p.last_whatsapp_sync ? new Date(p.last_whatsapp_sync).toLocaleDateString() : 'NUNCA'}
                                    </p>
                                </div>
                             </div>

                             {/* Variations Section */}
                             {p.variations && p.variations.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <i className="bi bi-layers-fill text-slate-300 dark:text-slate-700"></i>
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            Variações ({p.variations.length})
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                        {p.variations.map((v: any) => (
                                            <div key={v.id} className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center group/var shadow-sm">
                                                <p className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase truncate mb-1">
                                                    {v.description || 'VARIAÇÃO'}
                                                </p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${v.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500 grayscale'}`}></div>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Estoque: {v.stock}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChannelCatalog;
