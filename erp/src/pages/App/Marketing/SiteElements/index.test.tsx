// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteElementsPage from './index';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' } }) }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock('./siteElementService', () => ({
  fetchSiteElementModels: mocks.list, SITE_ELEMENT_PAGE_SIZE: 15,
  siteElementImageUrl: (path: string) => `https://example.com/${path}`,
  siteElementErrorMessage: (error: Error) => error.message,
}));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue({ rows: [], count: 0 }); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><SiteElementsPage /></QueryClientProvider>);
}
describe('site element library', () => {
  it('starts empty without default models and loads only the selected type', async () => {
    setup();
    await screen.findByText('Nenhum modelo cadastrado');
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(mocks.list).toHaveBeenCalledWith('carousel', 1, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('tab', { name: 'Barra de destaque do topo' }));
    await screen.findByText(/Adicione o primeiro modelo de barra/);
    expect(mocks.list).toHaveBeenLastCalledWith('top_bar', 1, expect.any(AbortSignal));
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Novo modelo' }));
    await screen.findByRole('dialog');
    expect(screen.getByText('1920 × 80 px')).toBeTruthy();
  });
  it('shows an actionable error and retries without presenting a false empty library', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Consulta indisponível'));
    setup();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Consulta indisponível');
    expect(screen.queryByText('Nenhum modelo cadastrado')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar modelos' }));
    await screen.findByText('Nenhum modelo cadastrado');
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });
  it('loads page 2 with fixed pagination and starts at page 1 again when changing section', async () => {
    mocks.list.mockResolvedValue({ rows: [{ id: 'model', kind: 'carousel', name: 'Novembro', image_path: 'banner.png',
      width: 1920, height: 620, size_bytes: 1024, file_name: 'banner.png' }], count: 16 });
    setup();
    await screen.findByText('Novembro');
    expect(screen.getByText('15 por página')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('carousel', 2, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('tab', { name: 'Barra de destaque do topo' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('top_bar', 1, expect.any(AbortSignal)));
  });
});
