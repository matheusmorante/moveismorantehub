import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fetchCustomerSupportWhatsAppSendQuota,
  fetchCustomerSupportWhatsAppUsageDetails,
  type CustomerSupportMetaMonthlyUsage,
  type CustomerSupportWhatsAppSendQuota,
} from '@/pages/utils/customerSupport/customerSupportService';
import { CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA } from '../../../../../../../shared-utils/customerSupportWhatsAppSendQuota';
import { WhatsAppQuotaModal } from './WhatsAppQuotaModal';

export interface NavigationRailFooterProps {
  docsUrl?: string;
}

export const NavigationRailFooter: React.FC<NavigationRailFooterProps> = memo(({ docsUrl = '/system-docs' }) => {
  const [quota, setQuota] = useState<CustomerSupportWhatsAppSendQuota | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [metaUsage, setMetaUsage] = useState<CustomerSupportMetaMonthlyUsage | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const quotaButtonRef = useRef<HTMLButtonElement>(null);
  const quotaRequest = useRef(0);
  const detailsRequest = useRef(0);
  const active = useRef(false);

  const refreshQuota = useCallback(async () => {
    const request = ++quotaRequest.current;
    try {
      const next = await fetchCustomerSupportWhatsAppSendQuota(supabase);
      if (active.current && request === quotaRequest.current) setQuota(next);
    } catch {
      if (active.current && request === quotaRequest.current) setQuota(null);
    }
  }, []);

  const refreshDetails = useCallback(async () => {
    const request = ++detailsRequest.current;
    const quotaVersion = ++quotaRequest.current;
    setDetailsLoading(true);
    setDetailsError('');
    setMetaUsage(null);
    try {
      const details = await fetchCustomerSupportWhatsAppUsageDetails(supabase);
      if (!active.current || request !== detailsRequest.current) return;
      if (quotaVersion === quotaRequest.current) setQuota(details.quota);
      setMetaUsage(details.metaUsage || null);
    } catch {
      if (active.current && request === detailsRequest.current) setDetailsError('Não foi possível atualizar os detalhes agora.');
    } finally {
      if (active.current && request === detailsRequest.current) setDetailsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    detailsRequest.current += 1;
    setDetailsLoading(false);
    setModalOpen(false);
  }, []);

  useEffect(() => {
    active.current = true;
    void refreshQuota();
    const intervalId = window.setInterval(() => void refreshQuota(), 30_000);
    const onFocus = () => void refreshQuota();
    window.addEventListener('focus', onFocus);
    window.addEventListener(CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA.updatedEvent, onFocus);
    return () => {
      active.current = false;
      quotaRequest.current += 1;
      detailsRequest.current += 1;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA.updatedEvent, onFocus);
    };
  }, [refreshQuota]);

  const circumference = 2 * Math.PI * 14;
  const hourPercent = quota && quota.hour_limit > 0
    ? Math.max(0, Math.min(100, (quota.hour_remaining / quota.hour_limit) * 100))
    : 0;
  const quotaLabel = quota
    ? `Cota restante: ${quota.hour_remaining} de ${quota.hour_limit} mensagens por hora.`
    : 'Cota de envio indisponível.';

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <button
        ref={quotaButtonRef}
        type="button"
        aria-label={`Detalhes da cota. ${quotaLabel}`}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        title={quotaLabel}
        onClick={() => { setModalOpen(true); void refreshDetails(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800"
      >
        <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 h-full w-full">
          <circle
            cx="18"
            cy="18"
            r="14"
            transform="rotate(-90 18 18)"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-slate-300 dark:text-slate-700"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            transform="rotate(-90 18 18)"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${circumference * hourPercent / 100} ${circumference}`}
            className="text-blue-700 dark:text-blue-500"
          />
        </svg>
        <i className="bi bi-stopwatch-fill relative z-10 text-[9px] leading-none text-slate-500 dark:text-slate-400" aria-hidden="true" />
      </button>
      <Link
        to={docsUrl}
        title="Guia da Central"
        aria-label="Guia da Central"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 transition-colors"
      >
        <i className="bi bi-book-half text-sm" aria-hidden="true" />
      </Link>
      {modalOpen && <WhatsAppQuotaModal quota={quota} metaUsage={metaUsage} loading={detailsLoading} error={detailsError} returnFocusRef={quotaButtonRef} onRefresh={() => void refreshDetails()} onClose={closeModal} />}
    </div>
  );
});

NavigationRailFooter.displayName = 'NavigationRailFooter';
