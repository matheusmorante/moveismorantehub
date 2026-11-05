import { supabase } from './supabaseConfig';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';

export const fetchAssemblyPrintOrders = async () => {
  const selected = await withAbortTimeout(supabase.rpc('list_order_assembly_print_ids'), 'montagens:selecao-para-impressao', 15_000);
  if (selected.error) throw selected.error;
  if (!Array.isArray(selected.data) || selected.data.some((id: unknown) => typeof id !== 'string')) throw new Error('A consulta da impressão retornou resultados inválidos.');
  const rows: any[] = [];
  for (let from = 0; from < selected.data.length; from += 100) {
    const { data, error } = await withAbortTimeout(supabase.from('orders').select('id,status,order_type,deleted,order_data')
      .in('id', selected.data.slice(from, from + 100)), 'montagens:pedidos-da-impressao', 15_000);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return { data: rows, error: null };
};
