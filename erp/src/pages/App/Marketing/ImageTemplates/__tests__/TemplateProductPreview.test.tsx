// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mapProductPreviewSource } from '../productPreviewService';
import { TemplateProductPreview, useTemplateProductPreview } from '../TemplateProductPreview';

const mocks = vi.hoisted(() => ({ groups: vi.fn(), list: vi.fn(), read: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('../productPreviewService', async (original) => ({
  ...(await original<typeof import('../productPreviewService')>()), listPreviewProductGroups: mocks.groups,
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
const following = Array.from({ length: 5 }, (_, index) => mapProductPreviewSource({
  id: `p${index + 3}`, name: `Produto ${index + 3}`, code: `10${index + 3}`, unit_price: 50 + index,
  images: [`https://example.com/produto-${index + 3}.jpg`],
}));
const previewSources = [first, second, ...following];

function Owner({ requiredImageCount = 1, onProductWarm }: {
  requiredImageCount?: number;
  onProductWarm?: (product: ReturnType<typeof import('../productPreviewService').mapPreviewProduct>) => void;
}) {
  const preview = useTemplateProductPreview('operator', requiredImageCount, onProductWarm);
  return <><TemplateProductPreview preview={preview} disabled={false} />
    <output data-testid="preview">{preview.product ? JSON.stringify({ name: preview.product.fields.name,
      price: preview.product.fields.currentPrice, image: preview.product.images[0] }) : ''}</output></>;
}

beforeEach(() => {
  mocks.groups.mockReset().mockResolvedValue([{ id: 'cat-1', name: 'Móveis' }]);
  mocks.list.mockReset().mockResolvedValue({ rows: [
    ...previewSources.map(option),
  ], total: previewSources.length });
  mocks.read.mockReset().mockImplementation(async (id: string) => previewSources.find((source) => source.id === id)!);
});
afterEach(cleanup);

const option = (source: typeof first) => ({ id: source.id, name: source.name, code: source.code, active: true,
  previewSource: source, variationOptions: source.variations.map((variation) => ({ id: variation.id, name: variation.name,
    sku: variation.sku, active: variation.active !== false })) });

it('seleciona o produto na lista da prévia e pesquisa após três caracteres', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner /></QueryClientProvider>);
  const selection = await screen.findByRole('button', { name: 'Produto do preview Sofá' });
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('90'));
  fireEvent.click(selection);
  fireEvent.click(await screen.findByRole('option', { name: 'Mesa 102' }));
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg'));
  expect(screen.getByTestId('preview').textContent).toContain('300');

  fireEvent.click(screen.getByRole('button', { name: 'Produto do preview Mesa' }));
  const search = screen.getByRole('searchbox', { name: 'Buscar produto' });
  fireEvent.change(search, { target: { value: 'so' } });
  await screen.findByText('Digite pelo menos três letras ou números para pesquisar.');
  expect(mocks.list.mock.calls.some((call) => call[1] === 'so')).toBe(false);
  fireEvent.change(search, { target: { value: 'sof' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(1, 'sof', expect.any(AbortSignal)));
});

it('solicita fotos até o índice máximo usado pelas camadas do formato', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner requiredImageCount={12} /></QueryClientProvider>);
  await screen.findByRole('button', { name: 'Produto do preview Sofá' });
  await waitFor(() => expect(mocks.read).toHaveBeenCalledWith('p1', expect.any(AbortSignal), 12));
});

it.each([
  { distance: 'terceiro', id: 'p4', source: following[1] },
  { distance: 'quinto', id: 'p6', source: following[3] },
])('aquece detalhes dos dois próximos, mas mantém imagens dos cinco ao selecionar o $distance', async ({ id, source }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onProductWarm = vi.fn();
  let finishDetails!: (source: typeof following[number]) => void;
  const pendingDetails = new Promise<typeof following[number]>((resolve) => { finishDetails = resolve; });
  mocks.read.mockImplementation(async (readId: string) => readId === id
    ? pendingDetails
    : previewSources.find((candidate) => candidate.id === readId)!);

  render(<QueryClientProvider client={client}><Owner onProductWarm={onProductWarm} /></QueryClientProvider>);
  await screen.findByRole('button', { name: 'Produto do preview Sofá' });
  await waitFor(() => {
    expect(mocks.read.mock.calls.map(([id]) => id).sort()).toEqual(['p1', 'p2', 'p3']);
  });
  await waitFor(() => {
    const warmedIds = new Set(onProductWarm.mock.calls.map(([product]) => product.id));
    expect([...warmedIds].filter((id) => /^p[2-6]$/.test(id)).sort()).toEqual(['p2', 'p3', 'p4', 'p5', 'p6']);
  });

  fireEvent.click(screen.getByRole('button', { name: 'Produto do preview Sofá' }));
  fireEvent.click(await screen.findByRole('option', { name: `${source.name} ${source.code}` }));
  await waitFor(() => expect(mocks.read).toHaveBeenCalledWith(id, expect.any(AbortSignal), 1));
  expect(screen.getByTestId('preview').textContent).toContain(source.name);
  expect(screen.queryByText('Carregando a prévia do produto…')).toBeNull();
  finishDetails(source);
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain(source.name));
});

it('completa as cinco imagens pela próxima página sem passar de dois detalhes', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const pageProducts = Array.from({ length: 20 }, (_, index) => mapProductPreviewSource({
    id: `page-p${index + 1}`, name: `Produto ${index + 1}`, code: String(index + 1), unit_price: index + 1,
    images: [`https://example.com/pagina-${index + 1}.jpg`],
  }));
  const onProductWarm = vi.fn();
  mocks.list.mockImplementation(async (page: number) => ({
    rows: (page === 1 ? pageProducts.slice(0, 15) : pageProducts.slice(15)).map(option), total: pageProducts.length,
  }));
  mocks.read.mockImplementation(async (id: string) => pageProducts.find((source) => source.id === id)!);

  render(<QueryClientProvider client={client}><Owner onProductWarm={onProductWarm} /></QueryClientProvider>);
  await screen.findByRole('button', { name: 'Produto do preview Produto 1' });
  await waitFor(() => expect(mocks.read.mock.calls.map(([id]) => id).sort()).toEqual(['page-p1', 'page-p2', 'page-p3']));

  fireEvent.click(screen.getByRole('button', { name: 'Produto do preview Produto 1' }));
  fireEvent.click(await screen.findByRole('option', { name: 'Produto 15 15' }));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(2, '', expect.any(AbortSignal)));
  await waitFor(() => {
    const detailIds = new Set(mocks.read.mock.calls.map(([id]) => id));
    expect(detailIds.has('page-p16')).toBe(true);
    expect(detailIds.has('page-p17')).toBe(true);
    expect(detailIds.has('page-p18')).toBe(false);
    expect(detailIds.has('page-p19')).toBe(false);
    expect(detailIds.has('page-p20')).toBe(false);
  });
  await waitFor(() => {
    const warmedIds = new Set(onProductWarm.mock.calls.map(([product]) => product.id));
    expect([...warmedIds].filter((id) => /^page-p(?:16|17|18|19|20)$/.test(id)).sort())
      .toEqual(['page-p16', 'page-p17', 'page-p18', 'page-p19', 'page-p20']);
  });
});

it('filtra os produtos da prévia por categoria do ERP', async () => {
  mocks.list.mockReset().mockImplementation(async (_page: number, _search: string, _signal: AbortSignal, categoryId?: string) =>
    categoryId ? { rows: [option(second)], total: 1 }
      : { rows: [option(first), option(second)], total: 2 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Owner /></QueryClientProvider>);
  const group = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Conjunto de produtos' });
  const productSelect = await screen.findByRole('button', { name: 'Produto do preview Sofá' });
  fireEvent.change(group, { target: { value: 'cat-1' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(1, '', expect.any(AbortSignal), 'cat-1'));
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('azul.jpg'));
  fireEvent.click(productSelect);
  fireEvent.click(await screen.findByRole('option', { name: 'Mesa 102' }));
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg'));
  fireEvent.change(group, { target: { value: '' } });
  expect(screen.getByTestId('preview').textContent).toContain('mesa.jpg');
});
