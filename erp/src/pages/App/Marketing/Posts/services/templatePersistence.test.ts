import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rows: [] as any[], error: null as any }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => ({
  select: () => ({ order: async () => ({ data: mock.rows, error: mock.error }) }),
  upsert: async () => ({ error: mock.error })
}) } }));
import { templateService } from './templateService';
import { compositionTemplate } from './compositionDefaults';
import { campaignService } from './campaignService';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) });
  mock.rows = []; mock.error = null;
});
it('preserva modelos locais quando servidor volta a responder', async () => {
  mock.error = { message: 'offline' };
  const saved = await templateService.save({ ...compositionTemplate, id: 'local-example', isDefault: false });
  expect(saved.persistedRemotely).toBe(false);
  mock.error = null; mock.rows = [{ id: 'remote-example', name: 'Remoto', layers_json: [], updated_at: '2026-01-01' }];
  expect((await templateService.getAll()).map(t => t.id)).toEqual(expect.arrayContaining(['local-example', 'remote-example']));
});
it('usa o registro mais recente sem perder dados do template', async () => {
  await templateService.save({ ...compositionTemplate, id: 'same', name: 'Novo local', isDefault: false });
  mock.rows = [{ id: 'same', name: 'Antigo remoto', layers_json: [], updated_at: '2020-01-01' }];
  expect((await templateService.getAll()).find(t => t.id === 'same')?.name).toBe('Novo local');
});
it('mantém dois layouts no mesmo template sem duplicar o registro', async () => {
  const layouts = {
    '4:5': { aspectRatio: '4:5' as const, targetWidth: 1080, targetHeight: 1350, layers: compositionTemplate.layers },
    '9:16': { aspectRatio: '9:16' as const, targetWidth: 1080, targetHeight: 1920,
      layers: compositionTemplate.layers.map(layer => ({ ...layer, preferredRegion: layer.role === 'main' ? 'CENTER' : layer.preferredRegion })) }
  };
  const saved = await templateService.save({ ...compositionTemplate, id: 'responsive', isDefault: false, layouts });
  const restored = (await templateService.getAll()).find(item => item.id === saved.id);
  expect(restored?.layouts?.['4:5']?.layers).toHaveLength(compositionTemplate.layers.length);
  expect(restored?.layouts?.['9:16']?.targetHeight).toBe(1920);
  expect(restored?.layouts?.['9:16']?.layers.find(layer => layer.role === 'main')?.preferredRegion).toBe('CENTER');
});
it('mantém a campanha local disponível ao voltar a conexão', async () => {
  mock.error = { message: 'offline' };
  const campaign = await campaignService.save({ id: 'local-campaign', name: 'Dia dos Pais', slug: 'pais', active: true });
  expect(campaign.persistedRemotely).toBe(false);
  mock.error = null; mock.rows = [{ id: 'remote-campaign', name: 'Natal', updated_at: '2026-01-01' }];
  expect((await campaignService.getAll()).some(item => item.id === campaign.id)).toBe(true);
});
