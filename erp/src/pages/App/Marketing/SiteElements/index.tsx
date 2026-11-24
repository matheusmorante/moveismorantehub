import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { SITE_ELEMENT_CONFIG, SITE_ELEMENT_KINDS, type SiteElementActivationFormValues, type SiteElementKind } from '../../../../../../shared-utils/siteElementSchemas';
import { CAROUSEL_BANNER_IMAGES, CAROUSEL_BANNER_VARIANTS, LEGACY_CAROUSEL_IMAGE } from '../../../../../../shared-utils/siteElementDimensions';
import SiteElementFormModal from './SiteElementFormModal';
import SiteElementDeleteDialog from './SiteElementDeleteDialog';
import SiteElementModelActions from './SiteElementModelActions';
import { fetchSiteElementModels, setSiteElementActivation, SITE_ELEMENT_PAGE_SIZE, siteElementErrorMessage, siteElementImageUrl, type SiteElementModel } from './siteElementService';

export default function SiteElementsPage() {
  const [kind, setKind] = useState<SiteElementKind | null>(null);
  return <div className="space-y-6 pb-12 text-slate-800 dark:text-slate-100">
    <header>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400">Marketing</p>
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Elementos do site</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Biblioteca de modelos de imagem para o catálogo digital. A barra de destaque é configurada para exibição em telas desktop.</p>
    </header>
    {kind === null ? <nav aria-label="Submódulos de elementos do site" className="flex max-w-xl flex-col gap-2">
        {SITE_ELEMENT_KINDS.map((value) => <button key={value} type="button" aria-current={kind === value ? 'page' : undefined}
          onClick={() => setKind(value)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-bold text-slate-700 transition-colors hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pink-900 dark:hover:bg-pink-950/30 dark:hover:text-pink-300">
          <i className={`bi ${SITE_ELEMENT_CONFIG[value].icon}`} aria-hidden="true" />
          {SITE_ELEMENT_CONFIG[value].label}
          <i className="bi bi-chevron-right ml-auto text-xs" aria-hidden="true" />
        </button>)}
    </nav> : <div className="space-y-5">
      <button type="button" onClick={() => setKind(null)}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
        <i className="bi bi-arrow-left" aria-hidden="true" />Voltar à lista de submódulos
      </button>
      <ElementModelsSection key={kind} kind={kind} />
    </div>}
  </div>;
}

function ElementModelsSection({ kind }: { kind: SiteElementKind }) {
  const config = SITE_ELEMENT_CONFIG[kind];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<SiteElementModel | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SiteElementModel | null>(null);
  const queryKey = ['site-element-models', user?.id];
  const listKey = [...queryKey, kind, page];
  const query = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => fetchSiteElementModels(kind, page, signal),
    enabled: !!user,
    retry: false,
  });
  const finishMutation = (message: string, cleanupFailed: boolean) => {
    if (editor === 'new') setPage(1);
    setEditor(null); setDeleting(null);
    toast.success(message);
    if (cleanupFailed) toast.warning('O cadastro foi atualizado, mas não foi possível remover o arquivo antigo do armazenamento.');
    void queryClient.invalidateQueries({ queryKey });
  };
  const changeActivation = async (values: SiteElementActivationFormValues) => {
    const carouselQueries = { queryKey: [...queryKey, 'carousel'] };
    try {
      const updated = await setSiteElementActivation(values);
      await queryClient.cancelQueries({ queryKey: listKey, exact: true });
      queryClient.setQueriesData<Awaited<ReturnType<typeof fetchSiteElementModels>>>(carouselQueries, (data) => data && {
        ...data,
        rows: data.rows.map((model) => model.id === updated.id && model.updated_at === values.updated_at
          ? { ...model, ...updated } : model),
      });
    } catch (error) {
      void queryClient.invalidateQueries(carouselQueries);
      throw error;
    }
  };
  const rows = query.data?.rows || [];
  return <section aria-labelledby={`site-section-${kind}`} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 id={`site-section-${kind}`} className="text-lg font-bold">{config.label}</h2>
        <p className="mt-1 text-sm text-slate-500">{config.description}</p>
      {kind === 'top_bar' ? <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-pink-600 dark:text-pink-400">
        <span>Desktop: {config.width} × {config.height} px</span>
        <span>PNG, JPG ou WebP · até 5 MB</span>
      </div> : <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-pink-600 dark:text-pink-400">
        {CAROUSEL_BANNER_VARIANTS.map((variant) => {
          const { label, width, height } = CAROUSEL_BANNER_IMAGES[variant];
          return <span key={variant}>{label} {width} × {height} px</span>;
        })}
      </div>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditor('new')} className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-700"><i className="bi bi-plus-lg" />Novo modelo</button>
      </div>
    </div>
    {query.isFetching && <div role="status" className="flex animate-pulse items-center gap-2 rounded-xl bg-pink-50 p-4 text-sm text-pink-700 dark:bg-pink-950/30 dark:text-pink-300"><i className="bi bi-arrow-repeat animate-spin" />Carregando modelos…</div>}
    {query.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{siteElementErrorMessage(query.error)} Recarregue a página para tentar novamente.</div>
      : !query.isPending && rows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
        <i className={`bi ${config.icon} mb-3 inline-block text-4xl text-slate-300`} aria-hidden="true" />
        <h3 className="text-lg font-bold">Nenhum modelo cadastrado</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{kind === 'top_bar'
          ? `Adicione o primeiro modelo da barra de destaque com uma imagem desktop de ${config.width} × ${config.height} px.`
          : 'Adicione um modelo de carrossel com imagens para desktop, tablet e mobile.'}</p>
        <button type="button" onClick={() => setEditor('new')} className="mt-5 text-sm font-bold text-pink-600 hover:underline">Adicionar primeiro modelo</button>
      </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((model) => <article key={model.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {model.kind === 'top_bar' ? <div className="border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Desktop</p>
              <div className="flex min-h-12 items-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <img src={siteElementImageUrl(model.image_path)} alt={`${model.name}, desktop`} loading="lazy" decoding="async"
                  width={config.width} height={config.height} className="w-full object-contain" style={{ aspectRatio: `${config.width} / ${config.height}` }} />
              </div>
              <p className="mt-1 truncate text-[10px] text-slate-500" title={model.file_name}>{model.file_name}</p>
              <p className="text-[10px] text-slate-400">{model.width} × {model.height} · {(model.size_bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB</p>
            </div>
          </div> : <div className="flex min-h-24 items-center border-b border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            <img src={siteElementImageUrl(model.image_path)} alt={model.name} loading="lazy" decoding="async" width={model.width} height={model.height}
              className="w-full object-contain" style={{ aspectRatio: `${model.width} / ${model.height}` }} />
          </div>}
          <div className="space-y-3 p-4">
            <h3 className="break-words font-bold">{model.name}</h3>
            {model.kind === 'carousel' && <>
              <p className="truncate text-xs text-slate-500" title={model.file_name}>{model.file_name}</p>
              <p className="text-xs text-slate-400">{model.width} × {model.height} px · {(model.size_bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB</p>
              {model.height === LEGACY_CAROUSEL_IMAGE.height && <p className="text-xs text-amber-800 dark:text-amber-300">
                Adicione as três versões para exibir este banner no catálogo.
              </p>}
            </>}
            <SiteElementModelActions model={model} onEdit={() => setEditor(model)} onDelete={() => setDeleting(model)}
              onActivationChange={changeActivation} />
          </div>
        </article>)}
      </div>}
    <ERPListPagination page={page} pageSize={SITE_ELEMENT_PAGE_SIZE} totalItems={query.data?.count || 0} onPageChange={setPage}
      loading={query.isFetching} itemLabel="modelos" ariaLabel="Paginação dos modelos de elementos do site" />
    {editor && <SiteElementFormModal kind={kind} model={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={(failed) => finishMutation('Modelo salvo.', failed)} />}
    {deleting && <SiteElementDeleteDialog model={deleting} onClose={() => setDeleting(null)} onDeleted={(failed) => finishMutation('Modelo excluído.', failed)} />}
  </section>;
}
