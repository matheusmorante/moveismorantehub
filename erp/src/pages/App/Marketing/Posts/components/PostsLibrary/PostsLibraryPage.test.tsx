// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), upload: vi.fn(), ratio: vi.fn(), search: vi.fn(), names: vi.fn(), error: vi.fn(), success: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('../../services/productPostsService', () => ({ productPostsService: { listPosts: mocks.list, deletePost: mocks.remove, uploadPost: mocks.upload, validateImageRatio: mocks.ratio } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => { const query = { select: () => query, ilike: (_key: string, value: string) => { mocks.search(value); return query; }, eq: () => query, in: mocks.names, limit: async () => ({ data: [], error: null }) }; return query; } } }));
import { PostsLibraryPage } from './PostsLibraryPage';
const post = { id: 'post', productId: 'product', format: 'FEED_4_5', campaignId: null, imageStoragePath: 'product/post/image.png', imageUrl: 'https://images.example/post.png', createdAt: '2026-10-16T12:00:00Z', title: 'Arte da mesa' };
const deferred = () => { let resolve!: (value: any) => void; let reject!: (error: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
beforeEach(() => { vi.resetAllMocks(); mocks.user = { id: 'operator' }; mocks.list.mockResolvedValue([post]); mocks.remove.mockResolvedValue(undefined); mocks.ratio.mockResolvedValue({ valid: true, format: 'FEED_4_5' }); mocks.upload.mockImplementation(async (values) => ({ ...post, id: values.postId, productId: values.productId, campaignId: values.campaignId })); mocks.names.mockResolvedValue({ data: [{ id: 'product', name: 'Mesa' }], error: null }); vi.stubGlobal('confirm', vi.fn(() => true)); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const loaded = () => screen.findByAltText('Arte da mesa');
const remove = () => fireEvent.click(screen.getByRole('button', { name: '🗑' }));

describe('post library page owner', () => {
  it('composes the actual upload modal with a pending page refresh before closing', async () => {
    const refresh = deferred(); mocks.list.mockResolvedValueOnce([]).mockReturnValueOnce(refresh.promise);
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));
    render(<PostsLibraryPage campaigns={[]} initialProductId="product" initialProductName="Mesa" />);
    await screen.findByText('Nenhuma arte encontrada'); fireEvent.click(screen.getByRole('button', { name: '+ Adicionar post' }));
    await act(async () => { fireEvent.change(screen.getByLabelText('Arquivo da arte'), { target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar à Biblioteca' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Adicionar post à Biblioteca')).toBeTruthy();
    await act(async () => { refresh.resolve([post]); });
    await waitFor(() => expect(screen.queryByText('Adicionar post à Biblioteca')).toBeNull());
    expect(mocks.upload).toHaveBeenCalledOnce(); expect(screen.getByAltText('Arte da mesa')).toBeTruthy();
  });
  it('queries parsed filters through the resolver and renders the canonical image field', async () => {
    render(<PostsLibraryPage campaigns={[]} />); await loaded();
    expect(screen.getByAltText('Arte da mesa').getAttribute('src')).toBe(post.imageUrl);
    fireEvent.change(screen.getByLabelText('Filtrar formato'), { target: { value: 'STORY_STATUS_9_16' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ productId: undefined, campaignId: undefined, format: 'STORY_STATUS_9_16' }));
  });
  it('does not let a stale list response replace a newer filter', async () => {
    const pending = deferred(); mocks.list.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([]);
    render(<PostsLibraryPage campaigns={[]} />); await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByLabelText('Filtrar formato'), { target: { value: 'STORY_STATUS_9_16' } });
    await act(async () => { pending.resolve([post]); });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2)); expect(screen.queryByAltText('Arte da mesa')).toBeNull();
  });
  it('awaits deletion and prevents double-clicks before the service receipt', async () => {
    const pending = deferred(); mocks.remove.mockReturnValue(pending.promise);
    render(<PostsLibraryPage campaigns={[]} />); await loaded();
    act(() => { remove(); remove(); });
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce()); expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/exclusão/);
    mocks.list.mockResolvedValue([]); await act(async () => { pending.resolve(undefined); });
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); expect(screen.queryByAltText('Arte da mesa')).toBeNull();
  });
  it('shows partial deletion and offers cleanup without deleting the record twice', async () => {
    mocks.remove.mockRejectedValueOnce(Object.assign(new Error('Registro removido; limpeza pendente.'), { recordDeleted: true }));
    render(<PostsLibraryPage campaigns={[]} />); await loaded(); remove();
    await screen.findByRole('alert'); expect(screen.queryByAltText('Arte da mesa')).toBeNull();
    mocks.list.mockResolvedValue([]); fireEvent.click(screen.getByRole('button', { name: 'Tentar limpar arquivo pendente' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(2));
    expect(mocks.remove.mock.calls[1][1]).toMatchObject({ recordAlreadyDeleted: true });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tentar limpar arquivo pendente' })).toBeNull());
  });
  it('blocks an uncertain record deletion without claiming success or removing the file', async () => {
    mocks.remove.mockRejectedValueOnce(Object.assign(new Error('Exclusão incerta'), { uncertain: true }));
    render(<PostsLibraryPage campaigns={[]} />); await loaded(); remove(); await screen.findByRole('alert');
    remove(); await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce()); expect(mocks.success).not.toHaveBeenCalled(); expect(screen.getByAltText('Arte da mesa')).toBeTruthy();
  });
  it('rejects a path belonging to another record before confirmation or service', async () => {
    mocks.list.mockResolvedValue([{ ...post, imageStoragePath: 'product/other/image.png' }]);
    render(<PostsLibraryPage campaigns={[]} />); await loaded(); remove(); await screen.findByRole('alert');
    expect(mocks.remove).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
  });
  it('bounds list loading, shows failure and allows explicit reload', async () => {
    vi.useFakeTimers(); mocks.list.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce([]);
    render(<PostsLibraryPage campaigns={[]} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmada/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar atualizar biblioteca' })); });
    expect(mocks.list).toHaveBeenCalledTimes(2); expect(screen.queryByRole('status')).toBeNull();
  });
  it('reloads for a new operator and ignores the old query', async () => {
    const pending = deferred(); mocks.list.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([]);
    const view = render(<PostsLibraryPage campaigns={[]} />); await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce());
    mocks.user = { id: 'other' }; view.rerender(<PostsLibraryPage campaigns={[]} />);
    await act(async () => { pending.resolve([post]); }); await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByAltText('Arte da mesa')).toBeNull();
  });
  it('validates an export URL before clicking a browser download', async () => {
    mocks.list.mockResolvedValue([{ ...post, imageUrl: 'http://images.example/post.png' }]);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<PostsLibraryPage campaigns={[]} />); await loaded();
    fireEvent.click(screen.getByRole('button', { name: '⬇ Baixar' }));
    await screen.findByRole('alert'); expect(click).not.toHaveBeenCalled();
  });
});
