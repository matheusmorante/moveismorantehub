import { beforeEach, expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';
import { deleteImageTemplate, readImageTemplate, renameImageTemplate, saveImageTemplate } from './imageTemplateService';

const mocks = vi.hoisted(() => ({ from: vi.fn(), context: null as { runId: string; ownerId: string; scenarioKey: string } | null }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('../../../../../../shared-utils/testArtifactContext', () => ({ getTestArtifactContext: () => mocks.context }));

const original = { id: '00000000-0000-4000-8000-000000000001', name: 'Oferta', description: '',
  created_at: '2026-11-06T10:00:00Z', updated_at: '2026-11-06T10:00:00Z' };
const values = () => ({ name: 'Oferta', description: '', design: startImageTemplate('blank') });

function query(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const builder: Record<string, any> = { then: result.then.bind(result) };
  for (const method of ['insert', 'update', 'delete', 'upsert', 'select', 'eq', 'maybeSingle', 'abortSignal']) {
    builder[method] = vi.fn(() => builder);
  }
  return builder;
}

beforeEach(() => { mocks.from.mockReset(); mocks.context = null; });

it('valida o desenho antes de enviar imagens ou salvar o modelo', async () => {
  await expect(saveImageTemplate(original.id, { ...values(), name: '' }, null, new Map())).rejects.toThrow();
  expect(mocks.from).not.toHaveBeenCalled();
});

it('envia apenas imagens usadas e confere a versão ao atualizar um modelo', async () => {
  const asset = { id: 'a'.repeat(64), webp_base64: 'conteudo' };
  const unused = { id: 'b'.repeat(64), webp_base64: 'descartado' };
  const input = values();
  input.design.formats['1:1'].layers.unshift({ ...createImageLayer('image', '1:1'), assetId: asset.id } as never);
  const assets = query(null);
  const model = query({ ...original, updated_at: '2026-11-06T11:00:00Z' });
  mocks.from.mockImplementation((table: string) => table === 'catalog_image_template_assets' ? assets : model);
  const result = await saveImageTemplate(original.id, input, original, new Map([[asset.id, asset], [unused.id, unused]]));
  expect(assets.upsert).toHaveBeenCalledWith([asset], { onConflict: 'id', ignoreDuplicates: true });
  expect(model.eq.mock.calls).toEqual([['id', original.id], ['updated_at', original.updated_at]]);
  expect(result.updated_at).toBe('2026-11-06T11:00:00Z');
});

it('não anuncia sucesso quando a versão do modelo ficou desatualizada', async () => {
  mocks.from.mockReturnValue(query(null));
  await expect(saveImageTemplate(original.id, values(), original, new Map())).rejects.toThrow('alterado ou removido');
});

it('envia os filtros de execução e proprietário junto da versão nas três mutações de uma fixture', async () => {
  mocks.context = { runId: '00000000-0000-4000-8000-000000000011', ownerId: '00000000-0000-4000-8000-000000000012',
    scenarioKey: 'image_template_crud' };
  const metadata = { is_test: true as const, ...mocks.context, scenarioKey: 'image_template_crud' as const };
  const source = { ...original, test_artifact: metadata };
  const builder = query(source);
  mocks.from.mockReturnValue(builder);
  const input = values();
  input.design.testArtifact = metadata;
  await saveImageTemplate(source.id, input, source, new Map());
  await renameImageTemplate(source, { name: 'Renomeado', description: '' });
  await deleteImageTemplate(source);
  expect(builder.eq.mock.calls).toEqual(Array.from({ length: 3 }, () => [
    ['id', source.id], ['updated_at', source.updated_at], ['design->testArtifact->>runId', metadata.runId],
    ['design->testArtifact->>ownerId', metadata.ownerId], ['design->testArtifact->>scenarioKey', metadata.scenarioKey],
  ]).flat());
});

it('interrompe o salvamento se o envio de uma imagem falhar', async () => {
  const input = values();
  const asset = { id: 'a'.repeat(64), webp_base64: 'conteudo' };
  input.design.formats['1:1'].layers.unshift({ ...createImageLayer('image', '1:1'), assetId: asset.id } as never);
  mocks.from.mockReturnValue(query(null, new Error('Envio recusado')));
  await expect(saveImageTemplate(original.id, input, null, new Map([[asset.id, asset]]))).rejects.toThrow('Envio recusado');
  expect(mocks.from.mock.calls).toEqual([['catalog_image_template_assets']]);
});

it('confere a versão ao renomear e ao excluir, sem remover um registro mais recente', async () => {
  const rename = query({ id: original.id });
  const remove = query(null);
  mocks.from.mockReturnValueOnce(rename).mockReturnValueOnce(remove);
  await renameImageTemplate(original, { name: '  Novo nome  ', description: '' });
  expect(rename.update).toHaveBeenCalledWith({ name: 'Novo nome', description: '' });
  await expect(deleteImageTemplate(original)).rejects.toThrow('alterado ou removido');
  expect(remove.eq.mock.calls).toEqual([['id', original.id], ['updated_at', original.updated_at]]);
});

it('recusa modelo salvo com conteúdo incompatível antes de abrir o editor', async () => {
  mocks.from.mockReturnValue(query({ ...original, design: { version: 99 } }));
  await expect(readImageTemplate(original.id, new AbortController().signal)).rejects.toThrow('conteúdo deste modelo é inválido');
});
