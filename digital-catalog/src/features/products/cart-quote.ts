import type { CartItem } from '@/hooks/use-cart';
import { z } from 'zod';

export const cartQuoteFormSchema = z.object({
  items: z.array(z.object({
    id: z.string().regex(/^[0-9a-f-]{36}(?:-[0-9a-f-]{36})?$/i, 'Produto inválido.'),
    name: z.string().min(1), price: z.number().finite().nonnegative(),
    image: z.string(), quantity: z.number().int().min(1).max(9999),
  })).min(1, 'O carrinho está vazio.').max(100, 'Consulte até 100 produtos por vez.'),
});

export function reconcileCartQuote(items: CartItem[], rows: Array<{ id: string; price: number | string | null; stock: number | string | null }>) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return items.map((item) => {
    const row = byId.get(item.id);
    if (!row || row.price == null || !Number.isFinite(Number(row.price)) || Number(row.price) < 0) {
      throw new Error(`${item.name} não está mais disponível no catálogo. Remova-o para continuar.`);
    }
    return { ...item, price: Number(row.price), stock: row.stock == null ? null : Number(row.stock) };
  });
}
