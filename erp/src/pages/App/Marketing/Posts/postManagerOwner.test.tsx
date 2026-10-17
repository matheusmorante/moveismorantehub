// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ campaigns: vi.fn(), models: vi.fn(), links: vi.fn(), rules: vi.fn(), saveRules: vi.fn(), saveCampaign: vi.fn(), removeCampaign: vi.fn(), saveModel: vi.fn(), linkModel: vi.fn(), user: { id: 'operator' }, model: {} as any }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-router-dom', () => ({ useSearchParams: () => [new URLSearchParams()] }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => { const query = { select: () => query, eq: () => query, order: async () => ({ data: [], error: null }) }; return query; } } }));
vi.mock('./services/postCreatorService', () => ({ postCreatorService: { campaigns: mocks.campaigns, models: mocks.models, links: mocks.links, globalGuidelines: mocks.rules, saveGlobalGuidelines: mocks.saveRules, saveCampaign: mocks.saveCampaign, removeCampaign: mocks.removeCampaign, saveModel: mocks.saveModel, linkModel: mocks.linkModel } }));
vi.mock('./components/Editor/usePostEditor', () => ({ usePostEditor: () => ({ product: { id: 'product', name: 'Mesa' }, selectProduct: vi.fn(), products: [], setSearch: vi.fn() }) }));
vi.mock('./services/postProductImageResolver', () => ({ resolveProductImages: () => ({ productImages: null, validation: null }) }));
vi.mock('./components/CampaignElementsPanel', () => ({ CampaignElementsPanel: (props: any) => <div><button onClick={() => props.onCreate('LOGO')}>Novo logo</button><button onClick={() => props.onChangePrimary('https://images.example/new.png')}>Trocar foto</button><button onClick={() => props.onChangePrimary('javascript:invalid')}>Foto inválida</button><button onClick={props.onResetOverrides}>Restaurar fotos</button><span>{props.hasManualOverrides ? 'Fotos personalizadas' : 'Fotos padrão'}</span></div> }));
vi.mock('./components/PostCreatorModelModal', () => ({ PostCreatorModelModal: (props: any) => <div><button onClick={() => void props.onSave(mocks.model).catch(() => {})}>Salvar logo</button><button onClick={props.onClose}>Fechar logo</button></div> }));
vi.mock('./components/PreviewProductPicker', () => ({ PreviewProductPicker: () => null }));
vi.mock('./components/PromptPreview/PromptPreview', () => ({ PromptPreview: () => null }));
vi.mock('./components/PostsLibrary/PostsLibraryPage', () => ({ PostsLibraryPage: () => null }));
vi.mock('./components/ElementModelDetailsModal', () => ({ ElementModelDetailsModal: () => null }));
import MarketingPostsManager from './index';
const campaign = { id: 'campaign', name: 'Campanha', active: true, createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z' };
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); mocks.user = { id: 'operator' };
  mocks.campaigns.mockResolvedValue([campaign]); mocks.models.mockResolvedValue([]); mocks.links.mockResolvedValue([]); mocks.rules.mockResolvedValue('Texto inicial');
  mocks.saveRules.mockResolvedValue(undefined); mocks.removeCampaign.mockResolvedValue(undefined); mocks.linkModel.mockResolvedValue(undefined);
  mocks.saveCampaign.mockImplementation(async (values) => ({ ...campaign, ...values })); mocks.saveModel.mockImplementation(async (values) => values);
  mocks.model = { id: 'model', name: ' Logo ', elementType: 'LOGO', contentKind: 'STATIC_VISUAL', opportunityId: null, prompt: '', referenceFiles: [], generationVersion: 1, status: 'NO_PREVIEW', createdAt: campaign.createdAt, updatedAt: campaign.updatedAt };
  vi.stubGlobal('confirm', vi.fn(() => true));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const loaded = () => screen.findByRole('option', { name: 'Campanha' });
