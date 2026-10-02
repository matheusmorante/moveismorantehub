import type { GridModel } from '../types/LabelGridModelTypes';
import { DEFAULT_LAYOUT_MODELS } from '../utils/defaultLayoutModels';
import { insertRemoteLabelLayout, updateRemoteLabelLayout } from './labelLayoutService';
import { saveCustomLabelLayouts } from './labelStorageService';

/**
 * Compara se dois modelos de grade possuem dimensões e geometria idênticas.
 */
export const isIdenticalGridModel = (m1: GridModel, m2: GridModel): boolean => {
  const fieldsToCompare: (keyof GridModel)[] = [
    'columns',
    'rows',
    'marginT',
    'marginB',
    'marginL',
    'marginR',
    'gapH',
    'gapV',
    'paperSize',
    'type',
    'category',
  ];
  return fieldsToCompare.every((field) => m1[field] === m2[field]);
};

/**
 * Busca por um modelo idêntico existente na lista para evitar duplicatas acidentais.
 */
export const findIdenticalGridModel = (
  customLayouts: readonly GridModel[],
  newModel: GridModel,
  targetId: string | null,
  editingModelId?: string | null
): GridModel | undefined => {
  return customLayouts.find(
    (m) => m.id !== targetId && m.id !== (editingModelId || '') && isIdenticalGridModel(m, newModel)
  );
};

export interface SaveGridModelParams {
  newModel: GridModel;
  editingGridModel: GridModel | null;
  customLayouts: GridModel[];
  selectedCategory?: GridModel['category'] | null;
}

export interface SaveGridModelResult {
  finalModel: GridModel;
  updatedLayouts: GridModel[];
  savedToDb: boolean;
  resultError: unknown | null;
}

/**
 * Persiste modelo de grade no Supabase com fallback gracioso para armazenamento local.
 */
export async function saveGridModelWithFallback({
  newModel,
  editingGridModel,
  customLayouts,
  selectedCategory,
}: SaveGridModelParams): Promise<SaveGridModelResult> {
  const isSystemDefault = editingGridModel
    ? DEFAULT_LAYOUT_MODELS.some((m) => m.id === editingGridModel.id)
    : false;
  const existingOverride = isSystemDefault
    ? customLayouts.find((c) => c.baseModelId === editingGridModel?.id)
    : null;

  const targetId =
    existingOverride?.id ?? (isSystemDefault ? null : (editingGridModel?.id ?? null));
  const isUpdateAction = Boolean(targetId);

  const isDbWriteable = isUpdateAction && !String(targetId).startsWith('custom_');
  const modelToSave: GridModel = {
    ...newModel,
    category: selectedCategory ?? newModel.category,
    baseModelId: isSystemDefault ? editingGridModel?.id : editingGridModel?.baseModelId,
  };

  let finalModel: GridModel | null = null;
  let savedToDb = false;
  let resultError: unknown | null = null;

  try {
    if (isDbWriteable && targetId) {
      const { data, error } = await updateRemoteLabelLayout(targetId, modelToSave);
      if (data && !error) {
        finalModel = data;
        savedToDb = true;
      } else {
        resultError = error;
      }
    } else if (!isUpdateAction) {
      const { data, error } = await insertRemoteLabelLayout(modelToSave);
      if (data && !error) {
        finalModel = data;
        savedToDb = true;
      } else {
        resultError = error;
      }
    }
  } catch (e: unknown) {
    console.error('Erro no Supabase:', e);
    resultError = e;
  }

  // Contingência Local caso remoto falhe ou não tenha gravado
  if (!finalModel) {
    const localId = targetId || `custom_${Date.now()}`;
    finalModel = { ...modelToSave, id: localId };
  }

  // Atualizar Estado (Substituição por Origem e ID)
  const targetBaseId = finalModel.baseModelId;
  const updatedLayouts = [
    ...customLayouts.filter((model) => {
      const isOldId = model.id === finalModel.id;
      const isOldOverride = Boolean(targetBaseId && model.baseModelId === targetBaseId);
      return !isOldId && !isOldOverride;
    }),
    finalModel,
  ];

  saveCustomLabelLayouts(updatedLayouts);

  return {
    finalModel,
    updatedLayouts,
    savedToDb,
    resultError,
  };
}
