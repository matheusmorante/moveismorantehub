import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { supportCustomerRecordFiltersSchema, type SupportCustomerRecordFiltersInput } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import {
  formatBRL,
  formatDate,
  getCustomerOrderRecordsPage,
  type SupportCustomerOrderGroup,
  type SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { supabase } from '@/pages/utils/supabaseConfig';

const CUSTOMER_RECORD_PAGE_SIZES = [15, 30, 50] as const;
const STATUS_OPTIONS: Record<SupportCustomerOrderGroup, Array<{ value: string; label: string }>> = {
  sales: [
    { value: 'draft', label: 'Rascunho' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'fulfilled', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
  budgets: [
    { value: 'quoted', label: 'Aguardando aprovação' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'expired', label: 'Vencido' },
    { value: 'draft', label: 'Rascunho' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
  delivery: [
    { value: 'draft', label: 'Pendente de agendamento' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'in_transit', label: 'Em rota' },
    { value: 'arrived', label: 'No local' },
    { value: 'fulfilled', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
  assistance: [
    { value: 'draft', label: 'Rascunho' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'fulfilled', label: 'Atendido' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
  returns: [
    { value: 'draft', label: 'Rascunho' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'fulfilled', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  quoted: 'Aguardando aprovação do cliente',
  approved: 'Aprovado',
  aprovado: 'Aprovado',
  accepted: 'Aprovado',
  aceito: 'Aprovado',
  expired: 'Vencido',
  vencido: 'Vencido',
  scheduled: 'Agendado',
  in_transit: 'Em rota',
  arrived: 'No local',
  fulfilled: 'Atendido',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  completed: 'Concluído',
  delivered: 'Entregue',
  entregue: 'Entregue',
};

interface CustomerOrderRecordsViewProps {
  customerId: string | null;
  orderGroup: SupportCustomerOrderGroup;
  isLinked: boolean;
  canViewCommercial: boolean;
  canCreateBudget?: boolean;
  canShareBudget?: boolean;
  selectedRecord: SupportOrderSummary | null;
  onSelectRecord: (record: SupportOrderSummary) => void;
  onShareBudget?: (record: SupportOrderSummary) => void;
}

function orderRoute(orderType?: string) {
  if (orderType === 'budget') return '/budgets';
  if (orderType === 'assistance') return '/assistance-orders';
  if (orderType === 'return') return '/returns';
  return '/sales-order';
}

function statusClass(record: SupportOrderSummary) {
  if (['expired', 'vencido'].includes(record.status.toLowerCase())) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  if (record.isCanceled) return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';
  if (record.isCompleted) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
}

function OrderRecordDetails({ record, canShareBudget, onShareBudget }: {
  record: SupportOrderSummary;
  canShareBudget: boolean;
  onShareBudget?: (record: SupportOrderSummary) => void;
}) {
  const itemLines = record.lineItems || [];
  const isBudget = record.orderType === 'budget';
  return (
    <div className="space-y-3 animate-fade-in">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isBudget ? 'Orçamento' : 'Registro comercial'}</p>
            <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">#{record.orderNumber}</h4>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(record)}`}>
            {STATUS_LABELS[record.status.toLowerCase()] || record.status}
          </span>
        </div>
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Data</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{formatDate(record.createdAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Valor total</dt><dd className="font-bold text-slate-900 dark:text-slate-100">{formatBRL(record.totalAmount)}</dd></div>
          {record.paymentMethod && <div className="flex justify-between gap-3"><dt className="text-slate-500">Pagamento</dt><dd className="text-right text-slate-800 dark:text-slate-200">{record.paymentMethod}</dd></div>}
          {record.deliveryMethod && <div className="flex justify-between gap-3"><dt className="text-slate-500">Modalidade</dt><dd className="text-right text-slate-800 dark:text-slate-200">{record.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}</dd></div>}
          {record.deliveryStatus && <div className="flex justify-between gap-3"><dt className="text-slate-500">Entrega</dt><dd className="text-right text-slate-800 dark:text-slate-200">{STATUS_LABELS[record.deliveryStatus.toLowerCase()] || record.deliveryStatus}</dd></div>}
          {record.scheduledDate && <div className="flex justify-between gap-3"><dt className="text-slate-500">Agendamento</dt><dd className="text-right text-slate-800 dark:text-slate-200">{formatDate(record.scheduledDate)}{record.scheduledStartTime ? ` · ${record.scheduledStartTime}` : ''}{record.scheduledEndTime ? `–${record.scheduledEndTime}` : ''}</dd></div>}
          {record.deliveryFinishedAt && <div className="flex justify-between gap-3"><dt className="text-slate-500">Concluído em</dt><dd className="text-right text-slate-800 dark:text-slate-200">{formatDate(record.deliveryFinishedAt)}</dd></div>}
        </dl>
      </section>

      {record.assistanceDescription && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição da assistência</h5>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">{record.assistanceDescription}</p>
        </section>
      )}

      {Boolean(record.assemblyAppointments?.length) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agendamentos de montagem</h5>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {record.assemblyAppointments?.map((appointment, index) => (
              <li key={`${appointment.date}-${appointment.time}-${index}`} className="py-2 text-xs">
                <div className="flex justify-between gap-2"><span className="font-semibold text-slate-800 dark:text-slate-200">{appointment.item}</span><span className="shrink-0 text-slate-500">{appointment.status === 'completed' ? 'Concluída' : 'Pendente'}</span></div>
                <p className="mt-1 text-[11px] text-slate-500">{formatDate(appointment.date)}{appointment.time ? ` · ${appointment.time}` : ''} · {appointment.type === 'showroom' ? 'Mostruário' : 'Em domicílio'}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Itens</h5>
        {itemLines.length ? (
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {itemLines.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex justify-between gap-3 py-2 text-xs">
                <span className="min-w-0 text-slate-700 dark:text-slate-300">{item.quantity}× {item.name}</span>
                {item.amount !== null && <span className="shrink-0 font-medium text-slate-800 dark:text-slate-200">{formatBRL(item.amount)}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-xs text-slate-500">{record.itemsPreview}</p>}
      </section>

      <Link
        to={orderRoute(record.orderType)}
        state={{ saleOrderIdToOpen: record.id, orderTypeToOpen: record.orderType }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
      >
        {isBudget ? 'Abrir orçamento no ERP' : 'Abrir registro no ERP'} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
      </Link>
      {isBudget && canShareBudget && onShareBudget && (
        <button type="button" onClick={() => onShareBudget(record)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/60">
          Preparar para enviar no WhatsApp <i className="bi bi-whatsapp" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export const CustomerOrderRecordsView: React.FC<CustomerOrderRecordsViewProps> = ({
  customerId,
  orderGroup,
  isLinked,
  canViewCommercial,
  canCreateBudget = false,
  canShareBudget = false,
  selectedRecord,
  onSelectRecord,
  onShareBudget,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [appliedFilters, setAppliedFilters] = useState<SupportCustomerRecordFiltersInput>({ search: '', status: '' });
  const [records, setRecords] = useState<SupportOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const generationRef = useRef(0);
  const { register, handleSubmit, formState: { errors } } = useForm<SupportCustomerRecordFiltersInput>({
    resolver: zodResolver(supportCustomerRecordFiltersSchema),
    defaultValues: { search: '', status: '' },
  });

  const loadRecords = useCallback(async (requestPage: number, filters: SupportCustomerRecordFiltersInput, generation: number) => {
    if (!customerId || !isLinked || !canViewCommercial) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await getCustomerOrderRecordsPage(supabase, customerId, orderGroup, {
        page: requestPage,
        pageSize,
        search: filters.search,
        status: filters.status,
      });
      if (generation !== generationRef.current) return;
      setRecords(result.records);
      setTotal(result.total);
    } catch (loadError) {
      if (generation === generationRef.current) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os registros deste cliente.');
      }
    } finally {
      if (generation === generationRef.current) setIsLoading(false);
    }
  }, [canViewCommercial, customerId, isLinked, orderGroup, pageSize]);

  useEffect(() => {
    const generation = ++generationRef.current;
    setRecords([]);
    setTotal(0);
    setError('');
    if (!customerId || !isLinked || !canViewCommercial) {
      setIsLoading(false);
      return () => { generationRef.current += 1; };
    }
    void loadRecords(page, appliedFilters, generation);
    return () => { generationRef.current += 1; };
  }, [appliedFilters, loadRecords, page, retryKey]);

  const submitFilters = handleSubmit((values) => {
    setAppliedFilters(values);
    setPage(1);
  });

  if (!canViewCommercial) {
    return <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Seu perfil não tem permissão para consultar informações comerciais deste cliente.</p>;
  }
  if (!isLinked || !customerId) {
    return <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Vincule um cliente à conversa para consultar estes registros.</p>;
  }
  if (selectedRecord) return <OrderRecordDetails record={selectedRecord} canShareBudget={canShareBudget} onShareBudget={onShareBudget} />;

  const isBudgetList = orderGroup === 'budgets';

  return (
    <div className="space-y-3 animate-fade-in">
      {isBudgetList && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
          <p className="min-w-0 text-[11px] leading-relaxed text-blue-900 dark:text-blue-200">Orçamentos aguardando aprovação aparecem primeiro.</p>
          {canCreateBudget && <Link to="/budgets?type=budget&new=true" className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700">Criar orçamento</Link>}
        </div>
      )}
      <form onSubmit={submitFilters} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
        <label className="sr-only" htmlFor="customer-record-search">Buscar registros</label>
        <input
          id="customer-record-search"
          type="search"
          maxLength={100}
          {...register('search')}
          placeholder="Buscar por número, item ou status"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {errors.search && <p role="alert" className="text-[11px] text-red-600">{errors.search.message}</p>}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="customer-record-status">Filtrar por status</label>
          <select
            id="customer-record-status"
            {...register('status')}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS[orderGroup].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="submit" disabled={isLoading} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Filtrar</button>
        </div>
        {errors.status && <p role="alert" className="text-[11px] text-red-600">{errors.status.message}</p>}
      </form>

      {error && (
        <div role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-2 font-bold underline">Tentar novamente</button>
        </div>
      )}
      {isLoading && records.length === 0 && <p role="status" className="py-8 text-center text-xs text-slate-500">Carregando registros…</p>}
      {!isLoading && records.length === 0 && !error && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700">Nenhum registro encontrado para este cliente.</p>}

      <div className="space-y-2">
        {records.map((record) => {
          const assembly = record.assemblyAppointments?.[0];
          const status = orderGroup === 'delivery' && record.deliveryStatus ? record.deliveryStatus : record.status;
          const scheduleDate = record.scheduledDate || (orderGroup === 'delivery' ? assembly?.date : null);
          const scheduleTime = record.scheduledStartTime || (orderGroup === 'delivery' ? assembly?.time : null);
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelectRecord(record)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">{isBudgetList ? 'Orçamento' : orderGroup === 'delivery' ? 'Pedido' : ''} #{record.orderNumber}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusClass(record)}`}>{STATUS_LABELS[status.toLowerCase()] || status}</span>
              </span>
              <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>{scheduleDate ? `${formatDate(scheduleDate)}${scheduleTime ? ` · ${scheduleTime}` : ''}` : formatDate(record.createdAt)}</span><span className="font-bold text-slate-800 dark:text-slate-200">{isBudgetList || orderGroup === 'delivery' ? formatBRL(record.totalAmount) : `${record.itemsCount} itens`}</span>
              </span>
              <span className="mt-2 block truncate text-[10px] text-slate-500 dark:text-slate-400">{orderGroup === 'delivery' && assembly ? assembly.item : record.itemsPreview}</span>
            </button>
          );
        })}
      </div>

      <ERPListPagination
        ariaLabel="Paginação de registros do cliente"
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
        pageSizeOptions={CUSTOMER_RECORD_PAGE_SIZES}
        preferenceKey={`customer-records:${orderGroup}`}
        loading={isLoading}
      />
    </div>
  );
};
