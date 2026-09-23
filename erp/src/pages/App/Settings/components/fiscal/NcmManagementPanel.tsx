import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import { useAuth } from '@/context/AuthContext';

type NcmFilter = 'all' | 'vigentes' | 'encerrados' | 'alterados' | 'com_produtos' | 'revisar';
interface NcmRow {
    code: string;
    official_description: string;
    active: boolean;
    start_date: string | null;
    end_date: string | null;
    legal_act: string | null;
    changed_at: string | null;
    product_count: number;
    is_unverified: boolean;
}
interface NcmProduct {
    id: string;
    code: string | null;
    name: string;
    ncm_code: string;
    ncm_description: string;
    total_count: number;
}
interface NcmSummary {
    active_count: number;
    recent_changes_count: number;
    retired_with_products_count: number;
    products_to_review_count: number;
    last_sync: null | { completed_at: string; source_updated_at: string; status: string; source_valid_count: number };
}
interface NcmPreview {
    sync_run_id: string;
    source_updated_at: string;
    source_total_count: number;
    source_valid_count: number;
    inserted_count: number;
    retired_count: number;
    changed_count: number;
    affected_products_count: number;
    expires_at: string;
}
interface NcmPreviewChange {
    code: string;
    change_type: 'inserted' | 'retired' | 'changed';
    old_description: string | null;
    new_description: string | null;
    old_start_date: string | null;
    new_start_date: string | null;
    old_end_date: string | null;
    new_end_date: string | null;
    old_legal_act: string | null;
    new_legal_act: string | null;
}

const PAGE_SIZE = 30;
const filterOptions: Array<{ id: NcmFilter; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'vigentes', label: 'Vigentes' },
    { id: 'encerrados', label: 'Encerrados' },
    { id: 'alterados', label: 'Alterados' },
    { id: 'com_produtos', label: 'Com produtos' },
    { id: 'revisar', label: 'Precisam revisão' },
];

