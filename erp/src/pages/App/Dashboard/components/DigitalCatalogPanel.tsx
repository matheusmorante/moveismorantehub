import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export default function DigitalCatalogPanel() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        products: 0,
        published: 0,
        draft: 0,
        categories: 0
    });
    const [analytics, setAnalytics] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [productsRes, categoriesRes, analyticsRes] = await Promise.all([
                    supabase.from("products").select("id, status, product_variations(id, status)").is("deleted_at", null),
                    supabase.from("categories").select("id", { count: 'exact' }),
                    supabase
                        .from("product_analytics")
                        .select("id, product_id, visitor_id, created_at")
                        .order("created_at", { ascending: false })
                        .limit(2000)
                ]);

                let totalProductsCount = 0;
                let publishedCount = 0;
                let draftCount = 0;

                if (productsRes.data) {
                    productsRes.data.forEach((p: any) => {
                        const variations = p.product_variations || [];
                        if (variations.length === 0) {
                            totalProductsCount += 1;
                            if (p.status === "published") publishedCount += 1;
                            else draftCount += 1;
                        } else {
                            totalProductsCount += variations.length;
                            variations.forEach((v: any) => {
                                if (v.status === "published") publishedCount += 1;
                                else draftCount += 1;
                            });
                        }
                    });
                }

                setStats({
                    products: totalProductsCount,
                    published: publishedCount,
                    draft: draftCount,
                    categories: categoriesRes.count || 0
                });

                if (analyticsRes.data) {
                    setAnalytics(analyticsRes.data);
                }
            } catch (e) {
                console.error("Erro ao carregar dados do catálogo", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const metrics = useMemo(() => {
        if (!analytics || analytics.length === 0) {
            return { views: 0, uniqueVisitors: 0, cartClicks: 0, conversionRate: 0 };
        }
        const views = analytics.length;
        const uniqueVisitors = new Set(analytics.map(a => a.visitor_id)).size;
        // Mocking Cart Clicks/Conversion based on views like the original catalog did
        const cartClicks = Math.round(uniqueVisitors * 0.035);
        const conversionRate = 3.5;

        return { views, uniqueVisitors, cartClicks, conversionRate };
    }, [analytics]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-64 flex items-center justify-center">
                <i className="bi bi-arrow-repeat animate-spin text-4xl text-slate-300" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-full animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <i className="bi bi-globe2 text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Catálogo Digital</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Métricas da Loja Online</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Visualizações</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{metrics.views}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Visitantes Únicos</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{metrics.uniqueVisitors}</div>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30">
                    <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase mb-1">Conversão Estimada</div>
                    <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">{metrics.conversionRate.toFixed(1)}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total de Produtos</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.products}</div>
                </div>
            </div>
            
            <div className="mt-auto">
                <a href="/marketing/catalog" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Gerenciar Catálogo Completo <i className="bi bi-arrow-right" />
                </a>
            </div>
        </div>
    );
}
