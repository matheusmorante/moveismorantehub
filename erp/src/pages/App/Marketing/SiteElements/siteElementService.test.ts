import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSiteElementModel, fetchSiteElementModels, saveSiteElementModel, type SiteElementModel } from './siteElementService';

const mocks = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  from: mocks.from,
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
const original: SiteElementModel = {
  id: '33bb9fd7-d91a-4291-80ac-4bad09910179', kind: 'carousel', name: 'Modelo',
  image_path: 'site-elements/carousel/33bb9fd7-d91a-4291-80ac-4bad09910179/11111111-1111-4111-8111-111111111111.png',
  file_name: 'old.png', mime_type: 'image/png', size_bytes: 5, width: 1920, height: 620,
  updated_at: '2026-11-06T20:00:00Z',
};
const values = (file: File | null = null) => ({ name: '  Novo nome  ', kind: 'carousel' as const, file,
  existingImagePath: original.image_path, width: 1920, height: 620 });
const newFile = () => new File(['image'], 'new.png', { type: 'image/png' });
function query(result: unknown) {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), abortSignal: vi.fn(), update: vi.fn(), insert: vi.fn(), delete: vi.fn(), maybeSingle: vi.fn() };
  for (const key of ['select', 'eq', 'order', 'range', 'abortSignal', 'update', 'insert', 'delete'] as const) chain[key].mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(result);
  Object.assign(chain, { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) });
  mocks.from.mockReturnValue(chain);
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ data: {}, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
});

describe('site element service', () => {
  it('filters and orders on the server before fetching a fixed page of 15 and cancels obsolete requests', async () => {
    const chain = query({ data: [original], count: 16, error: null });
    const signal = new AbortController().signal;
    expect(await fetchSiteElementModels('carousel', 2, signal)).toEqual({ rows: [original], count: 16 });
    expect(chain.eq).toHaveBeenCalledWith('kind', 'carousel');
    expect(chain.range).toHaveBeenCalledWith(15, 29);
    expect(chain.select).toHaveBeenCalledWith(expect.not.stringContaining('*'), { count: 'exact' });
    expect(chain.abortSignal).toHaveBeenCalledWith(signal);
  });
  it('renames without reupload and preserves the image while guarding concurrent edits', async () => {
    const chain = query({ data: { ...original, name: 'Novo nome' }, error: null });
    await saveSiteElementModel(values(), original);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo nome', image_path: original.image_path }));
    expect(chain.eq).toHaveBeenCalledWith('updated_at', original.updated_at);
  });
  it('uploads before insert and preserves an empty library until the operator creates a model', async () => {
    const chain = query({ data: { ...original, name: 'Novo nome' }, error: null });
    await saveSiteElementModel({ ...values(newFile()), existingImagePath: null });
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo nome', kind: 'carousel', file_name: 'new.png' }));
  });
  it('keeps the old image if upload fails and removes only the staged file after a confirmed DB rejection', async () => {
    const chain = query({ data: null, error: { code: '42501', message: 'Sem permissão' } });
    mocks.upload.mockResolvedValueOnce({ error: { message: 'Falha no upload' } });
    await expect(saveSiteElementModel(values(newFile()), original)).rejects.toMatchObject({ message: 'Falha no upload' });
    expect(chain.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await expect(saveSiteElementModel(values(newFile()), original)).rejects.toMatchObject({ message: 'Sem permissão' });
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.calls[0][0]).not.toContain(original.image_path);
  });
  it('does not remove any image after an uncertain database reply', async () => {
    query({ data: null, error: { code: '', message: 'Failed to fetch' } });
    await expect(saveSiteElementModel(values(newFile()), original)).rejects.toMatchObject({ message: 'Failed to fetch' });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('only removes the old file after confirmed replacement, and reports failed cleanup', async () => {
    query({ data: original, error: null });
    mocks.remove.mockResolvedValue({ error: { message: 'Falha ao remover arquivo' } });
    expect((await saveSiteElementModel(values(newFile()), original)).cleanupFailed).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith([original.image_path]);
  });
  it('does not delete storage if the record was refused or concurrently changed', async () => {
    query({ data: null, error: null });
    await expect(deleteSiteElementModel(original)).rejects.toThrow(/outro usuário/);
    expect(mocks.remove).not.toHaveBeenCalled();
    query({ data: null, error: { message: 'Sem permissão' } });
    await expect(deleteSiteElementModel(original)).rejects.toMatchObject({ message: 'Sem permissão' });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('deletes the confirmed file path after the row and rejects invalid data before upload', async () => {
    query({ data: { id: original.id, image_path: original.image_path }, error: null });
    expect(await deleteSiteElementModel(original)).toEqual({ cleanupFailed: false });
    expect(mocks.remove).toHaveBeenCalledWith([original.image_path]);
    await expect(saveSiteElementModel({ ...values(newFile()), name: ' ' }, original)).rejects.toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
