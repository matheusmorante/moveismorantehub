// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteElementsPage from './index';

const mocks = vi.hoisted(() => ({ list: vi.fn(), activate: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' } }) }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock('./siteElementService', () => ({
  fetchSiteElementModels: mocks.list, SITE_ELEMENT_PAGE_SIZE: 15,
  setSiteElementActivation: mocks.activate,
  siteElementImageUrl: (path: string) => `https://example.com/${path}`,
  siteElementErrorMessage: (error: Error) => error.message,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.activate.mockReset();
  mocks.list.mockResolvedValue({ rows: [], count: 0 });
});
const carousel = {
  id: '33bb9fd7-d91a-4291-80ac-4bad09910179', kind: 'carousel', name: 'Novembro', image_path: 'banner.png',
  width: 1920, height: 620, size_bytes: 1024, file_name: 'banner.png', active: true, updated_at: '2026-11-24T15:00:00Z',
};
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><SiteElementsPage /></QueryClientProvider>);
}
describe('site element library', () => {
  it('starts empty without default models and loads only the selected type', async () => {
    setup();
    expect(mocks.list).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    await screen.findByText('Nenhum modelo cadastrado');
    expect(mocks.list).toHaveBeenCalledWith('carousel', 1, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista de submódulos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Barra de destaque do topo' }));
    await screen.findByText(/Adicione o primeiro modelo da barra/);
    expect(mocks.list).toHaveBeenLastCalledWith('top_bar', 1, expect.any(AbortSignal));
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Novo modelo' }));
    await screen.findByRole('dialog');
    expect(screen.getByText('2880 × 720 px')).toBeTruthy();
    expect(screen.getAllByLabelText('Imagem para desktop', { exact: false })).toHaveLength(1);
  });
  it('shows a list error and retries when reopening the section', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Consulta indisponível'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Consulta indisponível');
    expect(screen.queryByText('Nenhum modelo cadastrado')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista de submódulos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    await screen.findByText('Nenhum modelo cadastrado');
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });
  it('loads page 2 with fixed pagination and starts at page 1 again when changing section', async () => {
    mocks.list.mockResolvedValue({ rows: [carousel], count: 16 });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    await screen.findByText('Novembro');
    expect(screen.getByText('15 por página')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('carousel', 2, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista de submódulos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Barra de destaque do topo' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('top_bar', 1, expect.any(AbortSignal)));
  });
  it('places the switch before Edit and updates the card only when each change is confirmed', async () => {
    mocks.list.mockResolvedValue({ rows: [carousel], count: 1 });
    const disabledModel = { id: carousel.id, active: false, updated_at: '2026-11-24T15:01:00Z' };
    let confirmDeactivation!: (value: typeof disabledModel) => void;
    mocks.activate.mockReturnValueOnce(new Promise<typeof disabledModel>((resolve) => { confirmDeactivation = resolve; }));
    mocks.activate.mockResolvedValueOnce({ ...disabledModel, active: true, updated_at: '2026-11-24T15:02:00Z' });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    const toggle = await screen.findByRole('switch', { name: 'Ativação de Novembro' });
    const edit = screen.getByRole('button', { name: 'Editar Novembro' });
    expect(toggle.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith({
      id: carousel.id, active: false, updated_at: carousel.updated_at,
    }));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle).toHaveProperty('disabled', true);
    expect(edit).toHaveProperty('disabled', true);
    fireEvent.click(toggle);
    expect(mocks.activate).toHaveBeenCalledOnce();

    await act(async () => confirmDeactivation(disabledModel));
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    expect(toggle.textContent).toBe('Inativo');
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    expect(mocks.activate).toHaveBeenLastCalledWith({
      id: carousel.id, active: true, updated_at: disabledModel.updated_at,
    });
    expect(mocks.list).toHaveBeenCalledOnce();
  });
  it('shows a refusal, keeps the confirmed state and refreshes the carousel page', async () => {
    mocks.list.mockResolvedValue({ rows: [carousel], count: 1 });
    mocks.activate.mockRejectedValueOnce(new Error('Sem permissão para alterar o modelo.'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Carrossel de imagens' }));
    const toggle = await screen.findByRole('switch', { name: 'Ativação de Novembro' });
    fireEvent.click(toggle);
    expect((await screen.findByRole('alert')).textContent).toBe('Sem permissão para alterar o modelo.');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });
});
