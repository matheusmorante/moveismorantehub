import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { startImageTemplate, type DeleteImageTemplateValues, type ImageTemplateFormValues } from '../../../../../../shared-utils/catalogImageTemplate';
import { SAO_PAULO_TIMEZONE } from '../../../../../../shared-utils/commercialScheduling/timezoneUtils';
import ImageTemplateEditor from './ImageTemplateEditor';
import { TemplateDeleteDialog, TemplateDetailsDialog, type TemplateDetails } from './TemplateDetailsDialog';
import { deleteImageTemplate, IMAGE_TEMPLATE_PAGE_SIZE, imageTemplateError, listImageTemplates, readImageTemplate, renameImageTemplate,
  type ImageTemplateSummary } from './imageTemplateService';
import { DEFAULT_TEMPLATE_ORDER, EMPTY_TEMPLATE_FILTERS, templateListQuery, type TemplateLibraryFilters, type TemplateListColumn } from './imageTemplateListFilters';
import { TemplateListFilters } from './TemplateListFilters';
import './imageTemplates.css';

type Editor = { kind: 'new'; initial: ImageTemplateFormValues }
  | { kind: 'edit' | 'copy'; model: ImageTemplateSummary; metadata?: { name: string; description: string } };
type Dialog = { kind: 'create' } | { kind: 'rename' | 'copy' | 'delete'; model: ImageTemplateSummary };
const createdDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: SAO_PAULO_TIMEZONE });
const libraryColumns = [
  { column: 'name', label: 'Nome do conjunto de modelos', className: 'ct-list-name' },
  { column: 'description', label: 'Descrição', className: 'ct-list-description' },
  { column: 'created_at', label: 'Data de criação', className: 'ct-list-created' },
] as const;

export default function ImageTemplatesPage() {
  const { user } = useAuth();
  return user ? <ImageTemplateLibrary key={user.id} userId={user.id} /> : null;
}

