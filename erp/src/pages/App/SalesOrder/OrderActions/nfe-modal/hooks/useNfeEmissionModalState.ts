import React from 'react';
import type Order from '@/pages/types/order.type';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { formatRecipientTaxId } from '../../../../../../../../shared-utils/recipientTaxId';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import type { NfeTabId, FiscalFieldError } from '../types/nfeEmission.types';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

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
    if (!isOpen || !emissionOrder?.id) return;
    if (recipientTaxIdPrefilledOrderId.current === emissionOrder.id) return;

    recipientTaxIdPrefilledOrderId.current = emissionOrder.id;
    setRecipientTaxId(
      maskRecipientTaxId(
        emissionOrder.customerData?.cpfCnpj || emissionOrder.customerData?.document || ''
      )
    );
  }, [
    isOpen,
    emissionOrder?.id,
    emissionOrder?.customerData?.cpfCnpj,
    emissionOrder?.customerData?.document,
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

  React.useEffect(() => {
    if (!isOpen) return;
    const { body, documentElement } = document;
    const previousBody = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousBody;
      documentElement.style.overflow = previousHtml;
    };
  }, [isOpen]);

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
