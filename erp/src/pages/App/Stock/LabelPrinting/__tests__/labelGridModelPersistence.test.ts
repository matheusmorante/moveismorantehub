// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findIdenticalGridModel,
  isIdenticalGridModel,
  saveGridModelWithFallback,
} from '../services/labelGridModelPersistence';
import { insertRemoteLabelLayout, updateRemoteLabelLayout } from '../services/labelLayoutService';
import { saveCustomLabelLayouts } from '../services/labelStorageService';
import type { GridModel } from '../types/LabelGridModelTypes';

vi.mock('../services/labelLayoutService', () => ({
  insertRemoteLabelLayout: vi.fn(),
  updateRemoteLabelLayout: vi.fn(),
}));

vi.mock('../services/labelStorageService', () => ({
  saveCustomLabelLayouts: vi.fn(),
}));

describe('labelGridModelPersistence', () => {
  const baseModel: GridModel = {
    id: 'test_model_1',
    name: 'Modelo Teste',
    columns: 2,
    rows: 5,
    marginT: 10,
    marginB: 10,
    marginL: 5,
    marginR: 5,
    gapH: 2,
    gapV: 2,
    icon: 'bi-square',
    paperSize: 'A4',
    type: 'rect',
    category: 'identificacao',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveCustomLabelLayouts).mockReturnValue(true);
  });

  describe('isIdenticalGridModel', () => {
    it('retorna true quando todos os campos geométricos são iguais', () => {
      const duplicate = { ...baseModel, id: 'outro_id', name: 'Outro Nome' };
      expect(isIdenticalGridModel(baseModel, duplicate)).toBe(true);
    });

    it('retorna false quando qualquer campo geométrico difere', () => {
      const modified = { ...baseModel, columns: 3 };
      expect(isIdenticalGridModel(baseModel, modified)).toBe(false);
    });

    it('não confunde design, metadata ou dimensão personalizada diferentes com duplicados', () => {
      const first = { ...baseModel, paperSize: 'Custom', paperWidth: 100.5, paperHeight: 200, artConfig: { globalSnapshot: { title: 'A', metadata: { a: 0, b: false } } } };
      expect(isIdenticalGridModel(first, { ...first, paperWidth: 101 })).toBe(false);
      expect(isIdenticalGridModel(first, { ...first, artConfig: { globalSnapshot: { title: 'B' } } })).toBe(false);
      expect(isIdenticalGridModel(first, { ...first, nameFontSize: 0 })).toBe(false);
      expect(isIdenticalGridModel(first, { ...first, id: 'other', name: 'Other', artConfig: { globalSnapshot: { metadata: { b: false, a: 0 }, title: 'A' } } })).toBe(true);
    });
  });

  describe('findIdenticalGridModel', () => {
    it('encontra modelo idêntico quando dimensões coincidem e não é o mesmo targetId', () => {
      const list = [baseModel];
      const newModel = { ...baseModel, id: 'new_temp', name: 'Tentativa Duplicada' };

      const found = findIdenticalGridModel(list, newModel, 'diferente_id', 'outro_editing');
      expect(found).toBeDefined();
      expect(found?.id).toBe(baseModel.id);
    });

    it('ignora o próprio modelo quando targetId ou editingModelId coincidem', () => {
      const list = [baseModel];
      const newModel = { ...baseModel };

      const found = findIdenticalGridModel(list, newModel, baseModel.id, baseModel.id);
      expect(found).toBeUndefined();
    });
  });

  describe('saveGridModelWithFallback', () => {
    it('insere no banco remoto com sucesso para novos modelos customizados', async () => {
      const remoteSaved = { ...baseModel, id: 'db_id_100' };
      vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({
        data: remoteSaved,
        error: null,
      });

      const result = await saveGridModelWithFallback({
        newModel: baseModel,
        editingGridModel: null,
        customLayouts: [],
        selectedCategory: 'identificacao',
      });

      expect(insertRemoteLabelLayout).toHaveBeenCalled();
      expect(result.savedToDb).toBe(true);
      expect(result.finalModel.id).toBe('db_id_100');
      expect(result.updatedLayouts).toContainEqual(remoteSaved);
      expect(saveCustomLabelLayouts).toHaveBeenCalledWith(result.updatedLayouts);
    });

    it('atualiza no banco remoto quando se trata de edição de modelo existente', async () => {
      const existingModel = { ...baseModel, id: 'uuid-1234-5678' };
      const updatedModel = { ...existingModel, name: 'Nome Atualizado' };

      vi.mocked(updateRemoteLabelLayout).mockResolvedValueOnce({
        data: updatedModel,
        error: null,
      });

      const result = await saveGridModelWithFallback({
        newModel: updatedModel,
        editingGridModel: existingModel,
        customLayouts: [existingModel],
        selectedCategory: 'identificacao',
      });

      expect(updateRemoteLabelLayout).toHaveBeenCalledWith('uuid-1234-5678', expect.any(Object));
      expect(result.savedToDb).toBe(true);
      expect(result.finalModel.name).toBe('Nome Atualizado');
    });

    it('faz contingência local quando a chamada remota retorna erro', async () => {
      vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({
        data: null,
        error: { message: 'Quota exceeded', status: 402 },
      });

      const result = await saveGridModelWithFallback({
        newModel: baseModel,
        editingGridModel: null,
        customLayouts: [],
        selectedCategory: 'identificacao',
      });

      expect(result.savedToDb).toBe(false);
      expect(result.resultError).toBeDefined();
      expect(String(result.finalModel.id)).toMatch(/^custom_/);
      expect(result.updatedLayouts).toContainEqual(result.finalModel);
      expect(saveCustomLabelLayouts).toHaveBeenCalledWith(result.updatedLayouts);
    });

    it('recusa fallback local não confirmado e não converte resultado incerto em cópia local', async () => {
      const request = { newModel: baseModel, editingGridModel: null, customLayouts: [], selectedCategory: 'identificacao' as const };
      vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({ data: null, error: { code: '42501' } });
      vi.mocked(saveCustomLabelLayouts).mockReturnValueOnce(false);
      await expect(saveGridModelWithFallback(request)).rejects.toThrow('neste computador');
      vi.mocked(saveCustomLabelLayouts).mockClear();
      for (const response of [{ data: null, error: { uncertain: true } }, { data: null, error: null }]) {
        vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce(response);
        await expect(saveGridModelWithFallback(request)).rejects.toMatchObject({ uncertain: true });
      }
      vi.mocked(insertRemoteLabelLayout).mockRejectedValueOnce(new TypeError('network'));
      await expect(saveGridModelWithFallback(request)).rejects.toMatchObject({ uncertain: true });
      expect(saveCustomLabelLayouts).not.toHaveBeenCalled();
    });

    it('valida o modelo antes de rede/Storage e salva edições locais sem tocar a rede', async () => {
      await expect(saveGridModelWithFallback({ newModel: { ...baseModel, rows: 0 }, editingGridModel: null, customLayouts: [] })).rejects.toThrow();
      expect(insertRemoteLabelLayout).not.toHaveBeenCalled(); expect(saveCustomLabelLayouts).not.toHaveBeenCalled();
      const local = { ...baseModel, id: 'custom_existing', nameFontSize: 0, imageScale: 0, nameBold: false };
      const result = await saveGridModelWithFallback({ newModel: local, editingGridModel: local, customLayouts: [local] });
      expect(result.finalModel).toMatchObject(local); expect(result.savedToDb).toBe(false);
      expect(insertRemoteLabelLayout).not.toHaveBeenCalled(); expect(updateRemoteLabelLayout).not.toHaveBeenCalled();
    });

    it('não trata falha do cache como falha da gravação remota confirmada', async () => {
      const remote = { ...baseModel, id: 'confirmed-remote' };
      vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({ data: remote, error: null });
      vi.mocked(saveCustomLabelLayouts).mockReturnValueOnce(false);
      const result = await saveGridModelWithFallback({ newModel: baseModel, editingGridModel: null, customLayouts: [] });
      expect(result.savedToDb).toBe(true); expect(result.finalModel).toEqual(remote);
    });

    it('preserva remoto e edição local como override após UPDATE rejeitado', async () => {
      const remote = { ...baseModel, id: 'remote_source' }, edited = { ...remote, name: 'Edição local', nameFontSize: 0 };
      vi.mocked(updateRemoteLabelLayout).mockResolvedValueOnce({ data: null, error: { code: '42501' } });
      const result = await saveGridModelWithFallback({ newModel: edited, editingGridModel: remote, customLayouts: [remote] });
      expect(result.finalModel).toMatchObject({ name: 'Edição local', nameFontSize: 0, baseModelId: remote.id });
      expect(result.finalModel.id).toMatch(/^custom_/); expect(result.savedToDb).toBe(false);
      expect(result.updatedLayouts).toEqual([remote, result.finalModel]);
      vi.mocked(updateRemoteLabelLayout).mockClear();
      const again = await saveGridModelWithFallback({ newModel: { ...result.finalModel, name: 'Segunda edição' }, editingGridModel: result.finalModel, customLayouts: result.updatedLayouts });
      expect(again.finalModel.id).toBe(result.finalModel.id); expect(again.finalModel.baseModelId).toBe(remote.id);
      expect(updateRemoteLabelLayout).not.toHaveBeenCalled();
    });
  });
});
