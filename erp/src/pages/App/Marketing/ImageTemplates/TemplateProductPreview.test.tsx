// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mapProductPreviewSource } from './productPreviewService';
import { TemplateProductPreview, useTemplateProductPreview } from './TemplateProductPreview';

const mocks = vi.hoisted(() => ({ groups: vi.fn(), list: vi.fn(), read: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('./productPreviewService', async (original) => ({
  ...(await original<typeof import('./productPreviewService')>()), listPreviewProductGroups: mocks.groups,
  listPreviewProducts: mocks.list, readPreviewProduct: mocks.read,
}));

const first = mapProductPreviewSource({ id: 'p1', name: 'Sofá', code: '101', unit_price: 100,
  product_variations: [
    { id: 'v1', product_id: 'p1', name: 'Sofá Azul', sku: '101-01', active: true, price: 100, promo_price: 90,
      use_parent_price: false, use_parent_promo_price: false, image_url: 'https://example.com/azul.jpg' },
    { id: 'v2', product_id: 'p1', name: 'Sofá Cinza', sku: '101-02', active: true, price: 200, promo_price: 150,
      use_parent_price: false, use_parent_promo_price: false, image_url: 'https://example.com/cinza.jpg' },
  ] });
const second = mapProductPreviewSource({ id: 'p2', name: 'Mesa', code: '102', unit_price: 300, images: ['https://example.com/mesa.jpg'] });

function Owner({ requiredImageCount = 1 }: { requiredImageCount?: number }) {
  const preview = useTemplateProductPreview('operator', requiredImageCount);
  return <><TemplateProductPreview preview={preview} disabled={false} />
    <output data-testid="preview">{preview.product ? JSON.stringify({ name: preview.product.fields.name,
      price: preview.product.fields.currentPrice, image: preview.product.images[0] }) : ''}</output></>;
}

beforeEach(() => {
  mocks.groups.mockReset().mockResolvedValue([{ id: 'cat-1', name: 'Móveis' }]);
  mocks.list.mockReset().mockResolvedValue({ rows: [
    option(first), option(second),
  ], total: 2 });
  mocks.read.mockReset().mockImplementation(async (id: string) => id === 'p1' ? first : second);
});
afterEach(cleanup);

const option = (source: typeof first) => ({ id: source.id, name: source.name, code: source.code, active: true,
  previewSource: source, variationOptions: source.variations.map((variation) => ({ id: variation.id, name: variation.name,
    sku: variation.sku, active: variation.active !== false })) });

it('seleciona a variação diretamente na prévia e pesquisa após três caracteres', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner /></QueryClientProvider>);
  const selection = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Prévia de um produto' });
  await waitFor(() => expect(selection.value).toBe(JSON.stringify(['p1', 'v1'])));
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('90'));
  fireEvent.change(selection, { target: { value: JSON.stringify(['p1', 'v2']) } });
  expect(screen.getByTestId('preview').textContent).toContain('150');
  expect(screen.getByTestId('preview').textContent).toContain('cinza.jpg');
  fireEvent.change(selection, { target: { value: JSON.stringify(['p2', '']) } });
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg'));
  expect(screen.getByTestId('preview').textContent).toContain('300');

  fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar produtos' }), { target: { value: 'so' } });
  await screen.findByText('Digite pelo menos três letras ou números para pesquisar.');
  expect(mocks.list.mock.calls.some((call) => call[1] === 'so')).toBe(false);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar produtos' }), { target: { value: 'sof' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(1, 'sof', expect.any(AbortSignal)));
});

it('solicita fotos até o índice máximo usado pelas camadas do formato', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner requiredImageCount={12} /></QueryClientProvider>);
  await screen.findByRole('combobox', { name: 'Prévia de um produto' });
  await waitFor(() => expect(mocks.read).toHaveBeenCalledWith('p1', expect.any(AbortSignal), 12));
});

it('filtra os produtos da prévia por categoria do ERP', async () => {
  mocks.list.mockReset().mockImplementation(async (_page: number, _search: string, _signal: AbortSignal, categoryId?: string) =>
    categoryId ? { rows: [option(second)], total: 1 }
      : { rows: [option(first), option(second)], total: 2 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner /></QueryClientProvider>);
  const group = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Conjunto de produtos' });
  const productSelect = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Prévia de um produto' });
  fireEvent.change(group, { target: { value: 'cat-1' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(1, '', expect.any(AbortSignal), 'cat-1'));
  await waitFor(() => expect(productSelect.value).toBe(JSON.stringify(['p1', 'v1'])));
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('azul.jpg'));
  fireEvent.change(productSelect, { target: { value: JSON.stringify(['p2', '']) } });
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg'));
  fireEvent.change(group, { target: { value: '' } });
  await waitFor(() => expect(productSelect.value).toBe(JSON.stringify(['p2', ''])));
  expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg');
});
