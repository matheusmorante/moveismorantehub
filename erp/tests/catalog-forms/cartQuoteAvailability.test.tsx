import { expect, it, vi } from 'vitest';
import { reconcileCartQuote } from '@/features/products/cart-quote';
import { sendCartInterest } from '@/services/whatsapp';

const cartItem = { id: 'product-1', name: 'Poltrona', price: 550, image: '', quantity: 2, stock: 0 };

it('mantém a quantidade solicitada na mensagem do WhatsApp com saldo zero no ERP', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  const rows = [{ id: cartItem.id, price: '600', stock: 0 }];
  const quoted = reconcileCartQuote([cartItem], rows);

  expect(quoted[0]).toMatchObject({ price: 600, quantity: 2 });
  sendCartInterest(quoted, 1200);

  const url = new URL(open.mock.calls[0][0] as string);
  const message = url.searchParams.get('text');
  expect(message).toContain('Poltrona (2x)');
  expect(message).not.toContain('Disponibilidade sob consulta');
});

it('bloqueia a cotação de um item retirado do catálogo', () => {
  expect(() => reconcileCartQuote([cartItem], [])).toThrow('não está mais disponível no catálogo');
});
