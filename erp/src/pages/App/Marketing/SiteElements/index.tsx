import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { SITE_ELEMENT_CONFIG, SITE_ELEMENT_KINDS, type SiteElementKind } from '../../../../../../shared-utils/siteElementSchemas';
import SiteElementFormModal from './SiteElementFormModal';
import SiteElementDeleteDialog from './SiteElementDeleteDialog';
import { fetchSiteElementModels, SITE_ELEMENT_PAGE_SIZE, siteElementErrorMessage, siteElementImageUrl, type SiteElementModel } from './siteElementService';

export default function SiteElementsPage() {
  const [kind, setKind] = useState<SiteElementKind>('carousel');
  return <div className="space-y-6 pb-12 text-slate-800 dark:text-slate-100">
    <header>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400">Marketing</p>
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Elementos do site</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Biblioteca de modelos de imagem para o catálogo digital. Cada modelo tem um nome e uma imagem no tamanho padrão.</p>
    </header>
    <div role="tablist" aria-label="Tipos de elementos do site" className="flex flex-wrap gap-2">
      {SITE_ELEMENT_KINDS.map((value) => <button key={value} type="button" role="tab" id={`site-tab-${value}`}
        aria-selected={kind === value} aria-controls="site-element-panel" onClick={() => setKind(value)}
        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${kind === value
          ? 'border-pink-600 bg-pink-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-pink-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}>
        <i className={`bi ${SITE_ELEMENT_CONFIG[value].icon}`} aria-hidden="true" />{SITE_ELEMENT_CONFIG[value].label}
      </button>)}
    </div>
    <ElementModelsSection key={kind} kind={kind} />
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
  const query = useQuery({
    queryKey: [...queryKey, kind, page],
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
  const rows = query.data?.rows || [];
  return <section id="site-element-panel" role="tabpanel" aria-labelledby={`site-tab-${kind}`} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-bold">{config.label}</h2>
        <p className="mt-1 text-sm text-slate-500">{config.description}</p>
        <p className="mt-2 text-xs font-semibold text-pink-600 dark:text-pink-400">{config.width} × {config.height} px · PNG, JPG ou WebP · até 5 MB</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Atualizar modelos"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-500 disabled:opacity-40 dark:border-slate-700"><i className={`bi bi-arrow-clockwise ${query.isFetching ? 'animate-spin' : ''}`} /></button>
        <button type="button" onClick={() => setEditor('new')} className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-700"><i className="bi bi-plus-lg" />Novo modelo</button>
      </div>
    </div>
    {query.isFetching && <div role="status" className="flex animate-pulse items-center gap-2 rounded-xl bg-pink-50 p-4 text-sm text-pink-700 dark:bg-pink-950/30 dark:text-pink-300"><i className="bi bi-arrow-repeat animate-spin" />Carregando modelos…</div>}
    {query.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{siteElementErrorMessage(query.error)} Use o botão Atualizar modelos para tentar novamente.</div>
      : !query.isPending && rows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
        <i className={`bi ${config.icon} mb-3 inline-block text-4xl text-slate-300`} aria-hidden="true" />
        <h3 className="text-lg font-bold">Nenhum modelo cadastrado</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Adicione o primeiro modelo de {kind === 'carousel' ? 'carrossel' : 'barra de destaque'} com um nome e uma imagem de {config.width} × {config.height} px.</p>
        <button type="button" onClick={() => setEditor('new')} className="mt-5 text-sm font-bold text-pink-600 hover:underline">Adicionar primeiro modelo</button>
      </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((model) => <article key={model.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-h-24 items-center border-b border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            <img src={siteElementImageUrl(model.image_path)} alt={model.name} loading="lazy" decoding="async" width={model.width} height={model.height}
              className="w-full object-contain" style={{ aspectRatio: `${model.width} / ${model.height}` }} />
          </div>
          <div className="space-y-3 p-4">
            <h3 className="break-words font-bold">{model.name}</h3>
            <p className="truncate text-xs text-slate-500" title={model.file_name}>{model.file_name}</p>
            <p className="text-xs text-slate-400">{model.width} × {model.height} px · {(model.size_bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB</p>
            <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button type="button" onClick={() => setEditor(model)} aria-label={`Editar ${model.name}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:bg-slate-800"><i className="bi bi-pencil" />Editar</button>
              <button type="button" onClick={() => setDeleting(model)} aria-label={`Excluir ${model.name}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><i className="bi bi-trash" />Excluir</button>
            </div>
          </div>
        </article>)}
      </div>}
    <ERPListPagination page={page} pageSize={SITE_ELEMENT_PAGE_SIZE} totalItems={query.data?.count || 0} onPageChange={setPage}
      loading={query.isFetching} itemLabel="modelos" ariaLabel="Paginação dos modelos de elementos do site" />
    {editor && <SiteElementFormModal kind={kind} model={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={(failed) => finishMutation('Modelo salvo.', failed)} />}
    {deleting && <SiteElementDeleteDialog model={deleting} onClose={() => setDeleting(null)} onDeleted={(failed) => finishMutation('Modelo excluído.', failed)} />}
  </section>;
}
