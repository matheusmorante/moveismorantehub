import { matchesSearchText } from '../../../../../shared-utils/searchText';
import type { MobileOrderListItem } from '../services/mobileOrderListService';

const normalize = (value: unknown) => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Filtra somente os pedidos já presentes no aparelho, enquanto estiver offline. */
export function filterOfflineOrdersPage(
  items: MobileOrderListItem[],
  values: { status: string; search: string; page: number; pageSize: number },
) {
  const filtered = items.filter((item) => {
    const status = normalize(item.status);
    const delivery = normalize(item.delivery_method || item.order_data?.shipping?.deliveryMethod || item.order_data?.shipping?.deliveryType);
    const type = normalize(item.order_type || item.order_data?.orderType || 'sale');
    const statusMatches = (() => {
      switch (values.status) {
        case 'agendados': return ['scheduled', 'agendado'].includes(status);
        case 'atendidos':
        case 'concluidos': return ['fulfilled', 'atendido', 'completed', 'concluido', 'entregue', 'finalizado'].includes(status);
        case 'rascunhos': return ['draft', 'rascunho'].includes(status);
        case 'cancelados': return status.includes('cancel');
        case 'retiradas': return delivery.includes('pickup') || delivery.includes('retirada');
        case 'assistencias': return type === 'assistance';
        default: return true;
      }
    })();
    if (!statusMatches) return false;
    const term = values.search.trim();
    if (!term) return true;
    const text = [item.customer_name, item.order_number, item.id,
      item.order_data?.customerData?.fullName, item.order_data?.orderIndex].filter(Boolean).join(' ');
    if (matchesSearchText(text, term)) return true;
    if (!/^\d+$/.test(term)) return false;
    const numeric = term.replace(/^0+/, '') || '0';
    return [item.order_number, item.order_data?.orderIndex].some((value) =>
      /^\d+$/.test(String(value ?? '')) && (String(value).replace(/^0+/, '') || '0') === numeric
    );
  }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(a.id).localeCompare(String(b.id)));
  const from = (Math.max(1, values.page) - 1) * values.pageSize;
  return { items: filtered.slice(from, from + values.pageSize), total: filtered.length };
}
