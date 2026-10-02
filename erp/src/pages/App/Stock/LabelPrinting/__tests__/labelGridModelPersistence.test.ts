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
      expect(String(result.finalModel.id)).toMatch(/^custom_\d+/);
      expect(result.updatedLayouts).toContainEqual(result.finalModel);
      expect(saveCustomLabelLayouts).toHaveBeenCalledWith(result.updatedLayouts);
    });
  });
});
