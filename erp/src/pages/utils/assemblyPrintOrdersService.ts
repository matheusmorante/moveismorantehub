import { excludeTestOrders } from '../../../../shared-utils/testArtifactQueries';
import { supabase } from './supabaseConfig';

export const fetchAssemblyPrintOrders = () =>
  excludeTestOrders(
    supabase.from('orders').select('id, status, order_type, deleted, order_data')
  )
    .eq('deleted', false)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
