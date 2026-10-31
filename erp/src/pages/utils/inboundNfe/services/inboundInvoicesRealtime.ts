import { supabase } from '../../supabaseConfig';
import {
  INBOUND_INVOICE_LIST_REFRESH_EVENT,
  INBOUND_INVOICE_LIST_REFRESH_TOPIC,
} from '../../../../../../shared-utils/inboundInvoiceListRealtime';

export const subscribeToInboundInvoiceListRefresh = (onRefresh: () => void) => {
  const channel = supabase
    .channel(INBOUND_INVOICE_LIST_REFRESH_TOPIC, { config: { private: true } })
    .on('broadcast', { event: INBOUND_INVOICE_LIST_REFRESH_EVENT }, onRefresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onRefresh();
    });

  return () => {
    void supabase.removeChannel(channel);
  };
};
