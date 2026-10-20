import React from 'react';
import type Order from '@/pages/types/order.type';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { formatRecipientTaxId } from '../../../../../../../../shared-utils/recipientTaxId';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import type { NfeTabId, FiscalFieldError } from '../types/nfeEmission.types';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { supabase } from '@/pages/utils/supabaseConfig';

export const maskRecipientTaxId = (value: string) => {
  if (/[a-z]/i.test(value)) return formatRecipientTaxId(value, 'PJ');
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length > 11) {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

export interface UseNfeEmissionModalStateProps {
  isOpen: boolean;
  order: Order | null;
  emissionOrder: Order | null;
  isLoadingCustomerType: boolean;
  initialEnvironment?: 1 | 2;
  environment: 1 | 2;
  setEnvironment: (env: 1 | 2) => void;
  setRecipientTaxId: (val: string) => void;
  fiscalFieldError: FiscalFieldError | null;
  recipientTaxIdError: string | null;
  emissionResult: NfeEmissionResult | null;
}

export function useNfeEmissionModalState({
  isOpen,
  order,
  emissionOrder,
  isLoadingCustomerType,
  initialEnvironment,
  environment,
  setEnvironment,
  setRecipientTaxId,
  fiscalFieldError,
  recipientTaxIdError,
  emissionResult,
}: UseNfeEmissionModalStateProps) {
  const [activeTab, setActiveTab] = React.useState<NfeTabId>('general');
  const [productionConfirmed, setProductionConfirmed] = React.useState(false);
  const [retryNumber, setRetryNumber] = React.useState('');
  const recipientTaxIdInput = React.useRef<HTMLInputElement>(null);
  const [fiscalStatuses, setFiscalStatuses] = React.useState<OrderFiscalBadgeStatuses | null>(null);
  const recipientTaxIdPrefilledOrderId = React.useRef<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const orderId = order?.id;
    if (!isOpen || !orderId) {
      setFiscalStatuses(null);
      return;
    }

    fetchOrderFiscalBadgeStatuses([orderId])
      .then((res) => {
        if (active && res[orderId]) {
          setFiscalStatuses(res[orderId]);
        }
      })
      .catch((err) => {
        console.error('[useNfeEmissionModalState] Falha ao consultar status fiscais:', err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, order?.id]);

  React.useEffect(() => {
    if (!isOpen || !emissionOrder?.id || isLoadingCustomerType) return;
    const prefillKey = `${emissionOrder.id}:${emissionOrder.customerData?.id || ''}`;
    if (recipientTaxIdPrefilledOrderId.current === prefillKey) return;

    recipientTaxIdPrefilledOrderId.current = prefillKey;
    const directTaxId =
      emissionOrder.customerData?.cpfCnpj ||
      emissionOrder.customerData?.document ||
      (emissionOrder as any).nfeDraft?.[environment === 1 ? '1' : '2']?.recipientTaxId ||
      (emissionOrder as any).nfeDraft?.['2']?.recipientTaxId ||
      (emissionOrder as any).nfeDraft?.['1']?.recipientTaxId ||
      '';
    if (directTaxId && directTaxId.trim()) {
      setRecipientTaxId(maskRecipientTaxId(directTaxId));
      return;
    }

    let active = true;
    void Promise.resolve(
      supabase
        ?.from?.('nfe_documents')
        ?.select?.('destinatario_documento,xml_nfe,status,document_type')
        ?.eq?.('order_id', emissionOrder.id)
        ?.in?.('status', ['homologada', 'autorizada', 'cancelada'])
        ?.order?.('created_at', { ascending: false })
    ).then((res: any) => {
      if (!active || !res?.data || res.data.length === 0) return;
      for (const doc of res.data) {
        if (doc.destinatario_documento && doc.destinatario_documento.trim()) {
          setRecipientTaxId(maskRecipientTaxId(doc.destinatario_documento));
          return;
        }
        if (doc.xml_nfe) {
          const cpfMatch = doc.xml_nfe.match(/<(?:\\w+:)?dest>[\\s\\S]*?<(?:\\w+:)?CPF>([0-9]{11})<\/(?:\\w+:)?CPF>/i);
          if (cpfMatch?.[1]) {
            setRecipientTaxId(maskRecipientTaxId(cpfMatch[1]));
            return;
          }
          const cnpjMatch = doc.xml_nfe.match(/<(?:\\w+:)?dest>[\\s\\S]*?<(?:\\w+:)?CNPJ>([0-9]{14})<\/(?:\\w+:)?CNPJ>/i);
          if (cnpjMatch?.[1]) {
            setRecipientTaxId(maskRecipientTaxId(cnpjMatch[1]));
            return;
          }
        }
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [
    isOpen,
    isLoadingCustomerType,
    emissionOrder?.id,
    emissionOrder?.customerData?.id,
    emissionOrder?.customerData?.cpfCnpj,
    emissionOrder?.customerData?.document,
    (emissionOrder as any)?.nfeDraft,
    environment,
    setRecipientTaxId,
  ]);

  React.useEffect(() => {
    if (fiscalFieldError) {
      setActiveTab(fiscalFieldError.tab);
      const timer = window.setTimeout(() => {
        const el = document.getElementById(fiscalFieldError.fieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if ('focus' in el && typeof el.focus === 'function') {
            el.focus();
          }
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [fiscalFieldError]);

  React.useEffect(() => {
    if (recipientTaxIdError && !fiscalFieldError) {
      setActiveTab('customer');
      recipientTaxIdInput.current?.focus();
    }
  }, [recipientTaxIdError, fiscalFieldError]);

  React.useEffect(() => {
    setRetryNumber(emissionResult?.numberConflict?.nextNumber?.toString() ?? '');
  }, [emissionResult?.numberConflict?.previousNumber, emissionResult?.numberConflict?.nextNumber]);

  React.useEffect(() => setProductionConfirmed(false), [environment]);

  useBodyScrollLock(isOpen);

  const isHmlIssued = Boolean(
    fiscalStatuses?.homologation === 'issued' ||
      (order?.nfeData?.status === 'homologada' && order?.nfeData?.environment === 2)
  );
  const isProdIssued = Boolean(
    fiscalStatuses?.production === 'issued' ||
      (order?.nfeData?.status === 'autorizada' && (order?.nfeData?.environment ?? 1) === 1)
  );

  React.useEffect(() => {
    if (isOpen) {
      if (initialEnvironment) {
        setEnvironment(initialEnvironment);
      } else if (isProdIssued && !isHmlIssued) {
        setEnvironment(2);
      } else if (isHmlIssued && !isProdIssued) {
        setEnvironment(1);
      } else {
        setEnvironment(DEFAULT_NFE_ENVIRONMENT);
      }
      setActiveTab('general');
    }
  }, [isOpen, initialEnvironment, isHmlIssued, isProdIssued, setEnvironment]);

  return {
    activeTab,
    setActiveTab,
    productionConfirmed,
    setProductionConfirmed,
    retryNumber,
    setRetryNumber,
    recipientTaxIdInput,
  };
}
