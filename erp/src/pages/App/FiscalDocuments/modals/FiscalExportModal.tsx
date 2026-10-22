import React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { formatCurrency } from '@/pages/utils/formatters';
import { fiscalExportFormSchema } from '../schemas/fiscalExportSchema';
import {
  fetchFiscalExportHistory,
  previewFiscalExport,
  recordFiscalExport,
} from '../services/fiscalExportService';
import {
  generateFiscalExportPackage,
  getFiscalExportHistoryLabel,
  saveFiscalExportPackage,
} from '../services/fiscalExportPackageService';
import type {
  FiscalExportDocumentType,
  FiscalExportFormValues,
  FiscalExportFilters,
  FiscalExportHistoryItem,
  FiscalExportModel,
  FiscalExportPreview,
  FiscalExportStatus,
} from '../types/fiscalExport.types';

interface FiscalExportModalProps {
  isOpen: boolean;
  accountantView: boolean;
  onClose: () => void;
}

const modelOptions: Array<{ value: FiscalExportModel; label: string }> = [
  { value: '55', label: 'NF-e · modelo 55' },
  { value: '65', label: 'NFC-e · modelo 65' },
];

const documentTypeOptions: Array<{ value: FiscalExportDocumentType; label: string }> = [
  { value: 'outbound', label: 'Saída original' },
  { value: 'estorno', label: 'Estorno fiscal' },
  { value: 'return', label: 'Devolução fiscal' },
  { value: 'inbound', label: 'Nota fiscal de entrada importada' },
];

function currentMonthBounds() {
  const today = new Date();
  return {
    start: format(startOfMonth(today), 'yyyy-MM-dd'),
    end: format(endOfMonth(today), 'yyyy-MM-dd'),
  };
}

function previousMonthBounds() {
  const previous = subMonths(new Date(), 1);
  return {
    start: format(startOfMonth(previous), 'yyyy-MM-dd'),
    end: format(endOfMonth(previous), 'yyyy-MM-dd'),
  };
}

function createDefaultValues(): FiscalExportFormValues {
  const { start, end } = currentMonthBounds();
  return {
    purpose: 'accounting',
    period: 'this_month',
    periodStart: start,
    periodEnd: end,
    environment: '1',
    models: ['55', '65'],
    documentTypes: ['outbound', 'estorno', 'return'],
    statuses: ['autorizada', 'cancelada'],
    includeEvents: true,
    includeReport: true,
  };
}

function buildFilters(values: FiscalExportFormValues): FiscalExportFilters {
  return {
    purpose: values.purpose,
    periodStart: values.periodStart,
    periodEnd: values.periodEnd,
    environment: Number(values.environment) as 1 | 2,
    models: values.models,
    documentTypes: values.documentTypes,
    statuses: values.statuses,
    includeEvents: values.includeEvents,
    includeReport: values.includeReport,
  };
}

function statusLabel(status: FiscalExportStatus): string {
  switch (status) {
    case 'autorizada': return 'Autorizadas';
    case 'homologada': return 'Homologadas';
    case 'cancelada': return 'Canceladas';
    case 'denegada': return 'Denegadas';
    case 'rejeitada': return 'Rejeitadas · auditoria';
  }
}

function documentTypeLabel(type: FiscalExportDocumentType): string {
  switch (type) {
    case 'outbound': return 'Saídas originais';
    case 'estorno': return 'Estornos fiscais';
    case 'return': return 'Devoluções fiscais';
    case 'inbound': return 'Entradas importadas';
  }
}

