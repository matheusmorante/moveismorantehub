import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  CustomerSupportMetaMonthlyUsage,
  CustomerSupportWhatsAppSendQuota,
} from '@/pages/utils/customerSupport/customerSupportService';

interface WhatsAppQuotaModalProps {
  quota: CustomerSupportWhatsAppSendQuota | null;
  metaUsage: CustomerSupportMetaMonthlyUsage | null;
  loading: boolean;
  error: string;
  returnFocusRef: React.RefObject<HTMLButtonElement>;
  onRefresh: () => void;
  onClose: () => void;
}

function QuotaProgress({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = Math.min(100, Math.max(0, (used / limit) * 100));
  const circumference = 2 * Math.PI * 15;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)} className="relative h-12 w-12 shrink-0">
        <svg aria-hidden="true" viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)}
            className={percentage >= 80 ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'} />
        </svg>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-slate-800 dark:text-white">{Math.max(0, limit - used)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">restantes</p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">{limit}<span className="ml-1 text-xs font-normal text-slate-500">total</span></p>
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

export const WhatsAppQuotaModal: React.FC<WhatsAppQuotaModalProps> = ({
  quota, metaUsage, loading, error, returnFocusRef, onRefresh, onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') || []);
      if (!buttons.length) return;
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); (returnFocusRef.current || previous)?.focus(); };
  }, [onClose, returnFocusRef]);

  const metaCost = metaUsage?.status === 'available' && metaUsage.amount !== null && metaUsage.currency
    ? formatMoney(metaUsage.amount, metaUsage.currency) : null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-quota-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <div ref={modalRef} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><i className="bi bi-speedometer2" aria-hidden="true" /></div>
            <div><h2 id="whatsapp-quota-title" className="text-base font-bold text-slate-900 dark:text-white">Cota WhatsApp</h2><p className="text-xs text-slate-500 dark:text-slate-400">Por número da Central</p></div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhes da cota" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800"><i className="bi bi-x-lg" aria-hidden="true" /></button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <section aria-label="Limite interno de envio" className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
            <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100">Limite interno da Central</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
              O limite de 10 envios por minuto e 50 por hora controla o ritmo da Central e da IA. Ele conta tentativas independentemente da janela e não representa cobrança nem franquia da Meta.
            </p>
          </section>
          {quota ? <>
            <div className="grid gap-2 sm:grid-cols-2"><QuotaProgress label="Por minuto" used={quota.minute_used} limit={quota.minute_limit} /><QuotaProgress label="Por hora" used={quota.hour_used} limit={quota.hour_limit} /></div>
            <section aria-label="Envios de hoje" className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Envios de hoje</h3><span className="text-[11px] text-slate-500 dark:text-slate-400">sem limite diário</span></div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[['Tentativas', quota.day_attempts, 'text-slate-900 dark:text-white'], ['Aceitas pela API', quota.day_sent, 'text-emerald-600 dark:text-emerald-400'], ['Recusadas', quota.day_failed, 'text-rose-600 dark:text-rose-400'], ['Incertas', quota.day_uncertain, 'text-amber-600 dark:text-amber-400']].map(([label, value, color]) => <div key={label} className="min-w-0"><p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p><p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{label}</p></div>)}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Tentativas incluem falhas após o início do envio. O histórico anterior a esta atualização pode estar incompleto; aceite pela API não confirma entrega nem cobrança.</p>
            </section>
          </> : <p role="status" className="text-sm text-slate-500">{loading ? 'Carregando a cota…' : 'Não foi possível carregar a cota agora.'}</p>}

          <section aria-label="Regras de cobrança da Meta" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quando a Meta cobra</h3>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              <li>A cobrança é por mensagem <strong>entregue</strong> e varia conforme a categoria e o país do destinatário. Mensagens recebidas do cliente não são cobradas.</li>
              <li>Mensagens de serviço, como respostas comuns sem modelo, têm 1.000 entregas gratuitas por número empresarial a cada mês. Depois desse limite, cada nova mensagem de serviço entregue pode ser cobrada. O saldo não passa para o mês seguinte.</li>
              <li>Marketing e autenticação seguem suas tarifas por entrega. Desde 01/10/2026, modelos de utilidade também podem ser cobrados mesmo quando enviados com a conversa aberta.</li>
              <li>A mensagem do cliente abre ou renova a janela de atendimento de 24 horas, que permite responder sem modelo. Essa janela não garante gratuidade; depois dela, é necessário um modelo aprovado, salvo se houver uma janela especial de entrada gratuita. Uma tentativa de texto livre fora das condições aceitas pela Meta é recusada e não gera cobrança.</li>
              <li>Quando o cliente inicia por anúncio Click-to-WhatsApp ou botão elegível da Página, pode abrir uma janela especial de entrada gratuita. O prazo varia conforme a origem e as atualizações da Meta; só conte com a isenção quando a Meta classificar a entrega como <span className="font-medium">free entry point</span>.</li>
            </ul>
          </section>

          <section aria-label="Gasto com mensagens da Meta" className="rounded-2xl border border-violet-200 bg-violet-50/50 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Gasto Meta · mês atual</h3>
                {metaCost ? <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{metaCost}</p>
                  : <p role="status" className="mt-1 text-xs text-slate-600 dark:text-slate-300">{loading ? 'Consultando…' : metaUsage?.message || error || 'Indisponível'}</p>}
              </div>
              <button type="button" onClick={onRefresh} disabled={loading} aria-label="Atualizar gasto da Meta" title="Atualizar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300"><i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} aria-hidden="true" /></button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              {metaUsage?.delivered != null && <span>{metaUsage.delivered} entregues · todas as categorias</span>}
              <span>Estimativa · todos os números</span>
            </div>
            {metaUsage && (metaUsage.service_free != null || metaUsage.billable_delivered != null || metaUsage.free_entry_point != null) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300">
              {metaUsage.service_free != null && <span>{metaUsage.service_free} serviços classificados como gratuitos</span>}
              {metaUsage.billable_delivered != null && <span>{metaUsage.billable_delivered} entregas classificadas como faturáveis</span>}
              {metaUsage.free_entry_point != null && <span>{metaUsage.free_entry_point} entregas em entrada gratuita</span>}
            </div>}
            <p className="mt-2 text-[10px] text-slate-400">O custo e as classificações vêm da análise de preços da Meta e podem levar algum tempo para atualizar; confira a fatura para o valor final.</p>
          </section>
        </div>
      </div>
    </div>, document.body,
  );
};
