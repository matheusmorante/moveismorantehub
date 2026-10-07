import { useCallback, useState } from 'react';
import type Order from '@/pages/types/order.type';
import {
  isValidRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../../../../../shared-utils/recipientTaxId';

export interface UseNfeRecipientTaxIdProps {
  order: Order | null;
  currentModel: '55' | '65';
}

export function useNfeRecipientTaxId({ order, currentModel }: UseNfeRecipientTaxIdProps) {
  const [recipientTaxIdError, setRecipientTaxIdError] = useState<string | null>(null);
  const [recipientTaxId, setRecipientTaxId] = useState(
    order?.customerData?.cpfCnpj || order?.customerData?.document || ''
  );

  const initialIe = order?.customerData?.ie || (order?.customerData as any)?.rgIe || '';
  const initialIndicator: '1' | '2' | '9' =
    currentModel === '65'
      ? '9'
      : order?.fiscalContext?.recipientIeIndicator ||
        order?.customerData?.ieIndicator ||
        (initialIe.trim() ? '1' : '9');

  const [recipientIe, setRecipientIe] = useState(initialIe);
  const [recipientIeIndicator, setRecipientIeIndicator] = useState<'1' | '2' | '9'>(initialIndicator);
  const [recipientIeError, setRecipientIeError] = useState<string | null>(null);

  const handleRecipientTaxIdChange = useCallback(
    (value: string) => {
      setRecipientTaxId(value);
      if (value.trim() === '' && currentModel === '65') {
        setRecipientTaxIdError(null);
      } else if (
        isValidRecipientTaxId(value) &&
        recipientTaxIdMatchesPersonType(value, order?.customerData?.personType)
      ) {
        setRecipientTaxIdError(null);
      }
    },
    [currentModel, order?.customerData?.personType]
  );

  const handleRecipientIeChange = useCallback((value: string) => {
    const cleaned = value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    setRecipientIe(cleaned);
    if (cleaned.trim()) {
      setRecipientIeError(null);
    }
  }, []);

  const handleRecipientIeIndicatorChange = useCallback((indicator: '1' | '2' | '9') => {
    setRecipientIeIndicator(indicator);
    if (indicator === '2') {
      setRecipientIe('');
      setRecipientIeError(null);
    } else if (indicator === '1') {
      // Se virou contribuinte mas não tem IE, avisa
      setRecipientIeError(null);
    } else {
      setRecipientIeError(null);
    }
  }, []);

  return {
    recipientTaxId,
    setRecipientTaxId: handleRecipientTaxIdChange,
    recipientTaxIdError,
    setRecipientTaxIdError,
    recipientIe,
    setRecipientIe: handleRecipientIeChange,
    recipientIeIndicator,
    setRecipientIeIndicator: handleRecipientIeIndicatorChange,
    recipientIeError,
    setRecipientIeError,
  };
}