const manager = () => fireEvent.click(screen.getByRole('button', { name: /Gerenciar/ }));
const createCampaign = async () => { manager(); fireEvent.click(screen.getByRole('button', { name: '+ Criar campanha' })); fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Nova campanha ' } }); fireEvent.click(screen.getByRole('button', { name: 'Criar campanha' })); await waitFor(() => expect(mocks.saveCampaign).toHaveBeenCalledOnce()); };
describe('active post manager owner', () => {
  it('requests confirmed reads before enabling existing campaign data', async () => {
    render(<MarketingPostsManager />); await loaded(); expect(mocks.campaigns).toHaveBeenCalledWith({ confirm: true }); expect(mocks.links).toHaveBeenCalledWith('campaign', { confirm: true }); expect(mocks.saveCampaign).not.toHaveBeenCalled();
  });
  it('composes the actual campaign modal through receipt and refresh before ending submit', async () => {
    const pending = deferred(); mocks.saveCampaign.mockReturnValue(pending.promise); render(<MarketingPostsManager />); await loaded(); await createCampaign();
    expect(screen.getByRole('button', { name: 'Criar campanha' })).toHaveProperty('disabled', true);
    expect(mocks.saveCampaign.mock.calls[0][0]).toMatchObject({ name: 'Nova campanha' }); expect(mocks.saveCampaign.mock.calls[0][1]).toMatchObject({ confirm: true });
    await act(async () => { pending.resolve({ ...campaign, ...mocks.saveCampaign.mock.calls[0][0] }); });
    await screen.findByRole('button', { name: '+ Criar campanha' });
  });
  it('retries only the refresh after a confirmed new campaign and preserves its id', async () => {
    mocks.campaigns.mockResolvedValueOnce([campaign]).mockRejectedValueOnce(new Error('Read failed')).mockResolvedValue([campaign]);
    render(<MarketingPostsManager />); await loaded(); await createCampaign(); await screen.findAllByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Criar campanha' })); await screen.findByRole('button', { name: '+ Criar campanha' }); expect(mocks.saveCampaign).toHaveBeenCalledOnce();
  });
  it('allocates another identity for a second new campaign in the same open modal', async () => {
    render(<MarketingPostsManager />); await loaded(); await createCampaign(); await screen.findByRole('button', { name: '+ Criar campanha' });
    fireEvent.click(screen.getByRole('button', { name: '+ Criar campanha' })); fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outra campanha' } }); fireEvent.click(screen.getByRole('button', { name: 'Criar campanha' }));
    await waitFor(() => expect(mocks.saveCampaign).toHaveBeenCalledTimes(2)); expect(mocks.saveCampaign.mock.calls[0][0].id).not.toBe(mocks.saveCampaign.mock.calls[1][0].id);
  });
  it('composes the real rules form through a confirmed service and displays failures', async () => {
    mocks.saveRules.mockRejectedValueOnce(Object.assign(new Error('Recusado pelo servidor'), { knownFailure: true })); render(<MarketingPostsManager />); await loaded();
    fireEvent.click(screen.getByRole('button', { name: /Regras gerais/ })); const input = screen.getByPlaceholderText('Descreva as regras globais de posicionamento...');
    await waitFor(() => expect(input).toHaveProperty('disabled', false)); fireEvent.change(input, { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar agora' }));
    await screen.findAllByText('Recusado pelo servidor'); expect(mocks.saveRules).toHaveBeenCalledWith('', expect.objectContaining({ confirm: true }));
  });
  it('awaits campaign deletion and blocks duplicate clicks through the modal', async () => {
    const pending = deferred(); mocks.removeCampaign.mockReturnValue(pending.promise); render(<MarketingPostsManager />); await loaded(); manager();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Excluir' })); fireEvent.click(screen.getByRole('button', { name: 'Excluir' })); });
    await waitFor(() => expect(mocks.removeCampaign).toHaveBeenCalledOnce()); await act(async () => { pending.resolve(undefined); }); expect(mocks.removeCampaign.mock.calls[0][1]).toMatchObject({ confirm: true });
  });
  it('retries only linking after model persistence was confirmed', async () => {
    mocks.linkModel.mockRejectedValueOnce(Object.assign(new Error('Vínculo recusado'), { knownFailure: true })); render(<MarketingPostsManager />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Novo logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' })); await screen.findByText(/Modelo salvo.*Vínculo recusado/); fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' }));
    await waitFor(() => expect(mocks.linkModel).toHaveBeenCalledTimes(2)); expect(mocks.saveModel).toHaveBeenCalledOnce(); expect(mocks.saveModel.mock.calls[0][0].name).toBe('Logo');
  });
  it('rejects an invalid model command even if a child calls its callback directly', async () => {
    mocks.model.elementType = 'INVALID'; render(<MarketingPostsManager />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Novo logo' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' }));
    await screen.findByRole('alert'); expect(mocks.saveModel).not.toHaveBeenCalled(); expect(mocks.linkModel).not.toHaveBeenCalled();
  });
  it('stops before linking when the operator changes after model confirmation', async () => {
    const pending = deferred(); mocks.saveModel.mockReturnValue(pending.promise); const view = render(<MarketingPostsManager />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Novo logo' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' }));
    await waitFor(() => expect(mocks.saveModel).toHaveBeenCalledOnce()); mocks.user = { id: 'other' }; view.rerender(<MarketingPostsManager />); await act(async () => { pending.resolve(mocks.model); }); expect(mocks.linkModel).not.toHaveBeenCalled();
  });
  it('does not publish an image choice or clear the previous choice when storage refuses', async () => {
    localStorage.setItem('morante_post_image_selection_product', JSON.stringify({ primaryUrl: 'https://images.example/old.png' }));
    render(<MarketingPostsManager />); await loaded(); expect(screen.getByText('Fotos personalizadas')).toBeTruthy();
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ primaryUrl: 'https://images.example/old.png' }), setItem: () => {}, removeItem: () => {} });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar foto' })); await screen.findByRole('alert'); expect(screen.getByText('Fotos personalizadas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar fotos' })); await screen.findByText('A seleção salva não foi removida. Tente novamente.'); expect(screen.getByText('Fotos personalizadas')).toBeTruthy();
  });
  it('rejects an unsafe image URL before local storage mutation', async () => {
    render(<MarketingPostsManager />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Foto inválida' })); await screen.findByRole('alert'); expect(localStorage.getItem('morante_post_image_selection_product')).toBeNull();
  });
  it('bounds a stalled configuration read and shows an explicit retry', async () => {
    vi.useFakeTimers(); mocks.campaigns.mockReturnValueOnce(new Promise(() => {})); render(<MarketingPostsManager />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); }); expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmada/); expect(screen.getByRole('button', { name: 'Tentar atualizar campanhas' })).toBeTruthy();
  });
  it('retains the campaign draft and blocks replay after an uncertain write', async () => {
    mocks.saveCampaign.mockRejectedValue(Object.assign(new Error('Gravação incerta'), { uncertain: true })); render(<MarketingPostsManager />); await loaded(); await createCampaign(); await screen.findAllByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Criar campanha' })); await waitFor(() => expect(mocks.saveCampaign).toHaveBeenCalledOnce()); expect(screen.getByLabelText('Nome')).toHaveProperty('value', ' Nova campanha ');
  });
  it('blocks a second link after the first link has an uncertain result', async () => {
    mocks.linkModel.mockRejectedValue(Object.assign(new Error('Vínculo incerto'), { uncertain: true })); render(<MarketingPostsManager />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Novo logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' })); await screen.findByText(/Modelo salvo.*Vínculo incerto/); fireEvent.click(screen.getByRole('button', { name: 'Salvar logo' }));
    expect(mocks.saveModel).toHaveBeenCalledOnce(); expect(mocks.linkModel).toHaveBeenCalledOnce();
  });
});
