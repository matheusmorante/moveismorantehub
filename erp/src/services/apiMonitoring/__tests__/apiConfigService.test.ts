// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), reply: {} as any, read: [] as any[] }));
vi.mock('../../../pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
let ApiConfigService: typeof import('../apiConfigService').ApiConfigService;
let defaults: typeof import('../apiConfigService').DEFAULT_API_CONFIGURATIONS;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear();
  const module = await import('../apiConfigService');
  ApiConfigService = module.ApiConfigService; defaults = module.DEFAULT_API_CONFIGURATIONS;
  mocks.read = []; mocks.reply = { data: { service_id: 'google_routes' }, error: null, status: 200 };
  mocks.from.mockImplementation(() => {
    const query: any = { upsert: vi.fn((payload) => { mocks.upsert(payload); return query; }), select: vi.fn(() => query), single: vi.fn(async () => mocks.reply), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mocks.read, error: null }).then(resolve) };
    return query;
  });
});
describe('real API configuration persistence and cache', () => {
  it('validates every installed default including the five-request image service', async () => {
    const { apiConfigurationWriteSchema } = await import('../../../../../shared-utils/apiConfigFormSchema');
    for (const config of Object.values(defaults)) expect(apiConfigurationWriteSchema.safeParse(config).success, config.service_id).toBe(true);
  });
  it('blocks invalid input before a table request', async () => {
    await expect(ApiConfigService.saveConfiguration({ ...defaults.google_routes, monthly_limit: -1 })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('publishes the parsed zero-limit configuration only after persistence', async () => {
    const input = { ...defaults.google_routes, monthly_limit: 0, enabled: false, price_per_unit: 0, service_name: ' Routes ' };
    await expect(ApiConfigService.saveConfiguration(input)).resolves.toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ monthly_limit: 0, enabled: false, price_per_unit: 0, service_name: 'Routes' }));
    expect(await ApiConfigService.getConfiguration('google_routes')).toMatchObject({ monthly_limit: 0, enabled: false });
    expect(JSON.parse(localStorage.getItem('morante_api_configurations_v1')!).google_routes.monthly_limit).toBe(0);
  });
  it('does not publish a rejected config to either cache or claim success', async () => {
    await ApiConfigService.getAllConfigurations();
    const stored = localStorage.getItem('morante_api_configurations_v1');
    mocks.reply = { data: null, error: { code: '42501', message: 'Denied' }, status: 403 };
    await expect(ApiConfigService.saveConfiguration({ ...defaults.google_routes, monthly_limit: 7 })).rejects.toMatchObject({ code: '42501' });
    expect((await ApiConfigService.getConfiguration('google_routes')).monthly_limit).toBe(defaults.google_routes.monthly_limit);
    expect(localStorage.getItem('morante_api_configurations_v1')).toBe(stored);
  });
  it('does not replace an explicit zero monthly limit on reload', async () => {
    mocks.read = [{ ...defaults.google_routes, monthly_limit: 0 }];
    expect((await ApiConfigService.getConfiguration('google_routes')).monthly_limit).toBe(0);
  });
  it('preserves other stored API settings when saving before the first read', async () => {
    const other = { ...defaults.meta_whatsapp, enabled: false, monthly_limit: 9 };
    localStorage.setItem('morante_api_configurations_v1', JSON.stringify({ meta_whatsapp: other }));
    await ApiConfigService.saveConfiguration(defaults.google_routes);
    expect(await ApiConfigService.getConfiguration('meta_whatsapp')).toEqual(other);
    expect(JSON.parse(localStorage.getItem('morante_api_configurations_v1')!).meta_whatsapp).toEqual(other);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    { data: null, error: { code: '', message: 'Unexpected end of JSON input' }, status: 0 },
    { data: { service_id: 'different-api' }, error: null, status: 200 },
    { data: null, error: { code: 'PGRST116' }, status: 406 },
  ])('requires the same persisted API identity and a valid acknowledgment', async (reply) => {
    mocks.reply = reply;
    await expect(ApiConfigService.saveConfiguration(defaults.google_routes)).rejects.toEqual({ uncertain: true });
    expect(localStorage.getItem('morante_api_configurations_v1')).toBeNull();
  });
});
