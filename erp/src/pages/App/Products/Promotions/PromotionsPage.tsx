import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PromotionEditor from './PromotionEditor';
import {
  PAGE_SIZE,
  fetchPromotions,
  formatPromotionDate,
  getPromotionErrorMessage,
  mutatePromotion,
  type PromotionFilters,
  type PromotionStatus,
} from './promotionsService';

const STATUS_TABS: Array<{ id: 'all' | PromotionStatus; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'active', label: 'Em andamento' },
  { id: 'interrupted', label: 'Interrompidas' },
  { id: 'ended', label: 'Encerradas' },
];

const STATUS_LABEL: Record<PromotionStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Programada',
  active: 'Em andamento',
  interrupted: 'Interrompida',
  ended: 'Encerrada',
};

const STATUS_COLOR: Record<PromotionStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  interrupted: 'bg-amber-100 text-amber-800',
  ended: 'bg-slate-100 text-slate-500',
};

const initialFilters: PromotionFilters = {
  search: '',
  status: 'all',
  periodStart: '',
  periodEnd: '',
  productSearch: '',
  page: 1,
};

function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
}

export default function PromotionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCreate = location.pathname.endsWith('/new');
  const isEditor = isCreate || location.pathname.includes('/edit');

  if (isEditor) {
    return <PromotionEditor promotionId={isCreate ? null : id || null} readOnly={searchParams.get('view') === '1'} />;
  }

  return <PromotionList />;
}

function PromotionList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const debouncedSearch = useDebouncedValue(filters.search);
  const debouncedProductSearch = useDebouncedValue(filters.productSearch);
  const queryFilters = {
    ...filters,
    search: debouncedSearch,
    productSearch: debouncedProductSearch,
  };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions', queryFilters],
    queryFn: () => fetchPromotions(queryFilters),
  });
  const actionMutation = useMutation({
    mutationFn: (input: { action: 'duplicate' | 'interrupt' | 'resume' | 'delete'; id: string }) =>
      mutatePromotion(input.action, input.id),
    onSuccess: async (id, input) => {
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      if (input.action === 'duplicate') navigate(`/products/promotions/${id}/edit`);
      else toast.success(input.action === 'delete' ? 'Promoção excluída.' : 'Promoção atualizada.');
    },
    onError: (error) => toast.error(getPromotionErrorMessage(error)),
  });

  const setFilter = <K extends keyof PromotionFilters>(key: K, value: PromotionFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/products" className="text-xs font-semibold text-blue-600 hover:underline">← Produtos</Link>
            <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Promoções</h1>
            <p className="mt-1 text-sm text-slate-500">Campanhas temporárias sem alterar o preço cadastrado nos produtos.</p>
          </div>
          <button type="button" onClick={() => navigate('/products/promotions/new')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
            <i className="bi bi-plus-lg" aria-hidden="true" /> Nova promoção
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 pb-3 dark:border-slate-800" role="tablist" aria-label="Filtrar promoções por estado">
            {STATUS_TABS.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={filters.status === tab.id} onClick={() => setFilter('status', tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filters.status === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
              <i className="bi bi-search text-slate-400" aria-hidden="true" />
              <input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Buscar promoção" aria-label="Buscar promoção por nome" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
              <i className="bi bi-box-seam text-slate-400" aria-hidden="true" />
              <input value={filters.productSearch} onChange={(event) => setFilter('productSearch', event.target.value)} placeholder="Produto participante" aria-label="Filtrar por produto participante" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              De <input type="date" value={filters.periodStart} onChange={(event) => setFilter('periodStart', event.target.value)} aria-label="Período a partir de" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              Até <input type="date" value={filters.periodEnd} onChange={(event) => setFilter('periodEnd', event.target.value)} aria-label="Período até" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
          </div>
        </section>

        <section className="space-y-3" aria-label="Promoções cadastradas">
          {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando promoções…</div> : null}
          {isError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Não foi possível carregar as promoções. <button type="button" onClick={() => void refetch()} className="ml-1 font-bold underline">Tentar novamente</button></div> : null}
          {!isLoading && !isError && !data?.rows.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><i className="bi bi-megaphone text-3xl text-slate-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-800 dark:text-white">Nenhuma promoção encontrada</h2><p className="mt-1 text-sm text-slate-500">Crie uma campanha ou ajuste os filtros.</p></div> : null}

          {data?.rows.map((promotion) => {
            const status = promotion.computed_status;
            return (
              <article key={promotion.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{promotion.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                    </div>
                    {promotion.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{promotion.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span><i className="bi bi-calendar3 mr-1.5" aria-hidden="true" />{formatPromotionDate(promotion.starts_on, promotion.timezone_name)} – {formatPromotionDate(promotion.ends_on, promotion.timezone_name)}</span>
                      <span><i className="bi bi-box-seam mr-1.5" aria-hidden="true" />{promotion.item_count} {promotion.item_count === 1 ? 'produto/variação' : 'produtos/variações'}</span>
                      <span><i className="bi bi-percent mr-1" aria-hidden="true" />{promotion.minimum_discount == null ? 'Desconto não definido' : promotion.minimum_discount === promotion.maximum_discount ? `${promotion.minimum_discount}%` : `${promotion.minimum_discount}% a ${promotion.maximum_discount}%`}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => navigate(`/products/promotions/${promotion.id}/edit?view=1`)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Visualizar</button>
                    <button type="button" onClick={() => navigate(`/products/promotions/${promotion.id}/edit`)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Editar</button>
                    <button type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ action: 'duplicate', id: promotion.id })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">Duplicar</button>
                    {status === 'scheduled' || status === 'active' ? <button type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ action: 'interrupt', id: promotion.id })} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Interromper</button> : null}
                    {status === 'interrupted' ? <button type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ action: 'resume', id: promotion.id })} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Retomar</button> : null}
                    {status === 'draft' || status === 'interrupted' || status === 'ended' ? <button type="button" disabled={actionMutation.isPending} onClick={() => { if (window.confirm(`Excluir a promoção “${promotion.name}”?`)) actionMutation.mutate({ action: 'delete', id: promotion.id }); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Excluir</button> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {total > PAGE_SIZE ? <nav aria-label="Páginas de promoções" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"><span className="text-slate-500">{total} promoções · Página {filters.page} de {pages}</span><div className="flex gap-2"><button type="button" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40 dark:border-slate-700">Anterior</button><button type="button" disabled={filters.page >= pages} onClick={() => setFilter('page', filters.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40 dark:border-slate-700">Próxima</button></div></nav> : null}
      </div>
    </main>
  );
}
