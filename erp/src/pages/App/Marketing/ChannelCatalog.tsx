import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { updateProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';
import { pluralizeProductType } from '@/pages/utils/pluralize';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface VariationRow {
    varId: string;
    varName: string;
    varSku: string;
    varStock: number;
    varPrice: number;
    varActive: boolean;
    varImage: string | null;
    varWhatsappSync: boolean;
    varWhatsappAutoSync: boolean;
    varLastSync: string | null;
    isActuallyOnMeta?: boolean; // Status real verificado na API da Meta
    // Dados herdados do pai
    parentId: string;
    parentDescription: string;
    parentEnvironment: string;
    parentTypeName: string;
    parentLine: string;
    parentCode: string;
    // Raw para o syncProductToCatalog
    rawParent: any;
    rawVariation: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function buildCollections(rows: VariationRow[]): { label: string; key: string }[] {
    const seen = new Set<string>();
    const list: { label: string; key: string }[] = [];

    rows.forEach(r => {
        const env = r.parentEnvironment.trim();
        if (env && !seen.has('env__' + env)) {
            seen.add('env__' + env);
            list.push({ label: env.toUpperCase(), key: 'env__' + env });
        }
    });

    rows.forEach(r => {
        const type = r.parentTypeName.trim();
        if (type) {
            const key = 'type__' + type;
            if (!seen.has(key)) {
                seen.add(key);
                list.push({ label: pluralizeProductType(type).toUpperCase(), key });
            }
        }
    });

    return list.sort((a, b) => a.label.localeCompare(b.label));
}

function rowMatchesCollection(row: VariationRow, key: string): boolean {
    if (!key || key === 'all') return true;
    if (key.startsWith('env__')) return row.parentEnvironment.trim() === key.replace('env__', '');
    if (key.startsWith('type__')) return row.parentTypeName.trim() === key.replace('type__', '');
    return true;
}

/** Transforma produto + variação em um objeto para a API do WhatsApp */
function buildSyncPayload(row: VariationRow): any {
    const price = row.varPrice > 0 ? row.varPrice : Number(row.rawParent.unit_price ?? 0);
    return {
        ...row.rawParent,
        id: row.varId,
        retailer_id: row.varSku || row.varId,
        description: `${row.parentDescription} - ${row.varName}`,
        // Sempre enviar nos dois formatos para garantir que o serviço leia corretamente
        unitPrice: price,
        unit_price: price,
        price,
        images: row.varImage ? [row.varImage] : (row.rawParent.images || []),
        stock: row.varStock,
        active: row.varActive && row.varStock > 0,
    };
}

// ── Component ─────────────────────────────────────────────────────────────
function ChannelCatalog() {
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [rows, setRows] = useState<VariationRow[]>([]);
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'ecommerce'>('all');
    const [filterCollection, setFilterCollection] = useState<string>('all');
    const [apiError, setApiError] = useState<string | null>(null);
    // Gestão de coleções Meta
    const [metaCollections, setMetaCollections] = useState<{ id: string; name: string; filter: string }[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [showMetaPanel, setShowMetaPanel] = useState(false);

    const fetchMetaCollections = async () => {
        setLoadingMeta(true);
        try {
            const sets = await whatsappGraphService.listProductSets();
            setMetaCollections(sets);
        } catch (err: any) {
            toast.error("Erro ao carregar coleções da Meta: " + err.message);
        } finally {
            setLoadingMeta(false);
        }
    };

    const handleDeleteMetaCollection = async (id: string, name: string) => {
        if (!window.confirm(`Deseja deletar a coleção "${name}" do catálogo da Meta permanentemente?`)) return;
        setIsActionLoading('meta_' + id);
        try {
            await whatsappGraphService.deleteProductSet(id);
            setMetaCollections(prev => prev.filter(c => c.id !== id));
            toast.success(`Coleção "${name}" deletada!`);
        } catch (err: any) {
            toast.error("Erro ao deletar coleção: " + err.message);
        } finally {
            setIsActionLoading(null);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const settings = getSettings();
            if (!settings.whatsappConfig?.accessToken || !settings.whatsappConfig?.catalogId) {
                setApiError("Configurações do WhatsApp incompletas. Vá em Configurações > WhatsApp para ajustar.");
            }

            // Fallback de colunas para evitar erros de schema cache (400)
            const COLUMNS = "id, code, description, brand, category, unit_price, stock, active, deleted, images, variations, environment, product_type_name, last_whatsapp_sync, line";
            
            let { data: productsData, error: pError } = await supabase
                .from('products')
                .select(COLUMNS)
                .eq('deleted', false)
                .order('description');

            // Caso falhe select específico, tenta o * como último recurso (ou vice-versa)
            if (pError) {
                console.warn("[Catalog] Select específico falhou, tentando fallback '*'...", pError.message);
                const res = await supabase.from('products').select('*').eq('deleted', false).order('description');
                productsData = res.data;
                pError = res.error;
            }

            if (pError) throw pError;

            // Busca status real na Meta para reconciliação
            let metaSkus = new Set<string>();
            try {
                const metaCatalog = await whatsappGraphService.fetchCatalogProducts();
                metaSkus = new Set(metaCatalog.map(p => p.retailer_id));
            } catch (err) {
                console.warn("Não foi possível buscar catálogo da Meta para reconciliação:", err);
            }

            // Expandir variações dos filhos
            const expanded: VariationRow[] = [];
            for (const p of (productsData || [])) {
                let variations: any[] = [];
                if (Array.isArray(p.variations)) {
                    variations = p.variations;
                } else if (typeof p.variations === 'string' && p.variations.trim().startsWith('[')) {
                    try { variations = JSON.parse(p.variations); } catch { variations = []; }
                } else if (p.variations && typeof p.variations === 'object') {
                    // Caso venha como um objeto com chaves numéricas (ocorre as vezes no PostgREST)
                    variations = Object.values(p.variations);
                }

                for (const v of variations) {
                    if (v && typeof v === 'object' && !v.deleted) {
                        const pDesc = p.description || '';
                        const rawVarName = v.name || v.description || 'VARIAÇÃO';
                    // Limpa o nome da variação removendo o nome do pai se ele estiver no início (evita duplicação)
                    const cleanVarName = rawVarName
                        .replace(new RegExp(`^${pDesc}\\s*[:\\-\\/\\s]*`, 'i'), '')
                        .trim() || rawVarName;

                    expanded.push({
                        varId: String(v.id || `${p.id}_${v.name}`),
                        varName: cleanVarName,
                        varSku: v.sku || v.code || '',
                        varStock: Number(v.stock ?? 0),
                        varPrice: Number(v.price ?? v.unitPrice ?? v.unit_price ?? v.priceOverride ?? v.salePrice ?? p.unit_price ?? 0),
                        varActive: v.active ?? true,
                        varImage: (v.images && v.images[0]) || (p.images && p.images[0]) || null,
                        varWhatsappSync: v.whatsappSync ?? false,
                        varWhatsappAutoSync: v.whatsappAutoSync ?? false,
                        varLastSync: v.lastWhatsappSync ?? null,
                        isActuallyOnMeta: metaSkus.has(v.sku || v.code || String(v.id || `${p.id}_${v.name}`)),
                        parentId: String(p.id),
                        parentDescription: p.description || '',
                        parentEnvironment: p.environment || '',
                        parentTypeName: p.product_type_name || '',
                        parentLine: p.line || '',
                        parentCode: p.code || '',
                        rawParent: p,
                        rawVariation: v,
                    });
                } }
            }

            setRows(expanded);
        } catch (error: any) {
            toast.error("Erro ao carregar catálogo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const collections = useMemo(() => buildCollections(rows), [rows]);

    const filteredRows = useMemo(() => rows.filter(r => {
        const q = search.toLowerCase();
        const matchesSearch =
            r.varName.toLowerCase().includes(q) ||
            r.varSku.toLowerCase().includes(q) ||
            r.parentDescription.toLowerCase().includes(q);
        const matchesChannel =
            filterChannel === 'all' ? true :
            filterChannel === 'whatsapp' ? r.varWhatsappSync :
            false; // ecommerce: futuro
        const matchesCollection = rowMatchesCollection(r, filterCollection);
        return matchesSearch && matchesChannel && matchesCollection;
    }), [rows, search, filterChannel, filterCollection]);

    /** Atualiza um campo de variação no array local de rows */
    const updateRowLocal = (varId: string, patch: Partial<VariationRow>) => {
        setRows(prev => prev.map(r => r.varId === varId ? { ...r, ...patch } : r));
    };

    /** Persiste a mudança de sync na variação dentro do produto pai */
    const persistVariationSync = async (row: VariationRow, field: 'whatsappSync' | 'whatsappAutoSync', newValue: boolean) => {
        try {
            // Buscar o produto pai atualizado do banco antes de sobrescrever (PRECISA ser cuidadoso aqui)
            const { data: pai, error } = await supabase.from('products').select('variations').eq('id', row.parentId).single();
            
            if (error || !pai) {
                console.error("[Catalog] Erro ao buscar produto pai no persist:", error);
                throw new Error("Não foi possível carregar as variações para salvar. Tente novamente.");
            }

            let variacoes: any[] = [];
            if (Array.isArray(pai.variations)) {
                variacoes = pai.variations;
            } else if (typeof pai.variations === 'string') {
                try { variacoes = JSON.parse(pai.variations); } catch { variacoes = []; }
            }

            // SEGURANÇA: Se o array original está vazio e o produto sumiu, algo está errado
            if (variacoes.length === 0) {
                console.warn("[Catalog] Nenhuma variação encontrada no pai ao tentar salvar.");
                // Se o row local tem variações mas o banco não, talvez o fetch do 'pai' retornou vazio indevidamente
                // Neste caso, não sobrescrevemos para não zerar as outras
            }

            const updatedVars = variacoes.map((v: any) => {
                const isMatch = String(v.id) === row.varId || 
                               String(`${row.parentId}_${v.name}`) === row.varId ||
                               String(v.sku || '') === row.varSku;
                
                if (isMatch) {
                    return { ...v, [field]: newValue };
                }
                return v;
            });

            // Só persistimos se houve realmente uma mudança ou se o identificador foi encontrado
            const changed = updatedVars.some((v, i) => v[field] !== variacoes[i][field]);
            if (changed) {
                const { error: patchError } = await supabase
                    .from('products')
                    .update({ variations: updatedVars })
                    .eq('id', row.parentId);
                
                if (patchError) throw patchError;
            }
        } catch (err: any) {
            console.error("[Catalog] Erro no persistVariationSync:", err);
            toast.error("Erro ao salvar no banco: " + (err.message || "Erro desconhecido"));
            throw err;
        }
    };

    const handleToggleWhatsAppSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappSync;
        setIsActionLoading(row.varId + '_wa');
        try {
            if (newValue) {
                await whatsappGraphService.syncProductToCatalog(buildSyncPayload(row), 'UPDATE');
            } else {
                await whatsappGraphService.deleteProductFromCatalog(row.varSku || row.varId);
            }
            await persistVariationSync(row, 'whatsappSync', newValue);
            updateRowLocal(row.varId, { varWhatsappSync: newValue, varLastSync: new Date().toISOString() });
            toast.success(newValue ? "Variação publicada no WhatsApp!" : "Variação removida do WhatsApp!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar visibilidade");
            if (error.message?.includes("Bloqueado")) setApiError(error.message);
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleToggleAutoSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappAutoSync;
        setIsActionLoading(row.varId + '_auto');
        try {
            await persistVariationSync(row, 'whatsappAutoSync', newValue);
            updateRowLocal(row.varId, { varWhatsappAutoSync: newValue });
            toast.success(newValue ? "Auto-Sync ativado!" : "Auto-Sync desativado.");
        } catch (error: any) {
            toast.error("Erro ao alternar auto-sync");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleSyncAllActive = async () => {
        const toSync = rows.filter(r => r.varWhatsappSync);
        if (toSync.length === 0) { toast.info("Nenhuma variação marcada para sincronizar."); return; }
        if (!window.confirm(`Deseja atualizar ${toSync.length} variações no WhatsApp?`)) return;

        setLoading(true);
        let count = 0, errors = 0;
        for (const r of toSync) {
            try {
                await whatsappGraphService.syncProductToCatalog(buildSyncPayload(r), 'UPDATE');
                await persistVariationSync(r, 'whatsappSync', true);
                updateRowLocal(r.varId, { varLastSync: new Date().toISOString() });
                count++;
            } catch (err) {
                console.error(`Erro ao sincronizar ${r.varName}:`, err);
                errors++;
            }
        }
        setLoading(false);
        if (count > 0) toast.success(`${count} variações atualizadas!`);
        if (errors > 0) toast.error(`${errors} variações falharam.`);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight italic">
                        Catálogo de <span className="text-green-500">Canais</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Variações publicadas por coleção</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleSyncAllActive}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                    >
                        <i className="bi bi-cloud-upload-fill mr-2" />Atualizar WhatsApp
                    </button>

                    <div className="relative group">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="BUSCAR VARIAÇÃO OU SKU..."
                            value={search}
                            onChange={e => setSearch(e.target.value.toUpperCase())}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                        />
                    </div>

                    <select
                        value={filterChannel}
                        onChange={(e: any) => setFilterChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 px-5 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
                    >
                        <option value="all">TODOS OS CANAIS</option>
                        <option value="whatsapp">WHATSAPP SHOP</option>
                        <option value="ecommerce">LOJA VIRTUAL</option>
                    </select>

                    <button
                        onClick={fetchData}
                        className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800"
                    >
                        <i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {apiError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-6 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                        <i className="bi bi-exclamation-triangle-fill text-xl" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">Erro de Acesso à API</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-500 mt-1 font-medium">{apiError}</p>
                    </div>
                    <a href="/settings#whatsapp" className="ml-auto px-6 py-3 bg-white dark:bg-slate-900 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                        Resolver
                    </a>
                </div>
            )}

            {/* ── Painel: Coleções da Meta (Product Sets) ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-premium-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <i className="bi bi-collection-fill" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Coleções do Catálogo Meta</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Product Sets no WhatsApp Business</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowMetaPanel(v => !v); if (!showMetaPanel) fetchMetaCollections(); }}
                        className="px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                    >
                        <i className={`bi ${showMetaPanel ? 'bi-chevron-up' : 'bi-chevron-down'} mr-2`} />
                        {showMetaPanel ? 'Fechar' : 'Gerenciar Coleções Meta'}
                    </button>
                </div>

                {showMetaPanel && (
                    <div className="mt-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                        {loadingMeta ? (
                            <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Carregando Coleções da Meta...</span>
                            </div>
                        ) : metaCollections.length === 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma coleção encontrada no catálogo da Meta.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {metaCollections.map(col => (
                                    <div key={col.id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{col.name}</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5">ID: {col.id}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMetaCollection(col.id, col.name)}
                                            disabled={isActionLoading === 'meta_' + col.id}
                                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                                            title="Deletar esta coleção da Meta"
                                        >
                                            {isActionLoading === 'meta_' + col.id
                                                ? <i className="bi bi-arrow-repeat animate-spin text-xs" />
                                                : <i className="bi bi-trash3-fill text-xs" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[8px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                            <i className="bi bi-info-circle mr-1" />
                            Deletar remove a coleção do catálogo Meta permanentemente. Os produtos individuais permanecem.
                        </p>
                    </div>
                )}
            </div>

            {/* Filtro de Coleções */}
            {!loading && collections.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    <button
                        onClick={() => setFilterCollection('all')}
                        className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCollection === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                    >
                        Todas as Coleções
                    </button>
                    {collections.map(col => (
                        <button
                            key={col.key}
                            onClick={() => setFilterCollection(col.key)}
                            className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filterCollection === col.key
                                    ? col.key.startsWith('env__')
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'
                            }`}
                        >
                            {col.key.startsWith('env__') && <i className="bi bi-geo-alt-fill mr-1.5 text-[9px]" />}
                            {col.key.startsWith('type__') && <i className="bi bi-collection-fill mr-1.5 text-[9px]" />}
                            {col.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Resumo */}
            {!loading && (
                <div className="flex items-center gap-3 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {filteredRows.length} VARIAÇÃO{filteredRows.length !== 1 ? 'ÕES' : ''}
                    </span>
                    {filterCollection !== 'all' && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                {collections.find(c => c.key === filterCollection)?.label}
                            </span>
                        </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-bold text-emerald-500">
                        {rows.filter(r => r.varWhatsappSync).length} NO WHATSAPP
                    </span>
                </div>
            )}

            {/* Lista de Variações */}
            <div className="grid grid-cols-1 gap-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Carregando Variações...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                        <i className="bi bi-layers text-4xl text-slate-200 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma variação encontrada</p>
                        <p className="text-[9px] text-slate-400 mt-1">Apenas produtos com variações aparecem aqui</p>
                    </div>
                ) : (
                    filteredRows.map(row => (
                        <div
                            key={row.varId}
                            className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm hover:shadow-premium transition-all overflow-hidden relative"
                        >
                            {/* Barra lateral: verde se ativo no WA, cinza caso contrário */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-[2rem] ${row.varWhatsappSync ? 'bg-green-500' : row.varActive ? 'bg-slate-200 dark:bg-slate-700' : 'bg-rose-300'}`} />

                            <div className="flex flex-col sm:flex-row items-center gap-5">
                                {/* Imagem */}
                                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 flex-shrink-0 overflow-hidden border border-slate-100 dark:border-slate-800">
                                    {row.varImage ? (
                                        <img src={row.varImage} alt={row.varName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <i className="bi bi-image text-xl" />
                                        </div>
                                    )}
                                </div>

                                {/* Info Principal */}
                                <div className="flex-1 min-w-0 text-center sm:text-left">
                                    {/* Badges de Coleção */}
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
                                        {row.isActuallyOnMeta && (
                                            <span className="text-[7px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                                                <i className="bi bi-patch-check-fill" />
                                                Verificado na Meta
                                            </span>
                                        )}
                                        {row.parentTypeName && (
                                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <i className="bi bi-collection-fill mr-1 text-[7px]" />
                                                {pluralizeProductType(row.parentTypeName).toUpperCase()}
                                            </span>
                                        )}
                                        {row.parentEnvironment && (
                                            <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-lg border border-violet-100 dark:border-violet-800">
                                                <i className="bi bi-geo-alt-fill mr-1 text-[7px]" />
                                                {row.parentEnvironment.toUpperCase()}
                                            </span>
                                        )}
                                        {row.parentLine && (
                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                                LINHA {row.parentLine.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Nome Produto Pai > Variação */}
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                        {row.parentDescription}
                                    </p>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
                                        {row.varName}
                                    </h3>

                                    {/* Dados rápidos */}
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                            SKU: <span className="text-slate-600 dark:text-slate-300">{row.varSku || '—'}</span>
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-wider">
                                            ESTOQUE: <span className={row.varStock > 0 ? 'text-emerald-500' : 'text-rose-500'}>{row.varStock}</span>
                                        </span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                            R$ {row.varPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Ações de Canal */}
                                <div className="flex items-center gap-4">
                                    {/* WhatsApp Toggle */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <button
                                            onClick={() => handleToggleWhatsAppSync(row)}
                                            disabled={isActionLoading === row.varId + '_wa'}
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${row.varWhatsappSync ? 'bg-green-50 text-green-600 shadow-md shadow-green-500/10 border-2 border-green-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800'}`}
                                            title={row.varWhatsappSync ? "Publicado. Clique para remover." : "Clique para publicar no WhatsApp."}
                                        >
                                            {isActionLoading === row.varId + '_wa'
                                                ? <i className="bi bi-arrow-repeat animate-spin" />
                                                : <i className="bi bi-whatsapp text-lg" />}
                                        </button>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${row.varWhatsappSync ? 'text-green-600' : 'text-slate-400'}`}>
                                            {row.varWhatsappSync ? 'Pub.' : 'Não Pub.'}
                                        </span>
                                    </div>

                                    {/* Auto-Sync */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <button
                                            onClick={() => handleToggleAutoSync(row)}
                                            disabled={isActionLoading === row.varId + '_auto'}
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${row.varWhatsappAutoSync ? 'bg-blue-50 text-blue-600 shadow-md shadow-blue-500/10 border-2 border-blue-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800'}`}
                                            title={row.varWhatsappAutoSync ? "Auto-Sync ativado." : "Auto-Sync desativado."}
                                        >
                                            {isActionLoading === row.varId + '_auto'
                                                ? <i className="bi bi-arrow-repeat animate-spin" />
                                                : <i className="bi bi-magic text-lg" />}
                                        </button>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${row.varWhatsappAutoSync ? 'text-blue-600' : 'text-slate-400'}`}>Auto</span>
                                    </div>

                                    {/* Status (Ativo/Inativo) */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${row.varActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300 dark:bg-slate-950'}`}>
                                            <i className={`bi ${row.varActive ? 'bi-check-circle-fill' : 'bi-x-circle'} text-lg`} />
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${row.varActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {row.varActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>

                                {/* Última sync */}
                                <div className="hidden lg:flex flex-col items-center w-20 text-center">
                                    <i className="bi bi-clock-history text-slate-200 dark:text-slate-700 text-lg mb-1" />
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight">
                                        {row.varLastSync ? new Date(row.varLastSync).toLocaleDateString('pt-BR') : 'Nunca'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ChannelCatalog;
