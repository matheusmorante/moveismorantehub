// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import ProductSearchInput from './ProductSearchInput';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
afterEach(cleanup);

it('encontra e seleciona o produto quando as palavras são digitadas fora de ordem', () => {
  const product = { id: 'one', name: 'Balcão para Pia Florença', code: '123', unitPrice: 999, stock: 0 } as Product;
  const onSelect = vi.fn();
  render(<ProductSearchInput products={[product]} onSelectProduct={onSelect} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar produto' }), { target: { value: 'balcao florenca pia' } });
  const result = screen.getByRole('button', { name: 'Balcão para Pia Florença' });
  expect(result.textContent).toBe('Balcão para Pia Florença');
  fireEvent.click(result);
  expect(onSelect).toHaveBeenCalledWith(product);
});
