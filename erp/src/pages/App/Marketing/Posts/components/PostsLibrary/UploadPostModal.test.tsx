// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ ratio: vi.fn(), upload: vi.fn(), error: vi.fn(), success: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warn: mocks.error, info: vi.fn(), success: mocks.success } }));
vi.mock('../../services/productPostsService', () => ({ productPostsService: { validateImageRatio: mocks.ratio, uploadPost: mocks.upload } }));
import { UploadPostModal } from './UploadPostModal';
const props = () => ({ campaigns: [], preselectedProductId: 'product', preselectedProductName: 'Mesa', onClose: vi.fn(), onUploaded: vi.fn() });
const file = () => new File(['image'], 'image.png', { type: 'image/png' });
const pending = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((done) => { resolve = done; }); return { promise, resolve }; };
const selectFile = async (image = file()) => { await act(async () => { fireEvent.change(screen.getByLabelText('Arquivo da arte'), { target: { files: [image] } }); }); };
const submit = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Adicionar à Biblioteca' })); }); };
beforeEach(() => {
  vi.resetAllMocks(); mocks.user = { id: 'operator' }; mocks.ratio.mockResolvedValue({ valid: true, format: 'FEED_4_5' });
  mocks.upload.mockImplementation(async (values) => ({ id: values.postId, productId: values.productId, format: values.format, campaignId: values.campaignId, imageUrl: 'https://images.example/post.png' }));
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('post upload owner', () => {
  it('waits for record and refresh receipts before closing and blocks duplicate writes', async () => {
    const saved = pending(), refreshed = pending(), owner = { ...props(), onUploaded: vi.fn(() => refreshed.promise) };
    mocks.upload.mockReturnValueOnce(saved.promise);
    render(<UploadPostModal {...owner} />); await selectFile(); await submit();
    expect(mocks.upload).toHaveBeenCalledTimes(1); expect(owner.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(owner.onClose).not.toHaveBeenCalled();
    const values = mocks.upload.mock.calls[0][0];
    await act(async () => { saved.resolve({ id: values.postId, productId: 'product', format: 'FEED_4_5', campaignId: null }); });
    expect(owner.onUploaded).toHaveBeenCalledOnce(); expect(owner.onClose).not.toHaveBeenCalled();
    await act(async () => { refreshed.resolve(true); }); expect(owner.onClose).toHaveBeenCalledOnce();
  });
  it('rejects a chosen format that differs from the decoded image before upload', async () => {
    render(<UploadPostModal {...props()} />); await selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Story / Status 9:16' })); await submit();
    expect(mocks.upload).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toMatch(/formato escolhido/);
  });
  it('runs the real file resolver before image decoding and reports unsupported input', async () => {
    render(<UploadPostModal {...props()} />); await selectFile(new File(['bad'], 'bad.pdf', { type: 'application/pdf' }));
    expect(mocks.ratio).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('blocks closing while local file verification is pending and releases preview URLs', async () => {
    const ratio = pending(), owner = props(); mocks.ratio.mockReturnValueOnce(ratio.promise);
    const view = render(<UploadPostModal {...owner} />); await selectFile(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(owner.onClose).not.toHaveBeenCalled(); expect(screen.getByRole('status').textContent).toMatch(/proporção/);
    await act(async () => { ratio.resolve({ valid: true, format: 'FEED_4_5' }); });
    view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
  it('retries a refresh refusal without uploading an already saved post again', async () => {
    const owner = { ...props(), onUploaded: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true) };
    render(<UploadPostModal {...owner} />); await selectFile(); await submit();
    expect(screen.getByRole('alert').textContent).toMatch(/arte foi salva/); expect(owner.onClose).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Atualizar Biblioteca' })); });
    expect(mocks.upload).toHaveBeenCalledOnce(); expect(owner.onUploaded).toHaveBeenCalledTimes(2); expect(owner.onClose).toHaveBeenCalledOnce();
  });
  it('preserves file and permits correction after a known pre-write failure', async () => {
    mocks.upload.mockRejectedValueOnce(Object.assign(new Error('Arquivo recusado'), { knownFailure: true }));
    const owner = props(); render(<UploadPostModal {...owner} />); await selectFile(); await submit();
    expect(screen.getByRole('alert').textContent).toBe('Arquivo recusado'); expect(screen.getByAltText('preview')).toBeTruthy();
    await submit(); expect(mocks.upload).toHaveBeenCalledTimes(2); expect(owner.onClose).toHaveBeenCalledOnce();
  });
  it('bounds an uncertain upload and blocks late confirmation or replay', async () => {
    vi.useFakeTimers(); const upload = pending(), owner = props(); mocks.upload.mockReturnValueOnce(upload.promise);
    render(<UploadPostModal {...owner} />); await selectFile();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Adicionar à Biblioteca' })); await vi.advanceTimersByTimeAsync(65_001); });
    expect(screen.getByRole('alert')).toBeTruthy(); const values = mocks.upload.mock.calls[0][0];
    await act(async () => { upload.resolve({ id: values.postId, productId: 'product', format: 'FEED_4_5', campaignId: null }); });
    await submit(); expect(mocks.upload).toHaveBeenCalledOnce(); expect(owner.onUploaded).not.toHaveBeenCalled();
  });
  it('ignores a saved record after the modal changes to another product', async () => {
    const upload = pending(), owner = props(); mocks.upload.mockReturnValueOnce(upload.promise);
    const view = render(<UploadPostModal {...owner} />); await selectFile(); await submit();
    const values = mocks.upload.mock.calls[0][0]; view.rerender(<UploadPostModal {...owner} preselectedProductId="other" preselectedProductName="Outro" />);
    await act(async () => { upload.resolve({ id: values.postId, productId: 'product', format: 'FEED_4_5', campaignId: null }); });
    expect(owner.onUploaded).not.toHaveBeenCalled(); expect(owner.onClose).not.toHaveBeenCalled(); expect(screen.getByText('Outro')).toBeTruthy();
  });
  it('passes parsed product search input and ignores an earlier response after clearing', async () => {
    const lookup = pending(), search = vi.fn(() => lookup.promise);
    render(<UploadPostModal campaigns={[]} onClose={vi.fn()} onUploaded={vi.fn()} onSearchProducts={search} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar produto...'), { target: { value: '  mesa  ' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('mesa'));
    fireEvent.change(screen.getByPlaceholderText('Buscar produto...'), { target: { value: '' } });
    await act(async () => { lookup.resolve([{ id: 'old', name: 'Resultado antigo', slug: 'old' }]); });
    expect(screen.queryByText('Resultado antigo')).toBeNull();
  });
});
