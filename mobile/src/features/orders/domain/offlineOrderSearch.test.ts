import { describe, expect, it } from 'vitest';
import { filterOfflineOrdersPage } from './offlineOrderSearch';

const item = (id: string, name: string, status: string, number: string, created_at: string) => ({
  id, customer_name: name, status, order_number: number, created_at, order_type: 'sale',
  total_value: 10, order_data: {},
}) as any;

describe('busca dos pedidos salvos offline', () => {
  const items = [
    item('1', 'Ana Florença', 'concluído', '3212', '2026-01-01'),
    item('2', 'Florença Ana', 'scheduled', '10', '2026-01-02'),
    item('3', 'Outro cliente', 'scheduled', '11', '2026-01-03'),
  ];
  it('aceita palavras fora de ordem e sem acento e aplica status antes de paginar', () => {
    const page = filterOfflineOrdersPage(items, { search: 'ana florenca', status: 'concluidos', page: 1, pageSize: 1 });
    expect(page.items.map((order) => order.id)).toEqual(['1']);
    expect(page.total).toBe(1);
  });
  it('aceita o código exibido com zeros à esquerda', () => {
    expect(filterOfflineOrdersPage(items, { search: '003212', status: 'all', page: 1, pageSize: 15 }).items[0].id).toBe('1');
  });
  it('ordena e pagina apenas os pedidos disponíveis no aparelho', () => {
    const page = filterOfflineOrdersPage(items, { search: '', status: 'all', page: 2, pageSize: 1 });
    expect(page.items.map((order) => order.id)).toEqual(['2']);
    expect(page.total).toBe(3);
  });
});