function formatDate(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function getNcmStatus(row: Pick<NcmRow, 'active' | 'start_date' | 'is_unverified'>) {
    if (row.is_unverified) return 'Não verificado';
    if (row.start_date && new Date(`${row.start_date}T00:00:00`) > new Date()) return 'Futuro';
    return row.active ? 'Vigente' : 'Encerrado';
}

export function NcmManagementPanel() {
    const { profile } = useAuth();
    const canManage = profile?.role === 'administrator';
    const [summary, setSummary] = useState<NcmSummary | null>(null);
    const [rows, setRows] = useState<NcmRow[]>([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState<NcmFilter>('revisar');
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [preview, setPreview] = useState<NcmPreview | null>(null);
    const [previewChangesOpen, setPreviewChangesOpen] = useState(false);
    const [previewChanges, setPreviewChanges] = useState<NcmPreviewChange[]>([]);
    const [previewChangesTotal, setPreviewChangesTotal] = useState(0);
    const [previewChangesPage, setPreviewChangesPage] = useState(0);
    const [isLoadingPreviewChanges, setIsLoadingPreviewChanges] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedRow, setSelectedRow] = useState<NcmRow | null>(null);
    const [products, setProducts] = useState<NcmProduct[]>([]);
    const [productsTotal, setProductsTotal] = useState(0);
    const [productPage, setProductPage] = useState(0);
    const [events, setEvents] = useState<any[]>([]);
    const [correlations, setCorrelations] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [destinationQuery, setDestinationQuery] = useState('');
    const [destinationResults, setDestinationResults] = useState<NcmSearchResult[]>([]);
    const [destination, setDestination] = useState<NcmSearchResult | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isAddingCorrelation, setIsAddingCorrelation] = useState(false);
    const [correlationType, setCorrelationType] = useState<'one_to_one' | 'one_to_many' | 'many_to_one'>('one_to_one');
    const [correlationVersion, setCorrelationVersion] = useState('');
    const [isSavingCorrelation, setIsSavingCorrelation] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(0);
            setSearch(searchDraft.trim());
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchDraft]);

    const loadCatalog = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const [{ data: summaryData, error: summaryError }, { data: catalogData, error: catalogError }] = await Promise.all([
                supabase.rpc('get_ncm_catalog_summary'),
                supabase.rpc('list_ncm_catalog', {
                    p_search: search,
                    p_filter: filter,
                    p_limit: PAGE_SIZE,
                    p_offset: page * PAGE_SIZE,
                }),
            ]);
            if (summaryError) throw summaryError;
            if (catalogError) throw catalogError;
            const catalog = catalogData as { items?: NcmRow[]; total?: number };
            setSummary(summaryData as NcmSummary);
            setRows(catalog.items || []);
            setTotal(catalog.total || 0);
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível carregar a base local de NCMs.');
        } finally {
            setIsLoading(false);
        }
    }, [filter, page, search]);

    useEffect(() => { void loadCatalog(); }, [loadCatalog]);

    useEffect(() => {
        if (destinationQuery.trim().length < 2) {
            setDestinationResults([]);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const results = await ncmService.searchNcms(destinationQuery, 8);
                if (!cancelled) setDestinationResults(results);
            } catch {
                if (!cancelled) setDestinationResults([]);
            }
        }, 250);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [destinationQuery]);

    const loadDetails = async (row: NcmRow) => {
        setSelectedRow(row);
        setProducts([]);
        setProductsTotal(0);
        setEvents([]);
        setCorrelations([]);
        setSelectedProducts([]);
        setDestination(null);
        setDestinationQuery('');
        setIsAddingCorrelation(false);
        setCorrelationVersion('');
        setProductPage(0);
        const [productResult, eventResult, correlationResult] = await Promise.all([
            supabase.rpc('list_ncm_products', { p_code: row.code, p_limit: PAGE_SIZE, p_offset: 0 }),
            supabase.from('ncm_change_events').select('id, event_type, old_data, new_data, occurred_at').eq('code', row.code).order('occurred_at', { ascending: false }).limit(12),
            supabase.from('ncm_correlations').select('id, source_code, destination_code, relation_type, effective_from, effective_to, version_label, source_name, source_reference, notes').or(`source_code.eq.${row.code},destination_code.eq.${row.code}`).order('created_at', { ascending: false }).limit(30),
        ]);
        if (productResult.error) setErrorMessage(productResult.error.message);
        else {
            const result = (productResult.data || []) as NcmProduct[];
            setProducts(result);
            setProductsTotal(result[0]?.total_count || 0);
        }
        if (!eventResult.error) setEvents(eventResult.data || []);
        if (!correlationResult.error) setCorrelations(correlationResult.data || []);
    };

    const changeProductPage = async (nextPage: number) => {
        if (!selectedRow || nextPage < 0 || nextPage * PAGE_SIZE >= productsTotal) return;
        const { data, error } = await supabase.rpc('list_ncm_products', {
            p_code: selectedRow.code,
            p_limit: PAGE_SIZE,
            p_offset: nextPage * PAGE_SIZE,
        });
        if (error) {
            setErrorMessage(error.message);
            return;
        }
        setProducts(data || []);
        setSelectedProducts([]);
        setProductPage(nextPage);
    };

    const requestSyncPreview = async () => {
        setIsSyncing(true);
        setPreview(null);
        setPreviewChangesOpen(false);
        setPreviewChanges([]);
        setErrorMessage('');
        try {
            const { data, error } = await supabase.functions.invoke('sync-ncms', { body: { mode: 'preview' } });
            if (error) throw error;
            if (!data?.success || !data.preview) throw new Error(data?.error || 'A fonte oficial não passou na validação.');
            setPreview(data.preview as NcmPreview);
        } catch (error: any) {
            setErrorMessage(error?.message || 'Falha ao gerar a prévia da tabela oficial.');
        } finally {
            setIsSyncing(false);
        }
    };

    const loadPreviewChanges = async (runId: string, nextPage: number) => {
        setIsLoadingPreviewChanges(true);
        setErrorMessage('');
        try {
            const { data, error } = await supabase.rpc('list_ncm_sync_changes', {
                p_sync_run_id: runId,
                p_limit: PAGE_SIZE,
                p_offset: nextPage * PAGE_SIZE,
            });
            if (error) throw error;
            const result = data as { items?: NcmPreviewChange[]; total?: number };
            setPreviewChanges(result.items || []);
            setPreviewChangesTotal(result.total || 0);
            setPreviewChangesPage(nextPage);
            setPreviewChangesOpen(true);
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível carregar as mudanças da prévia.');
        } finally {
            setIsLoadingPreviewChanges(false);
        }
    };

    const applySync = async () => {
        if (!preview) return;
        setIsSyncing(true);
        setErrorMessage('');
        try {
            const { data, error } = await supabase.functions.invoke('sync-ncms', {
                body: { mode: 'apply', sync_run_id: preview.sync_run_id },
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'A sincronização não foi aplicada.');
            setPreview(null);
            await loadCatalog();
        } catch (error: any) {
            setErrorMessage(error?.message || 'Falha ao aplicar a sincronização.');
        } finally {
            setIsSyncing(false);
        }
    };

    const applyProductReview = async () => {
        if (!selectedRow || !destination || selectedProducts.length === 0) return;
        const confirmed = window.confirm(
            `Atualizar o NCM de ${selectedProducts.length} produto(s) de ${selectedRow.code} para ${destination.code}? Essa alteração vale para operações futuras; os documentos fiscais já emitidos permanecem inalterados.`
        );
        if (!confirmed) return;
        setIsReviewing(true);
        setErrorMessage('');
        try {
            const updates = products
                .filter(product => selectedProducts.includes(product.id))
                .map(product => ({ product_id: product.id, old_code: product.ncm_code, new_code: destination.code }));
            const { data, error } = await supabase.rpc('apply_ncm_product_reviews', { p_updates: updates });
            if (error) throw error;
            if (!(data as any)?.success) throw new Error('A revisão dos produtos não foi confirmada.');
            setSelectedProducts([]);
            setDestination(null);
            setDestinationQuery('');
            await loadDetails(selectedRow);
            await loadCatalog();
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível aplicar a revisão dos produtos.');
        } finally {
            setIsReviewing(false);
        }
    };

    const saveCorrelation = async () => {
        if (!selectedRow || !destination || !correlationVersion.trim()) return;
        setIsSavingCorrelation(true);
        setErrorMessage('');
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user) throw new Error('Sessão expirada. Entre novamente para registrar a correlação.');
            const { error } = await supabase.from('ncm_correlations').insert({
                source_code: selectedRow.code,
                destination_code: destination.code,
                relation_type: correlationType,
                version_label: correlationVersion.trim(),
                source_name: 'Rastreador NCM do MDIC',
                source_reference: 'https://rastreador-ncm.dth.mdic.gov.br/',
                notes: 'Correlação registrada manualmente por administrador após consulta da fonte informada.',
                created_by: authData.user.id,
            });
            if (error) throw error;
            setIsAddingCorrelation(false);
            setCorrelationVersion('');
            await loadDetails(selectedRow);
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível registrar a correlação.');
        } finally {
            setIsSavingCorrelation(false);
        }
    };

    const selectDocumentedSuccessor = async (code: string) => {
        setErrorMessage('');
        try {
            const entry = await ncmService.getCatalogEntry(code);
            if (!entry?.active) throw new Error(`O sucessor ${code} não está vigente na base local.`);
            setDestination({ code: entry.code, official_description: entry.official_description, alias_match: null, rank: 1 });
            setDestinationQuery(`${entry.code} · ${entry.official_description}`);
            setSelectedProducts(products.map(product => product.id));
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível confirmar o NCM sucessor.');
        }
    };

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const detailStatus = useMemo(() => selectedRow ? getNcmStatus(selectedRow) : '', [selectedRow]);

    return (
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/20 md:p-7">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                            <i className="bi bi-journal-check text-blue-500" /> Gestão da tabela NCM
                        </h3>
                        <p className="mt-1 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
                            Consulta local da tabela Classif/Siscomex. NCMs antigos permanecem no histórico; alterações cadastrais só são aplicadas após revisão.
                        </p>
                    </div>
                    {canManage && <button type="button" onClick={requestSyncPreview} disabled={isSyncing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                        {isSyncing ? <><i className="bi bi-arrow-repeat animate-spin" /> Consultando fonte...</> : <><i className="bi bi-cloud-download" /> Atualizar tabela oficial</>}
                    </button>}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <Metric label="NCMs vigentes" value={summary?.active_count} />
                    <Metric label="Mudanças em 30 dias" value={summary?.recent_changes_count} />
                    <Metric label="Encerrados com produtos" value={summary?.retired_with_products_count} warning />
                    <Metric label="Produtos pendentes" value={summary?.products_to_review_count} warning />
                </div>
                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Última sincronização: {summary?.last_sync?.completed_at ? `${formatDate(summary.last_sync.completed_at)} · ${summary.last_sync.source_updated_at}` : 'Ainda não sincronizada'}
                </p>
            </header>

            {errorMessage && <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</div>}

            {preview && (
                <div className="m-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20 md:p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-200">Prévia da atualização oficial</h4>
                            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Base local: {summary?.last_sync?.completed_at ? formatDate(summary.last_sync.completed_at) : 'sem sincronização anterior'} · Fonte obtida: {preview.source_updated_at} · {preview.source_valid_count.toLocaleString('pt-BR')} códigos de oito dígitos.</p>
                            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-amber-900 dark:text-amber-200 md:grid-cols-4">
                                <span>Novos: <b>{preview.inserted_count}</b></span>
                                <span>Encerrados: <b>{preview.retired_count}</b></span>
                                <span>Alterados: <b>{preview.changed_count}</b></span>
                                <span>Produtos afetados: <b>{preview.affected_products_count}</b></span>
                            </div>
                            <button type="button" disabled={isLoadingPreviewChanges} onClick={() => previewChangesOpen ? setPreviewChangesOpen(false) : void loadPreviewChanges(preview.sync_run_id, 0)} className="mt-3 text-xs font-bold text-amber-900 underline underline-offset-2 disabled:opacity-50 dark:text-amber-200">{previewChangesOpen ? 'Ocultar mudanças' : 'Abrir lista de mudanças'}</button>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => setPreview(null)} disabled={isSyncing} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-700 dark:text-amber-200">Cancelar</button>
                            <button type="button" onClick={applySync} disabled={isSyncing} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{isSyncing ? 'Aplicando...' : 'Confirmar atualização'}</button>
                        </div>
                    </div>
                    {previewChangesOpen && <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-900 dark:bg-slate-900/70">
                        {previewChanges.length === 0 ? <p className="text-xs text-slate-500">Nenhuma mudança identificada.</p> : <div className="max-h-72 space-y-2 overflow-y-auto">{previewChanges.map(change => <div key={change.code} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                            <p className="font-bold text-slate-800 dark:text-slate-100"><span className="font-mono">{change.code}</span> · {change.change_type === 'inserted' ? 'Novo' : change.change_type === 'retired' ? 'Encerrado' : 'Alterado'}</p>
                            {change.old_description !== change.new_description && <p className="mt-1 text-slate-600 dark:text-slate-300">Descrição: {change.old_description || '—'} → {change.new_description || '—'}</p>}
                            {(change.old_start_date !== change.new_start_date || change.old_end_date !== change.new_end_date) && <p className="mt-1 text-slate-600 dark:text-slate-300">Vigência: {change.old_start_date || '—'} a {change.old_end_date || '—'} → {change.new_start_date || '—'} a {change.new_end_date || '—'}</p>}
                            {change.old_legal_act !== change.new_legal_act && <p className="mt-1 text-slate-600 dark:text-slate-300">Ato: {change.old_legal_act || '—'} → {change.new_legal_act || '—'}</p>}
                        </div>)}</div>}
                        <div className="mt-3 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200"><span>{previewChangesTotal.toLocaleString('pt-BR')} mudanças · página {previewChangesPage + 1}</span><span className="flex gap-3"><button type="button" disabled={previewChangesPage === 0 || isLoadingPreviewChanges} onClick={() => void loadPreviewChanges(preview.sync_run_id, previewChangesPage - 1)} className="disabled:opacity-40">Anterior</button><button type="button" disabled={(previewChangesPage + 1) * PAGE_SIZE >= previewChangesTotal || isLoadingPreviewChanges} onClick={() => void loadPreviewChanges(preview.sync_run_id, previewChangesPage + 1)} className="disabled:opacity-40">Próxima</button></span></div>
                    </div>}
                </div>
            )}

            <div className="p-5 md:p-7">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <label className="relative block w-full lg:max-w-md">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Pesquisar por código ou descrição"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    </label>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                        {filterOptions.map(option => <button type="button" key={option.id} onClick={() => { setPage(0); setFilter(option.id); }}
                            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filter === option.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {option.label}
                        </button>)}
                    </div>
                </div>

                <div className="mt-4 space-y-2 md:hidden">
                    {isLoading ? <p className="rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">Carregando NCMs...</p>
                        : rows.length === 0 ? <p className="rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">Nenhum código corresponde aos filtros.</p>
                            : rows.map(row => {
                                const status = getNcmStatus(row);
                                return <article key={row.code} className={`rounded-xl border p-3 ${status === 'Encerrado' && row.product_count > 0 ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/10' : status === 'Não verificado' ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center justify-between gap-3"><span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{row.code}</span><StatusPill status={status} /></div>
                                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{row.official_description}</p>
                                    <div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-slate-500">{row.product_count} produto(s)</span><button type="button" onClick={() => void loadDetails(row)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40">Detalhes</button></div>
                                </article>;
                            })}
                </div>
                <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                            <tr><th className="px-4 py-3">NCM</th><th className="px-4 py-3">Descrição oficial</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Produtos</th><th className="px-4 py-3 text-right">Detalhes</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400"><i className="bi bi-arrow-repeat animate-spin mr-2" />Carregando NCMs...</td></tr>
                                : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhum código corresponde aos filtros.</td></tr>
                                    : rows.map(row => {
                                        const status = getNcmStatus(row);
                                        return <tr key={row.code} className={status === 'Encerrado' && row.product_count > 0 ? 'bg-rose-50/60 dark:bg-rose-950/10' : status === 'Não verificado' ? 'bg-amber-50/60 dark:bg-amber-950/10' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'}>
                                            <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-100">{row.code}</td>
                                            <td className="max-w-xl px-4 py-3 text-slate-600 dark:text-slate-300">{row.official_description}</td>
                                            <td className="px-4 py-3"><StatusPill status={status} /></td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">{row.product_count}</td>
                                            <td className="px-4 py-3 text-right"><button type="button" onClick={() => void loadDetails(row)} className="rounded-lg px-3 py-1.5 font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40">Abrir</button></td>
                                        </tr>;
                                    })}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{total.toLocaleString('pt-BR')} resultados</span>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={page === 0 || isLoading} onClick={() => setPage(value => Math.max(value - 1, 0))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Anterior</button>
                        <span>{page + 1} / {pageCount}</span>
                        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total || isLoading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Próxima</button>
                    </div>
                </div>
            </div>

            {selectedRow && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedRow(null); }}>
                    <div role="dialog" aria-modal="true" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
                        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 md:p-6">
                            <div>
                                <div className="flex flex-wrap items-center gap-3"><h4 className="font-mono text-xl font-black text-slate-900 dark:text-white">{selectedRow.code}</h4><StatusPill status={detailStatus} /></div>
                                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{selectedRow.official_description}</p>
                                <p className="mt-2 text-[11px] text-slate-500">Vigência: {formatDate(selectedRow.start_date)} a {selectedRow.end_date === '9999-12-31' ? 'sem encerramento previsto' : formatDate(selectedRow.end_date)} · Ato: {selectedRow.legal_act || '—'}</p>
                            </div>
                            <button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedRow(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 md:p-6">
                            {detailStatus === 'Encerrado' && productsTotal > 0 && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Este código está encerrado e há produtos vinculados. Escolha uma correlação documentada ou classifique os produtos com o responsável fiscal.</div>}
                            {detailStatus === 'Não verificado' && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Este código aparece em produtos, mas não consta na base oficial vigente local. Isso não confirma que ele foi encerrado. Consulte o histórico do Classif e confirme a classificação antes de alterar os produtos.</div>}

                            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                                <div className="min-w-0">
                                    <div className="mb-2 flex items-center justify-between"><h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Produtos vinculados ({productsTotal})</h5><span className="text-[10px] text-slate-400">A página mostra até {PAGE_SIZE} produtos</span></div>
                                    {products.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400 dark:bg-slate-800">Nenhum produto vinculado.</p> : <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                                        {products.map(product => <label key={product.id} className={`flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 dark:border-slate-800 ${canManage ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}>
                                            {canManage && <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={event => setSelectedProducts(current => event.target.checked ? [...current, product.id] : current.filter(id => id !== product.id))} className="mt-0.5 accent-blue-600" />}
                                            <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{product.name || 'Produto sem nome'}</span><span className="mt-0.5 block font-mono text-[10px] text-slate-500">Código {product.code || '—'} · NCM {product.ncm_code}</span></span>
                                        </label>)}
                                        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
                                            <span>Página {productPage + 1} de {Math.max(1, Math.ceil(productsTotal / PAGE_SIZE))}</span>
                                            <span className="flex gap-2"><button type="button" disabled={productPage === 0} onClick={() => void changeProductPage(productPage - 1)} className="disabled:opacity-40">Anterior</button><button type="button" disabled={(productPage + 1) * PAGE_SIZE >= productsTotal} onClick={() => void changeProductPage(productPage + 1)} className="disabled:opacity-40">Próxima</button></span>
                                        </div>
                                    </div>}

                                    {canManage && detailStatus !== 'Vigente' && productsTotal > 0 && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                                        <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">Novo NCM para os produtos selecionados</label>
                                        <div className="relative mt-2">
                                            <input value={destinationQuery} onChange={event => { setDestinationQuery(event.target.value); setDestination(null); }} placeholder="Pesquise por código ou descrição oficial" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100" />
                                            {destinationResults.length > 0 && <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{destinationResults.map(result => <button type="button" key={result.code} onClick={() => { setDestination(result); setDestinationQuery(`${result.code} · ${result.official_description}`); setDestinationResults([]); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className="font-mono font-bold">{result.code}</span><span className="ml-2 text-slate-500">{result.official_description}</span></button>)}</div>}
                                        </div>
                                        {selectedProducts.length > 0 && <button type="button" disabled={!destination || isReviewing} onClick={applyProductReview} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isReviewing ? 'Aplicando revisão...' : `Confirmar NCM em ${selectedProducts.length} produto(s)`}</button>}
                                        <p className="mt-2 text-[10px] leading-relaxed text-blue-800 dark:text-blue-300">A sugestão por correlação ajuda na análise; valide a classificação fiscal antes de confirmar. O sistema não escolhe automaticamente entre vários sucessores.</p>
                                    </div>}
                                </div>

                                <div className="space-y-5">
                                    <section>
                                        <div className="mb-2 flex items-center justify-between gap-2"><h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Correlações registradas</h5>{canManage && <button type="button" onClick={() => setIsAddingCorrelation(value => !value)} className="text-[10px] font-bold text-blue-600">{isAddingCorrelation ? 'Cancelar' : 'Registrar correlação verificada'}</button>}</div>
                                        {isAddingCorrelation && canManage && <div className="mb-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                                            <p className="text-[10px] text-slate-600 dark:text-slate-300">Informe o código sucessor e a revisão consultada no Rastreador. O sistema registra a fonte como apoio; a relação não altera produtos automaticamente.</p>
                                            <input value={destinationQuery} onChange={event => { setDestinationQuery(event.target.value); setDestination(null); }} placeholder="Pesquisar NCM sucessor vigente" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100" />
                                            {destinationResults.length > 0 && <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">{destinationResults.map(result => <button type="button" key={result.code} onClick={() => { setDestination(result); setDestinationQuery(`${result.code} · ${result.official_description}`); setDestinationResults([]); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[10px] last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className="font-mono font-bold">{result.code}</span><span className="ml-2 text-slate-500">{result.official_description}</span></button>)}</div>}
                                            {destination && <p className="text-[10px] font-bold text-blue-800 dark:text-blue-200">Destino selecionado: {destination.code} · {destination.official_description}</p>}
                                            <select value={correlationType} onChange={event => setCorrelationType(event.target.value as typeof correlationType)} className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"><option value="one_to_one">Um para um</option><option value="one_to_many">Um para vários</option><option value="many_to_one">Vários para um</option></select>
                                            <input value={correlationVersion} onChange={event => setCorrelationVersion(event.target.value)} placeholder="Versão/período consultado (ex.: SH 2022)" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100" />
                                            <button type="button" onClick={saveCorrelation} disabled={!destination || !correlationVersion.trim() || isSavingCorrelation} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingCorrelation ? 'Salvando...' : 'Registrar relação consultada'}</button>
                                        </div>}
                                        {correlations.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">Nenhuma correlação registrada. Consulte o <a className="font-bold text-blue-600 underline" href="https://rastreador-ncm.dth.mdic.gov.br/" target="_blank" rel="noreferrer">Rastreador NCM do MDIC</a> para apoiar a revisão.</p> : <div className="space-y-2">{correlations.map(item => {
                                            const outgoing = correlations.filter(relation => relation.source_code === selectedRow.code);
                                            const unambiguous = outgoing.length > 0 && new Set(outgoing.map(relation => relation.destination_code)).size === 1
                                                && outgoing.every(relation => relation.relation_type === 'one_to_one' || relation.relation_type === 'many_to_one');
                                            return <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"><p className="font-mono font-bold">{item.source_code} → {item.destination_code}</p><p className="mt-1 text-slate-500">{item.relation_type.replaceAll('_', ' ')} · {item.source_name}{item.version_label ? ` · ${item.version_label}` : ''}</p>{item.source_reference?.startsWith('https://') && <a href={item.source_reference} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[10px] text-blue-600 underline">Fonte da correlação</a>}{canManage && detailStatus !== 'Vigente' && products.length > 0 && unambiguous && item.source_code === selectedRow.code && <button type="button" onClick={() => void selectDocumentedSuccessor(item.destination_code)} className="mt-2 font-bold text-blue-600 underline underline-offset-2">Selecionar sucessor e produtos desta página</button>}</div>;
                                        })}</div>}
                                    </section>
                                    <section><h5 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">Histórico do código</h5>{events.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">Sem eventos registrados desde a implantação do histórico.</p> : <div className="space-y-2">{events.map(event => <div key={event.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{event.event_type.replaceAll('_', ' ')}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(event.occurred_at).toLocaleString('pt-BR')}</p>{event.old_data?.description && event.old_data.description !== event.new_data?.description && <p className="mt-1 text-[10px] text-slate-500">Descrição anterior: {event.old_data.description}</p>}</div>)}</div>}</section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function Metric({ label, value, warning = false }: { label: string; value?: number; warning?: boolean }) {
    return <div className={`rounded-xl border p-3 ${warning ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-1 text-lg font-black ${warning ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}>{value?.toLocaleString('pt-BR') ?? '—'}</p>
    </div>;
}

function StatusPill({ status }: { status: string }) {
    const classes = status === 'Vigente'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        : status === 'Futuro'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            : status === 'Não verificado'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${classes}`}>{status}</span>;
}
