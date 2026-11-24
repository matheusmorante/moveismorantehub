import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSiteElementModel, fetchSiteElementModels, saveSiteElementModel, setSiteElementActivation, type SiteElementModel } from './siteElementService';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  from: mocks.from,
  rpc: mocks.rpc,
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
const original: SiteElementModel = {
  id: '33bb9fd7-d91a-4291-80ac-4bad09910179', kind: 'carousel', name: 'Modelo',
  image_path: 'site-elements/carousel/33bb9fd7-d91a-4291-80ac-4bad09910179/11111111-1111-4111-8111-111111111111.png',
  file_name: 'old.png', mime_type: 'image/png', size_bytes: 5, width: 1920, height: 620,
  updated_at: '2026-11-06T20:00:00Z', active: true,
};
const emptyVariant = { file: null, existingImagePath: null, width: 0, height: 0 };
const values = (file: File | null = null) => ({ name: '  Novo nome  ', kind: 'carousel' as const, file,
  existingImagePath: original.image_path, width: 1920, height: 620, mobile: emptyVariant, tablet: emptyVariant });
const newFile = () => new File(['image'], 'new.png', { type: 'image/png' });
const responsive: SiteElementModel = {
  ...original, height: 600,
  tablet_image_path: 'site-elements/carousel/tablet.png', mobile_image_path: 'site-elements/carousel/mobile.png',
};
const editImages = () => ({
  ...values(newFile()), height: 600,
  tablet: { file: null, existingImagePath: responsive.tablet_image_path!, width: 1200, height: 600 },
  mobile: { file: null, existingImagePath: responsive.mobile_image_path!, width: 800, height: 800 },
});
const createImages = () => ({
  ...editImages(), existingImagePath: null,
  tablet: { file: newFile(), existingImagePath: null, width: 1200, height: 600 },
  mobile: { file: newFile(), existingImagePath: null, width: 800, height: 800 },
});
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
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining(',active'), { count: 'exact' });
    expect(chain.abortSignal).toHaveBeenCalledWith(signal);
  });
  it('updates only the activation of the expected carousel revision and returns its new version', async () => {
    const updated = { id: original.id, kind: 'carousel' as const, active: false, updated_at: '2026-11-06T20:01:00.123456+00:00' };
    const chain = query({ data: updated, error: null });
    await expect(setSiteElementActivation({ ...updated, updated_at: original.updated_at })).resolves.toEqual(updated);
    expect(mocks.from).toHaveBeenCalledWith('site_element_models');
    expect(chain.update).toHaveBeenCalledOnce();
    expect(chain.update).toHaveBeenCalledWith({ active: false });
    expect(chain.eq.mock.calls).toEqual([['id', original.id], ['kind', 'carousel'], ['updated_at', original.updated_at]]);
    expect(chain.select).toHaveBeenCalledWith('id,active,updated_at');
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rejects invalid activation values before the request and reports a stale revision', async () => {
    const values = { id: original.id, kind: 'carousel' as const, active: false, updated_at: original.updated_at };
    await expect(setSiteElementActivation({ ...values, updated_at: '' })).rejects.toThrow(/Atualize a lista/);
    expect(mocks.from).not.toHaveBeenCalled();
    query({ data: null, error: null });
    await expect(setSiteElementActivation(values)).rejects.toThrow(/outro usuário/);
  });
  it('asks the server to switch the announcement in a single versioned operation', async () => {
    const revision = { id: original.id, active: true, updated_at: '2026-11-24T18:01:00Z' };
    mocks.rpc.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: revision, error: null }) });
    await expect(setSiteElementActivation({ ...revision, kind: 'top_bar', updated_at: original.updated_at }))
      .resolves.toEqual({ ...revision, kind: 'top_bar' });
    expect(mocks.rpc.mock.calls).toEqual([['set_site_element_announcement_activation', {
      p_id: original.id, p_active: true, p_expected_updated_at: original.updated_at,
    }]]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('creates an inactive announcement without changing the active one', async () => {
    const chain = query({ data: { id: original.id, active: false }, error: null });
    await saveSiteElementModel({
      kind: 'top_bar', message: 'Aviso programado', backgroundColor: '#173D30', textColor: '#FFFFFF',
      fontWeight: '400', fontSizePx: '14', startsAt: '', endsAt: '',
    });
    expect(mocks.from.mock.calls).toEqual([['site_element_announcement_bars']]);
    expect(chain.insert.mock.calls).toEqual([[expect.objectContaining({
      message: 'Aviso programado', active: false, starts_at: null, ends_at: null,
    })]]);
    expect(chain.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('renames without reupload and preserves the image while guarding concurrent edits', async () => {
    const chain = query({ data: { ...original, name: 'Novo nome' }, error: null });
    await saveSiteElementModel(values(), original);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo nome', image_path: original.image_path }));
    expect(chain.eq).toHaveBeenCalledWith('updated_at', original.updated_at);
  });
  it('stores the carousel link and clears it when the operator empties the field', async () => {
    const link = '/?type=salvados#produtos';
    const chain = query({ data: original, error: null });
    await saveSiteElementModel({ ...values(), linkUrl: link }, original);
    expect(chain.update).toHaveBeenLastCalledWith(expect.objectContaining({ link_url: link }));
    await saveSiteElementModel({ ...values(), linkUrl: '' }, original);
    expect(chain.update).toHaveBeenLastCalledWith(expect.objectContaining({ link_url: null }));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('uploads all three versions before inserting a new carousel model', async () => {
    const chain = query({ data: { ...responsive, name: 'Novo nome' }, error: null });
    await saveSiteElementModel(createImages());
    expect(mocks.upload).toHaveBeenCalledTimes(3);
    const [desktopPath, tabletPath, mobilePath] = mocks.upload.mock.calls.map(([path]) => path);
    expect(new Set([desktopPath, tabletPath, mobilePath]).size).toBe(3);
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Novo nome', kind: 'carousel', image_path: desktopPath, height: 600,
      tablet_image_path: tabletPath, tablet_width: 1200, tablet_height: 600,
      mobile_image_path: mobilePath, mobile_width: 800, mobile_height: 800,
    }));
  });
  it('removes the staged desktop file when the tablet upload fails before the insert', async () => {
    const chain = query({ data: null, error: null });
    mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'Falha no tablet' } });
    await expect(saveSiteElementModel(createImages())).rejects.toMatchObject({ message: 'Falha no tablet' });
    expect(chain.insert).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });
  it('keeps the old image if upload fails and removes only the staged file after a confirmed DB rejection', async () => {
    const chain = query({ data: null, error: { code: '42501', message: 'Sem permissão' } });
    mocks.upload.mockResolvedValueOnce({ error: { message: 'Falha no upload' } });
    await expect(saveSiteElementModel(editImages(), responsive)).rejects.toMatchObject({ message: 'Falha no upload' });
    expect(chain.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await expect(saveSiteElementModel(editImages(), responsive)).rejects.toMatchObject({ message: 'Sem permissão' });
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.calls[0][0]).not.toContain(original.image_path);
  });
  it('does not remove any image after an uncertain database reply', async () => {
    query({ data: null, error: { code: '', message: 'Failed to fetch' } });
    await expect(saveSiteElementModel(editImages(), responsive)).rejects.toMatchObject({ message: 'Failed to fetch' });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('only removes the old file after confirmed replacement, and reports failed cleanup', async () => {
    const chain = query({ data: responsive, error: null });
    mocks.remove.mockResolvedValue({ error: { message: 'Falha ao remover arquivo' } });
    expect((await saveSiteElementModel(editImages(), responsive)).cleanupFailed).toBe(true);
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('tablet_image_path');
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('mobile_image_path');
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
  it('deletes the three confirmed file paths after the row and rejects invalid data before upload', async () => {
    query({ data: responsive, error: null });
    expect(await deleteSiteElementModel(responsive)).toEqual({ cleanupFailed: false });
    expect(mocks.remove).toHaveBeenCalledWith([responsive.image_path, responsive.mobile_image_path, responsive.tablet_image_path]);
    await expect(saveSiteElementModel({ ...values(newFile()), name: ' ' }, original)).rejects.toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
