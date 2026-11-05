import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import {
  formatBRL,
  formatDate,
  getCustomerOrderRecordsPage,
  type SupportCustomerOrderGroup,
  type SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { supabase } from '@/pages/utils/supabaseConfig';

const CUSTOMER_RECORD_PAGE_SIZE = 5;
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
  in_transit: 'Em deslocamento',
  arrived: 'No local',
  fulfilled: 'Atendido',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  completed: 'Concluído',
  delivered: 'Entregue',
  entregue: 'Entregue',
};

interface CustomerOrderRecordsViewProps {
  contactPhone: string;
  orderGroup: SupportCustomerOrderGroup;
  canViewCommercial: boolean;
  canShareBudget?: boolean;
  onOpenRecord: (record: SupportOrderSummary) => void;
  onShareBudget?: (record: SupportOrderSummary) => void;
}

type SupportOrderType = 'sale' | 'budget' | 'assistance' | 'return';

function getRecordOrderType(orderType: string | undefined, group: SupportCustomerOrderGroup): SupportOrderType {
  if (group === 'sales') return 'sale';
  if (group === 'budgets') return 'budget';
  if (group === 'assistance') return 'assistance';
  if (group === 'returns') return 'return';
  const normalizedType = orderType?.toLowerCase();
  if (normalizedType === 'budget' || normalizedType === 'assistance' || normalizedType === 'return') return normalizedType;
  return 'sale';
}

function statusClass(record: SupportOrderSummary) {
  if (['expired', 'vencido'].includes(record.status.toLowerCase())) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  if (record.isCanceled) return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';
  if (record.isCompleted) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
}

export const CustomerOrderRecordsView: React.FC<CustomerOrderRecordsViewProps> = ({
  contactPhone,
  orderGroup,
  canViewCommercial,
  canShareBudget = false,
  onOpenRecord,
  onShareBudget,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = CUSTOMER_RECORD_PAGE_SIZE;
  const [records, setRecords] = useState<SupportOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const generationRef = useRef(0);
  const loadRecords = useCallback(async (requestPage: number, generation: number) => {
    if (!contactPhone || !canViewCommercial) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await getCustomerOrderRecordsPage(supabase, contactPhone, orderGroup, {
        page: requestPage,
        pageSize,
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
  }, [canViewCommercial, contactPhone, orderGroup, pageSize]);

  useEffect(() => {
    const generation = ++generationRef.current;
    setRecords([]);
    setTotal(0);
    setError('');
    if (!contactPhone || !canViewCommercial) {
      setIsLoading(false);
      return () => { generationRef.current += 1; };
    }
    void loadRecords(page, generation);
    return () => { generationRef.current += 1; };
  }, [loadRecords, page, retryKey]);

  if (!canViewCommercial) {
    return <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Seu perfil não tem permissão para consultar informações comerciais deste cliente.</p>;
  }
  if (!contactPhone) {
    return <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Esta conversa não tem um telefone de contato para localizar os pedidos.</p>;
  }
  const isBudgetList = orderGroup === 'budgets';
  const isAllOrdersList = orderGroup === 'all';

  return (
    <div className="space-y-3 animate-fade-in">
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
          const includesDelivery = orderGroup === 'delivery' || isAllOrdersList;
          const status = includesDelivery && record.deliveryStatus ? record.deliveryStatus : record.status;
          const scheduleDate = record.scheduledDate || (includesDelivery ? assembly?.date : null);
          const scheduleTime = record.scheduledStartTime || (includesDelivery ? assembly?.time : null);
          const recordType = getRecordOrderType(record.orderType, orderGroup);
          const recordTypeLabel = recordType === 'budget' ? 'Orçamento'
            : recordType === 'assistance' ? 'Assistência'
              : recordType === 'return' ? 'Devolução'
                : (isBudgetList ? 'Orçamento' : isAllOrdersList || orderGroup === 'delivery' || orderGroup === 'sales' ? 'Pedido' : '');
          const showTotalAmount = isBudgetList || orderGroup === 'delivery' || (isAllOrdersList && (recordType === 'budget' || Boolean(scheduleDate || record.deliveryStatus || assembly)));
          return (
            <div key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
              <button
                type="button"
                onClick={() => onOpenRecord(record)}
                aria-label={`Abrir detalhes de ${recordTypeLabel || 'registro'} #${record.orderNumber}`}
                className="block w-full p-3.5 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100">{recordTypeLabel ? `${recordTypeLabel} ` : ''}#{record.orderNumber}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusClass(record)}`}>{STATUS_LABELS[status.toLowerCase()] || status}</span>
                </span>
                {record.customerName && (
                  <span className="mt-1 block truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {record.customerName}
                  </span>
                )}
                <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>{scheduleDate ? `${formatDate(scheduleDate)}${scheduleTime ? ` · ${scheduleTime}` : ''}` : formatDate(record.createdAt)}</span><span className="font-bold text-slate-800 dark:text-slate-200">{showTotalAmount ? formatBRL(record.totalAmount) : `${record.itemsCount} itens`}</span>
                </span>
                <span className="mt-2 block truncate text-[10px] text-slate-500 dark:text-slate-400">{includesDelivery && assembly ? assembly.item : record.itemsPreview}</span>
              </button>
              {recordType === 'budget' && canShareBudget && onShareBudget && (
                <div className="border-t border-slate-100 px-3.5 py-2 dark:border-slate-800">
                  <button type="button" onClick={() => onShareBudget(record)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/60">
                    Preparar para enviar no WhatsApp <i className="bi bi-whatsapp" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ERPListPagination
        ariaLabel="Paginação de registros do cliente"
        page={page}
        pageSize={pageSize}
        fixedPageSize={CUSTOMER_RECORD_PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        loading={isLoading}
      />
    </div>
  );
};
