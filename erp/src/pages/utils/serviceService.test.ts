import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), current: { service_data: {} } as any, lookupError: null as any, reply: {} as any, insert: vi.fn(), update: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from, auth: { getUser: mocks.getUser } } }));
import { moveToTrash, saveService, updateService } from './serviceService';
const service = { description: ' Existing ', unitPrice: 50, costPrice: 20, active: true };
beforeEach(() => {
  vi.clearAllMocks(); mocks.current = { service_data: { ...service, id: 'wrong-json-id', retainedMetadata: { source: 'original' } }, is_draft: false }; mocks.lookupError = null;
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null });
  mocks.reply = { data: { id: 'service-1', service_data: { ...service }, is_draft: false }, error: null };
  mocks.from.mockImplementation(() => {
    let writing = false;
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), insert: vi.fn((payload) => { mocks.insert(payload); writing = true; return query; }), update: vi.fn((payload) => { mocks.update(payload); writing = true; return query; }), single: vi.fn(async () => writing ? mocks.reply : { data: mocks.current, error: mocks.lookupError }) };
    return query;
  });
});
afterEach(() => vi.restoreAllMocks());
describe('real service persistence boundary', () => {
  it('blocks invalid finalization and negative patches before transport', async () => {
    await expect(saveService({ ...service, description: '' })).rejects.toThrow();
    await expect(updateService('service-1', { unitPrice: -1 })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('preserves incomplete drafts and parses finalized description', async () => {
    await saveService({ ...service, description: '', isDraft: true });
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ is_draft: true, service_data: { description: '' } });
    await saveService(service);
    expect(mocks.insert.mock.calls[1][0][0].service_data.description).toBe('Existing');
  });
  it('stops before update if the current snapshot lookup failed', async () => {
    mocks.lookupError = { code: '42501' };
    await expect(updateService('service-1', { description: 'New' })).rejects.toEqual({ code: '42501' });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('preserves snapshot metadata, price and cost on a partial trash update', async () => {
    await moveToTrash('service-1');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ service_data: { description: 'Existing', unitPrice: 50, costPrice: 20, active: false, deleted: true, retainedMetadata: { source: 'original' }, fiscalTreatment: { nfeComposition: 'not_reviewed', incorporationConfirmed: false, validationReference: '' } } }));
  });
  it('keeps an incomplete draft incomplete on a partial lifecycle update', async () => {
    mocks.current = { service_data: { description: '', retainedMetadata: { source: 'original' } }, is_draft: true };
    await updateService('service-1', { active: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ service_data: { description: '', active: false, retainedMetadata: { source: 'original' } } }));
  });
  it('uses the row identity instead of an old id inside the JSON snapshot', async () => {
    mocks.reply.data.service_data.id = 'wrong-json-id';
    await expect(saveService(service)).resolves.toMatchObject({ id: 'service-1' });
  });
  it('requires an acknowledgment for the same updated service', async () => {
    mocks.reply.data.id = 'other-service';
    await expect(updateService('service-1', { description: 'New' })).rejects.toEqual({ uncertain: true });
  });
  it('records who and when confirmed a validated fiscal composition', async () => {
    await saveService({
      ...service,
      fiscalTreatment: {
        nfeComposition: 'include_with_merchandise',
        incorporationConfirmed: true,
        validationReference: 'Parecer fiscal interno 2026-10',
      },
    });
    const stored = mocks.insert.mock.calls[0][0][0].service_data.fiscalTreatment;
    expect(stored).toMatchObject({
      nfeComposition: 'include_with_merchandise',
      incorporationConfirmed: true,
      validationReference: 'Parecer fiscal interno 2026-10',
      validatedBy: 'operator-1',
    });
    expect(Date.parse(stored.validatedAt)).not.toBeNaN();
  });
  it('preserves fiscal validation when only the commercial price changes', async () => {
    const treatment = {
      nfeComposition: 'include_with_merchandise',
      incorporationConfirmed: true,
      validationReference: 'Parecer fiscal interno 2026-09',
      validatedAt: '2026-09-20T12:00:00.000Z',
      validatedBy: 'operator-1',
    } as const;
    mocks.current = {
      service_data: { ...service, fiscalTreatment: treatment },
      is_draft: false,
    };
    mocks.reply = {
      data: { id: 'service-1', service_data: { ...service, unitPrice: 75, fiscalTreatment: treatment }, is_draft: false },
      error: null,
    };

    await updateService('service-1', { unitPrice: 75, fiscalTreatment: treatment });

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      service_data: expect.objectContaining({ unitPrice: 75, fiscalTreatment: treatment }),
    }));
  });
  it('marks malformed provider responses as uncertain', async () => {
    mocks.reply = { data: null, error: { code: '', message: 'SyntaxError: Unexpected end of JSON input' } };
    await expect(saveService(service)).rejects.toEqual({ uncertain: true });
  });
});