function checkboxGroup<T extends string>(
  name: 'models' | 'documentTypes' | 'statuses',
  options: Array<{ value: T; label: string }>,
  value: T[],
  onChange: (next: T[]) => void,
  disabled: boolean
) {
  return (
    <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label key={`${name}-${option.value}`} className="flex items-start gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs dark:border-slate-700">
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(event) => onChange(
              event.target.checked
                ? [...value, option.value]
                : value.filter((entry) => entry !== option.value)
            )}
            className="mt-0.5 accent-blue-600"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export const FiscalExportModal: React.FC<FiscalExportModalProps> = ({
  isOpen,
  accountantView,
  onClose,
}) => {
  const titleId = React.useId();
  const [preview, setPreview] = React.useState<FiscalExportPreview | null>(null);
  const [previewKey, setPreviewKey] = React.useState('');
  const [history, setHistory] = React.useState<FiscalExportHistoryItem[]>([]);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FiscalExportFormValues>({
    resolver: zodResolver(fiscalExportFormSchema),
    defaultValues: createDefaultValues(),
    mode: 'onSubmit',
  });
  const values = useWatch({ control });
  const currentValues = (values || getValues()) as FiscalExportFormValues;
  const liveFilters = buildFilters(currentValues);
  const liveKey = JSON.stringify(liveFilters);
  const hasCurrentPreview = Boolean(preview && previewKey === liveKey);
  const accountingPurpose = currentValues.purpose === 'accounting';
  const environmentStatuses: FiscalExportStatus[] = currentValues.environment === '1'
    ? ['autorizada', 'cancelada', 'denegada', 'rejeitada']
    : ['homologada', 'cancelada', 'denegada', 'rejeitada'];

  React.useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setPreview(null);
    setPreviewKey('');
    setMessage(null);
    setIsLoadingHistory(true);
    setHistoryError(null);
    void fetchFiscalExportHistory()
      .then((rows) => { if (active) setHistory(rows); })
      .catch((error: unknown) => {
        if (active) setHistoryError(error instanceof Error ? error.message : 'Histórico indisponível.');
      })
      .finally(() => { if (active) setIsLoadingHistory(false); });
    return () => { active = false; };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isExporting) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const changePeriod = (period: FiscalExportFormValues['period']) => {
    setValue('period', period, { shouldValidate: true });
    const bounds = period === 'this_month' ? currentMonthBounds() : previousMonthBounds();
    if (period !== 'custom') {
      setValue('periodStart', bounds.start, { shouldValidate: true });
      setValue('periodEnd', bounds.end, { shouldValidate: true });
    }
    setPreview(null);
  };

  const handlePurposeChange = (purpose: FiscalExportFormValues['purpose']) => {
    setValue('purpose', purpose, { shouldValidate: true });
    if (purpose === 'accounting') {
      setValue('environment', '1', { shouldValidate: true });
      setValue('documentTypes', getValues('documentTypes').filter((type) => type !== 'inbound'), { shouldValidate: true });
      setValue('statuses', ['autorizada', 'cancelada'], { shouldValidate: true });
      setValue('includeEvents', true, { shouldValidate: true });
    }
    setPreview(null);
  };

  const handleEnvironmentChange = (environment: '1' | '2') => {
    setValue('environment', environment, { shouldValidate: true });
    setValue('statuses', environment === '1' ? ['autorizada', 'cancelada'] : ['homologada', 'cancelada'], { shouldValidate: true });
    setPreview(null);
  };

  const handlePreview = async (formValues: FiscalExportFormValues) => {
    const filters = buildFilters(formValues);
    setMessage(null);
    setPreview(null);
    setPreviewKey('');
    setIsPreviewing(true);
    try {
      const result = await previewFiscalExport(filters);
      setPreview(result);
      setPreviewKey(JSON.stringify(filters));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível consultar os documentos fiscais.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExport = async (formValues: FiscalExportFormValues) => {
    const filters = buildFilters(formValues);
    const filtersKey = JSON.stringify(filters);
    if (!preview || previewKey !== filtersKey || preview.totalCount === 0) {
      setMessage('Faça uma prévia atualizada e confirme que há documentos para exportar.');
      return;
    }
    setMessage('Iniciando a preparação do arquivo…');
    setIsExporting(true);
    try {
      const generatedPackage = await generateFiscalExportPackage(filters, preview, setMessage);
      await recordFiscalExport({
        exportId: generatedPackage.exportId,
        archiveName: generatedPackage.archiveName,
        filters,
      });
      saveFiscalExportPackage(generatedPackage);
      setMessage('Exportação registrada no histórico e download iniciado.');
      const rows = await fetchFiscalExportHistory();
      setHistory(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o pacote fiscal.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div>
            <h2 id={titleId} className="text-sm font-bold text-slate-900 dark:text-white">Exportar documentos fiscais</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Configure os documentos e o período antes de gerar o ZIP.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isExporting} aria-label="Fechar exportação" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit(handlePreview)} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <label htmlFor="fiscal-export-purpose" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Finalidade da exportação</label>
              <Controller
                name="purpose"
                control={control}
                render={({ field }) => (
                  <select id="fiscal-export-purpose" value={field.value} onChange={(event) => handlePurposeChange(event.target.value as FiscalExportFormValues['purpose'])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
                    <option value="accounting">Contabilidade · padrão</option>
                    <option value="custom">Exportação personalizada</option>
                  </select>
                )}
              />
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                Contabilidade inclui apenas Produção, notas autorizadas/canceladas e os XMLs de eventos fiscais registrados, quando existentes.
              </div>
            </section>

            <section className="space-y-2">
              <label htmlFor="fiscal-export-period" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Período de emissão</label>
              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <select id="fiscal-export-period" value={field.value} onChange={(event) => changePeriod(event.target.value as FiscalExportFormValues['period'])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
                    <option value="this_month">Mês atual</option>
                    <option value="last_month">Mês anterior</option>
                    <option value="custom">Personalizado</option>
                  </select>
                )}
              />
              {currentValues.period === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-slate-600 dark:text-slate-300">De
                    <Controller name="periodStart" control={control} render={({ field }) => <input type="date" value={field.value} onChange={field.onChange} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />} />
                  </label>
                  <label className="text-[11px] text-slate-600 dark:text-slate-300">Até
                    <Controller name="periodEnd" control={control} render={({ field }) => <input type="date" value={field.value} onChange={field.onChange} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />} />
                  </label>
                </div>
              )}
              {(errors.periodStart || errors.periodEnd) && <p role="alert" className="text-[11px] text-red-600">{errors.periodStart?.message || errors.periodEnd?.message}</p>}
            </section>
          </div>

          <section className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Ambiente</h3>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {accountingPurpose || accountantView || currentValues.environment === '1' ? 'Produção' : 'Homologação'}
              </span>
            </div>
            {currentValues.purpose === 'custom' && !accountantView && (
              <Controller
                name="environment"
                control={control}
                render={({ field }) => (
                  <select aria-label="Ambiente da exportação" value={field.value} onChange={(event) => handleEnvironmentChange(event.target.value as '1' | '2')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
                    <option value="1">Produção</option>
                    <option value="2">Homologação</option>
                  </select>
                )}
              />
            )}
          </section>

          <section className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Modelos fiscais</h3>
            <Controller name="models" control={control} render={({ field }) => checkboxGroup('models', modelOptions, field.value, field.onChange, false)} />
            {errors.models && <p role="alert" className="text-[11px] text-red-600">{errors.models.message}</p>}
          </section>

          <section className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tipos de documento</h3>
            <Controller name="documentTypes" control={control} render={({ field }) => checkboxGroup('documentTypes', accountingPurpose ? documentTypeOptions.filter((option) => option.value !== 'inbound') : documentTypeOptions, field.value, field.onChange, false)} />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Os filtros de modelo e tipo são combinados. Estornos fiscais e devoluções permanecem documentos próprios vinculados à nota original. Entradas importadas só podem ser incluídas em uma exportação personalizada.</p>
            {errors.documentTypes && <p role="alert" className="text-[11px] text-red-600">{errors.documentTypes.message}</p>}
          </section>

          <section className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Situação fiscal</h3>
            <Controller
              name="statuses"
              control={control}
              render={({ field }) => checkboxGroup(
                'statuses',
                environmentStatuses.map((status) => ({ value: status, label: statusLabel(status) })),
                field.value,
                field.onChange,
                accountingPurpose
              )}
            />
            {errors.statuses && <p role="alert" className="text-[11px] text-red-600">{errors.statuses.message}</p>}
          </section>

          <section className="mt-4 grid gap-2 sm:grid-cols-2">
            <Controller name="includeEvents" control={control} render={({ field }) => (
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={accountingPurpose} className="mt-0.5 accent-blue-600" />
                <span>{accountingPurpose ? 'Incluir XMLs dos eventos de cancelamento e protocolos' : 'Incluir XMLs dos eventos fiscais registrados e protocolos'} {accountingPurpose && <strong>(obrigatório na contabilidade)</strong>}</span>
              </label>
            )} />
            <Controller name="includeReport" control={control} render={({ field }) => (
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <input type="checkbox" checked={field.value} onChange={field.onChange} className="mt-0.5 accent-blue-600" />
                <span>Incluir relatório de conferência Excel (.xlsx)</span>
              </label>
            )} />
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={isPreviewing || isExporting} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {isPreviewing ? <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> : <i className="bi bi-search" aria-hidden="true" />}
              Pré-visualizar documentos
            </button>
            <button type="button" onClick={handleSubmit(handleExport)} disabled={isPreviewing || isExporting || !hasCurrentPreview || !preview?.totalCount} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isExporting ? <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> : <i className="bi bi-file-earmark-zip" aria-hidden="true" />}
              {isExporting ? 'Gerando ZIP…' : 'Exportar ZIP'}
            </button>
          </div>
          {Object.values(errors).length > 0 && <p role="alert" className="mt-2 text-[11px] text-red-600">Corrija os filtros indicados antes de continuar.</p>}

          {preview && hasCurrentPreview && (
            <section aria-live="polite" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
              <div className="grid gap-2 text-xs sm:grid-cols-4">
                <div><span className="text-slate-500">Documentos</span><strong className="block text-slate-900 dark:text-white">{preview.totalCount}</strong></div>
                {preview.inboundCount > 0 && <div><span className="text-slate-500">Entradas importadas</span><strong className="block text-slate-900 dark:text-white">{preview.inboundCount}</strong></div>}
                <div><span className="text-slate-500">Valor total</span><strong className="block text-slate-900 dark:text-white">{formatCurrency(preview.totalValue)}</strong></div>
                <div><span className="text-slate-500">Eventos fiscais registrados</span><strong className="block text-slate-900 dark:text-white">{preview.eventCount}</strong></div>
              </div>
              {preview.groups.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[380px] text-left text-[11px]">
                    <thead className="text-slate-500"><tr><th className="py-1 pr-2">Tipo</th><th className="py-1 pr-2">Situação</th><th className="py-1 pr-2">Qtd.</th><th className="py-1">Total</th></tr></thead>
                    <tbody>{preview.groups.map((group) => <tr key={`${group.documentType}-${group.status}`} className="border-t border-slate-200 dark:border-slate-800"><td className="py-1.5 pr-2">{documentTypeLabel(group.documentType)}</td><td className="py-1.5 pr-2">{statusLabel(group.status)}</td><td className="py-1.5 pr-2">{group.count}</td><td className="py-1.5">{formatCurrency(group.total)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p className="mt-2 text-xs text-slate-500">Nenhum documento corresponde aos filtros.</p>}
            </section>
          )}

          {message && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
          {isExporting && <div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className="h-full w-1/3 animate-pulse rounded bg-blue-600" /></div>}

          <section className="mt-5 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Exportações recentes</h3>
              {isLoadingHistory && <span className="text-[10px] text-slate-500">Carregando…</span>}
            </div>
            {historyError ? <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">{historyError}</p> : null}
            {!isLoadingHistory && !historyError && history.length === 0 && <p className="mt-2 text-[11px] text-slate-500">Nenhuma exportação registrada ainda.</p>}
            {history.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-200 text-[11px] dark:divide-slate-800">
                {history.slice(0, 8).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-slate-600 dark:text-slate-300">
                    <span>{getFiscalExportHistoryLabel(item)}</span>
                    <span>{formatCurrency(Number(item.total_value))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </form>
      </section>
    </div>
  );
};