function ImageTemplateLibrary({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_TEMPLATE_FILTERS);
  const [order, setOrder] = useState(DEFAULT_TEMPLATE_ORDER);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState('');
  const listKey = ['catalog-image-templates', userId];
  const criteria = templateListQuery(filters, order);
  const filtered = !!(criteria.pattern || criteria.from || criteria.through);
  const list = useQuery({
    queryKey: [...listKey, page, criteria], queryFn: ({ signal }) => listImageTemplates(page, criteria, signal),
    enabled: !editor, retry: false, refetchOnWindowFocus: false,
  });
  const modelId = editor && editor.kind !== 'new' ? editor.model.id : null;
  const detailKey = ['catalog-image-template-detail', userId, modelId];
  const detail = useQuery({
    queryKey: detailKey, queryFn: ({ signal }) => readImageTemplate(modelId!, signal),
    enabled: !!modelId, retry: false, staleTime: 0, refetchOnWindowFocus: false, gcTime: 0,
  });
  const rows = list.data?.rows ?? [];
  const applyFilters = useCallback((next: TemplateLibraryFilters) => {
    if (next.search === filters.search && next.period === filters.period && next.from === filters.from && next.through === filters.through) return;
    setFilters(next);
    setPage(1);
  }, [filters]);

  function sortBy(column: TemplateListColumn) {
    setOrder((previous) => ({ column, ascending: previous.column === column ? !previous.ascending : column !== 'created_at' }));
    setPage(1);
  }

  async function confirmDetails(values: TemplateDetails) {
    if (!dialog || dialog.kind === 'delete') return;
    const { name, description, starter } = values;
    if (dialog.kind === 'create') {
      setEditor({ kind: 'new', initial: { name, description, design: startImageTemplate(starter) } });
    } else if (dialog.kind === 'copy') {
      setEditor({ kind: 'copy', model: dialog.model, metadata: { name, description } });
    } else {
      await renameImageTemplate(dialog.model, { name, description });
      setNotice('Modelo renomeado.');
      void queryClient.invalidateQueries({ queryKey: listKey });
    }
    setDialog(null);
  }

  async function remove(values: DeleteImageTemplateValues) {
    await deleteImageTemplate(values);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    void queryClient.invalidateQueries({ queryKey: listKey });
    setNotice('Modelo excluído.');
    setDialog(null);
  }

  if (editor) {
    const original = editor.kind === 'edit' ? detail.data ?? null : null;
    const initial = editor.kind === 'new' ? editor.initial : detail.data ? {
      name: editor.metadata?.name ?? detail.data.name, description: editor.metadata?.description ?? detail.data.description, design: detail.data.design,
    } : null;
    if (initial) return <ImageTemplateEditor initial={initial} original={original} userId={userId} onBack={() => setEditor(null)}
      onSaved={(isNew) => { if (isNew) setPage(1); void queryClient.invalidateQueries({ queryKey: listKey }); }} />;
    return <section className="ct-surface ct-library">
      <button type="button" className="ct-link" onClick={() => setEditor(null)}>← Modelos de imagem</button>
      {detail.isError ? <p className="ct-error" role="alert">{imageTemplateError(detail.error)} <button type="button" className="ct-link" onClick={() => void detail.refetch()}>Tentar novamente</button></p>
        : <p role="status">Carregando modelo…</p>}
    </section>;
  }

  return <section className="ct-library ct-surface">
    <header className="ct-library-heading">
      <div><p className="ct-breadcrumb">Marketing</p><h1>Modelos de imagem</h1><p>Crie e edite modelos de imagem para os produtos do ERP.</p></div>
      <button type="button" className="ct-button ct-create" onClick={() => setDialog({ kind: 'create' })}>
        <i className="bi bi-plus-lg" aria-hidden="true" />Criar
      </button>
    </header>
    <TemplateListFilters filters={filters} onApply={applyFilters} />
    {notice && <p role="status" className="ct-library-notice">{notice}</p>}
    <div className={list.isSuccess && !rows.length && !filtered ? 'ct-library-empty' : 'ct-library-card'}>
      {list.isError ? <p role="alert" className="ct-empty ct-error">{imageTemplateError(list.error)} <button className="ct-link" type="button" onClick={() => void list.refetch()}>Tentar novamente</button></p>
        : list.isPending ? <p className="ct-empty" role="status">Carregando modelos…</p>
          : rows.length ? <table className="ct-table">
            <thead><tr>{libraryColumns.map(({ column, label, className }) => <th key={column} className={className} scope="col"
              aria-sort={order.column === column ? order.ascending ? 'ascending' : 'descending' : undefined}>
              <button type="button" className="ct-table-sort" onClick={() => sortBy(column)}>{label}
                <i className={`bi ${order.column !== column ? 'bi-arrow-down-up' : order.ascending ? 'bi-arrow-up' : 'bi-arrow-down'}`} aria-hidden="true" />
              </button>
            </th>)}<th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{rows.map((model) => <tr key={model.id}>
              <td><button className="ct-link ct-model-name" type="button" onClick={() => setEditor({ kind: 'edit', model })}>{model.name}</button>
                <small className="ct-model-id">{model.id}</small>
                {model.description && <small className="ct-description-narrow">{model.description}</small>}</td>
              <td className="ct-list-description">{model.description || '—'}</td>
              <td><time dateTime={model.created_at}>{createdDate.format(new Date(model.created_at))}</time></td>
              <td><details className="ct-row-menu">
                <summary className="ct-button ct-icon-button" aria-label={`Ações de ${model.name}`}><i className="bi bi-three-dots" aria-hidden="true" /></summary>
                <div className="ct-row-actions">
                  {([['edit', 'Editar', 'bi-pencil'], ['rename', 'Renomear', 'bi-input-cursor-text'], ['copy', 'Fazer uma cópia', 'bi-copy'], ['delete', 'Excluir', 'bi-trash']] as const).map(([action, label, icon]) =>
                    <button key={action} type="button" className={action === 'delete' ? 'ct-error' : ''}
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        if (action === 'edit') setEditor({ kind: 'edit', model });
                        else setDialog({ kind: action, model });
                      }}><i className={`bi ${icon}`} aria-hidden="true" />{label}</button>)}
                </div>
              </details></td>
            </tr>)}</tbody>
          </table> : filtered ? <p className="ct-empty ct-muted" role="status">Nenhum modelo encontrado com esses filtros.</p> : <div className="ct-empty">
            <svg className="ct-empty-art" viewBox="0 0 144 112" aria-hidden="true">
              <rect x="24" y="10" width="89" height="77" rx="7" transform="rotate(-11 68 48)" fill="currentColor" opacity=".2" />
              <rect x="39" y="25" width="88" height="73" rx="7" fill="currentColor" opacity=".32" />
              <circle cx="103" cy="48" r="8" fill="currentColor" />
              <path d="M46 86l21-25 15 17 11-10 23 18z" fill="currentColor" />
            </svg>
            <h2>Nenhum modelo de imagem</h2><p>Crie um modelo em branco ou escolha um exemplo para começar.</p>
            <button type="button" className="ct-button ct-create" onClick={() => setDialog({ kind: 'create' })}>
              <i className="bi bi-plus-lg" aria-hidden="true" />Criar modelo
            </button>
          </div>}
    </div>
    {!list.isError && !!list.data?.total && <ERPListPagination page={page} pageSize={IMAGE_TEMPLATE_PAGE_SIZE} fixedPageSize={IMAGE_TEMPLATE_PAGE_SIZE}
      totalItems={list.data.total} itemLabel="modelos" ariaLabel="Paginação dos modelos de imagem" loading={list.isFetching} onPageChange={setPage} />}
    {dialog?.kind === 'delete' ? <TemplateDeleteDialog model={dialog.model} onClose={() => setDialog(null)} onConfirm={remove} />
      : dialog && <TemplateDetailsDialog mode={dialog.kind} defaults={dialog.kind === 'create' ? undefined : {
      name: dialog.kind === 'copy' ? `${dialog.model.name.slice(0, 90)} (cópia)` : dialog.model.name, description: dialog.model.description,
    }} onClose={() => setDialog(null)} onConfirm={confirmDetails} />}
  </section>;
}
