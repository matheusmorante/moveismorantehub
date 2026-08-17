/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { whatsappGraphService, WhatsAppProduct } from '../../utils/whatsappGraphService';
import { toast } from 'react-toastify';
import { syncFromWhatsApp } from '@/pages/utils/productService';

export default function WhatsAppMarketplace() {
    const [products, setProducts] = useState<WhatsAppProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const data = await whatsappGraphService.fetchCatalogProducts();
            setProducts(data);
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar o catálogo do WhatsApp.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadCatalog();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadCatalog();
    };

    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [isResending, setIsResending] = useState<string | null>(null);

    const handleSyncProduct = async (product: WhatsAppProduct) => {
        setIsSyncing(product.id);
        try {
            await syncFromWhatsApp(product);
            toast.success(`Fotos e descrição de "${product.name}" sincronizadas!`);
        } catch (error: any) {
            toast.error(error.message || "Erro ao sincronizar produto.");
        } finally {
            setIsSyncing(null);
        }
    };

    const handleForceResendToMeta = async (product: WhatsAppProduct) => {
        setIsResending(product.id);
        try {
            // Prepara um payload para atualizar/recriar na API Meta
            const payload = {
                id: product.id,
                retailer_id: product.retailer_id,
                name: product.name,
                description: product.description || product.name,
                price: parseFloat(product.price || '0'),
                unitPrice: parseFloat(product.price || '0'),
                images: product.image_url ? [product.image_url] : [],
                stock: 10, // Default stock para garantir elegibilidade
                active: true
            };
            
            // Dispara UPDATE na Meta para forçar reanálise e atualizar o canal
            await whatsappGraphService.syncProductToCatalog(payload, 'UPDATE');
            toast.success(`Solicitação de reenvio de "${product.name}" enviada ao WhatsApp com sucesso!`);
        } catch (error: any) {
            toast.error(error.message || "Erro ao reenviar para o WhatsApp.");
        } finally {
            setIsResending(null);
        }
    };

    const handleSyncAll = async () => {
        if (!window.confirm(`Deseja tentar sincronizar as fotos e textos dos ${products.length} produtos do WhatsApp com os correspondentes no ERP?`)) return;
        
        setLoading(true);
        let successCount = 0;
        try {
            for (const product of products) {
                // Ignore erros individuais na sincronização em lote para não interromper tudo
                try {
                    await syncFromWhatsApp(product);
                    successCount++;
                } catch (e) {
                    console.warn(`Pulando produto ${product.name}: não encontrado correspondente no ERP.`);
                }
            }
            if (successCount > 0) {
                toast.success(`${successCount} produtos sincronizados com sucesso! ✨`);
            } else {
                toast.warn("Nenhum produto correspondente foi encontrado no ERP para sincronizar.");
            }
        } catch (error: any) {
            toast.error("Erro durante o processo de sincronização em lote.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-10 max-w-7xl mx-auto py-12 px-6 min-h-screen animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-slide-down">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                        <i className="bi bi-whatsapp"></i> WhatsApp Business
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Marketplace WhatsApp</h1>
                    <p className="text-slate-500 dark:text-slate-500 mt-2 text-base font-medium">Sincronização e visualização do catálogo oficial da Móveis Morante.</p>
                </div>

                <div className="flex items-center gap-3">
                    {products.length > 0 && (
                        <button 
                            onClick={handleSyncAll}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 text-sm font-bold shadow-xl shadow-blue-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                        >
                            <i className="bi bi-cloud-arrow-down-fill"></i>
                            Sincronizar Imagens
                        </button>
                    )}
                    <button 
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:border-green-500 dark:hover:border-green-500 hover:text-green-600 transition-all shadow-xl shadow-slate-200/20 dark:shadow-none disabled:opacity-50"
                    >
                        <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'animate-spin' : ''}`}></i>
                        Sincronizar Catálogo
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-green-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Acessando Meta API...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-24 flex flex-col items-center gap-6">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                        <i className="bi bi-box-seam text-4xl text-slate-300 dark:text-slate-700"></i>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Nenhum produto encontrado</h3>
                        <p className="text-slate-500 dark:text-slate-500 text-sm mt-2 max-w-sm">
                            Seu catálogo no WhatsApp está vazio ou as credenciais nas configurações estão incorretas.
                        </p>
                    </div>
                    <a href="/settings" className="px-8 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl">
                        Verificar Configurações
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 flex flex-col h-full">
                            <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800">
                                {product.image_url ? (
                                    <img 
                                        src={product.image_url} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <i className="bi bi-image text-slate-200 dark:text-slate-700 text-6xl"></i>
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                    <div className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 shadow-lg border border-white dark:border-slate-800">
                                        Meta ID: {product.retailer_id}
                                    </div>
                                    <button 
                                        onClick={() => handleSyncProduct(product)}
                                        disabled={isSyncing === product.id}
                                        className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-400"
                                        title="Sincronizar imagem com produto ERP correspondente"
                                    >
                                        {isSyncing === product.id ? (
                                            <i className="bi bi-arrow-repeat animate-spin"></i>
                                        ) : (
                                            <i className="bi bi-cloud-arrow-down-fill"></i>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => handleForceResendToMeta(product)}
                                        disabled={isResending === product.id}
                                        className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:bg-slate-400"
                                        title="Forçar reenvio/recriação na API Meta do WhatsApp"
                                    >
                                        {isResending === product.id ? (
                                            <i className="bi bi-arrow-repeat animate-spin"></i>
                                        ) : (
                                            <i className="bi bi-whatsapp"></i>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex flex-col flex-1 gap-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight group-hover:text-green-600 transition-colors">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 line-clamp-2">
                                        {product.description || "Sem descrição no catálogo."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Preço Catalog</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            {product.currency} {product.price}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => window.open(product.url, '_blank')}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-green-500 hover:text-white rounded-2xl transition-all active:scale-95"
                                        title="Ver no WhatsApp"
                                    >
                                        <i className="bi bi-box-arrow-up-right text-lg"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <footer className="mt-24 p-12 bg-slate-950 rounded-[3rem] text-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <i className="bi bi-whatsapp text-[20rem] absolute -bottom-24 -right-24 rotate-12 text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-white relative z-10">Sincronização Ativa</h3>
                <p className="text-slate-400 mt-2 text-base relative z-10 max-w-xl mx-auto leading-relaxed">
                    Você pode sincronizar as fotos e textos do WhatsApp para que eles apareçam direto nos produtos correspondentes no seu ERP (fazendo match pelo Código/Nome).
                </p>
            </footer>
        </div>
    );
}
