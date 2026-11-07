// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mapProductPreviewSource } from './productPreviewService';
import { TemplateProductPreview, useTemplateProductPreview } from './TemplateProductPreview';

const mocks = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('./productPreviewService', async (original) => ({
  ...(await original<typeof import('./productPreviewService')>()), listPreviewProducts: mocks.list, readPreviewProduct: mocks.read,
}));

const first = mapProductPreviewSource({ id: 'p1', name: 'Sofá', code: '101', unit_price: 100,
  product_variations: [
    { id: 'v1', product_id: 'p1', name: 'Sofá Azul', sku: '101-01', active: true, price: 100, promo_price: 90,
      use_parent_price: false, use_parent_promo_price: false, image_url: 'https://example.com/azul.jpg' },
    { id: 'v2', product_id: 'p1', name: 'Sofá Cinza', sku: '101-02', active: true, price: 200, promo_price: 150,
      use_parent_price: false, use_parent_promo_price: false, image_url: 'https://example.com/cinza.jpg' },
  ] });
const second = mapProductPreviewSource({ id: 'p2', name: 'Mesa', code: '102', unit_price: 300, images: ['https://example.com/mesa.jpg'] });

function Owner() {
  const preview = useTemplateProductPreview('operator');
  return <><TemplateProductPreview preview={preview} disabled={false} />
    <output data-testid="preview">{preview.product ? JSON.stringify({ name: preview.product.fields.name,
      price: preview.product.fields.currentPrice, image: preview.product.images[0] }) : ''}</output></>;
}

beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue({ rows: [
    { id: 'p1', name: 'Sofá', code: '101', active: true }, { id: 'p2', name: 'Mesa', code: '102', active: true },
  ], total: 2 });
  mocks.read.mockReset().mockImplementation(async (id: string) => id === 'p1' ? first : second);
});
afterEach(cleanup);

it('seleciona produto e variação do ERP e pesquisa após três caracteres', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner /></QueryClientProvider>);
  const variation = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Variação' });
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('90'));
  fireEvent.change(variation, { target: { value: 'v2' } });
  expect(screen.getByTestId('preview').textContent).toContain('150');
  expect(screen.getByTestId('preview').textContent).toContain('cinza.jpg');
  fireEvent.change(screen.getByRole('combobox', { name: 'Prévia de um produto' }), { target: { value: 'p2' } });
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg'));
  expect(screen.getByTestId('preview').textContent).toContain('300');

  fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar produtos' }), { target: { value: 'so' } });
  await screen.findByText('Digite pelo menos três letras ou números para pesquisar.');
  expect(mocks.list.mock.calls.some((call) => call[1] === 'so')).toBe(false);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar produtos' }), { target: { value: 'sof' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(1, 'sof', expect.any(AbortSignal)));
});
