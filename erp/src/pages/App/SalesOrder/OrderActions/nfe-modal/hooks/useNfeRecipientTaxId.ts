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

  return {
    recipientTaxId,
    setRecipientTaxId: handleRecipientTaxIdChange,
    recipientTaxIdError,
    setRecipientTaxIdError,
  };
}
