import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { supabase } from '../../../../services/supabaseClient';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import {
  fetchInUseInvoiceKeys,
  IN_USE_INVOICE_MESSAGE,
} from '../../../../../../shared-utils/receiptInvoiceAvailability';

export type ReceiptUnreverseCheck = {
  id: string;
  state: 'checking' | 'available' | 'blocked' | 'error';
};

interface UseReceiptUnreverseAvailabilityParams {
  receiptMenu: any | null;
  unreverseCheck: ReceiptUnreverseCheck | null;
  setUnreverseCheck: Dispatch<SetStateAction<ReceiptUnreverseCheck | null>>;
}

export function useReceiptUnreverseAvailability({
  receiptMenu,
  unreverseCheck,
  setUnreverseCheck,
}: UseReceiptUnreverseAvailabilityParams) {
  const receiptMenuKey = receiptMenu?.fiscal_key || receiptMenu?.fiscalKey || '';

  useEffect(() => {
    let active = true;
    if (!receiptMenu || receiptMenu.status !== 'estornado' || !receiptMenuKey) {
      setUnreverseCheck(null);
      return () => { active = false; };
    }
    const id = receiptMenu.id;
    setUnreverseCheck({ id, state: 'checking' });
    void fetchInUseInvoiceKeys(supabase, [receiptMenuKey], id)
      .then((keys) => {
        if (active) setUnreverseCheck({ id, state: keys.has(normalizeFiscalIdentifier(receiptMenuKey)) ? 'blocked' : 'available' });
      })
      .catch(() => { if (active) setUnreverseCheck({ id, state: 'error' }); });
    return () => { active = false; };
  }, [receiptMenu?.id, receiptMenu?.status, receiptMenuKey, setUnreverseCheck]);

  const unreverseState = !receiptMenuKey ? 'available' : unreverseCheck?.id === receiptMenu?.id ? unreverseCheck.state : 'checking';
  const unreverseBlocked = unreverseState !== 'available';
  const unreverseReason = unreverseState === 'blocked' ? IN_USE_INVOICE_MESSAGE :
    unreverseState === 'error' ? 'Não foi possível conferir a nota. Feche e abra o menu para tentar novamente.' :
    'Conferindo o recebimento da nota...';

  return { unreverseBlocked, unreverseReason };
}
