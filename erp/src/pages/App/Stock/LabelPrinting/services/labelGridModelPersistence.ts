import type { GridModel } from '../types/LabelGridModelTypes';
import { DEFAULT_LAYOUT_MODELS } from '../utils/defaultLayoutModels';
import { insertRemoteLabelLayout, updateRemoteLabelLayout } from './labelLayoutService';
import { saveCustomLabelLayouts } from './labelStorageService';
import { labelRemoteLayoutDraftSchema, LabelLayoutUnconfirmedError } from '../../../../../../../shared-utils/labelLayoutFormSchemas';

/**
 * Compara o conteúdo completo; nomes/identidade não definem o design.
 */
export const isIdenticalGridModel = (m1: GridModel, m2: GridModel): boolean => {
  const content = (model: GridModel) => JSON.stringify({ ...model, id: undefined, name: undefined, baseModelId: undefined },
    (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : value);
  return content(m1) === content(m2);
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
  isCurrent?: () => boolean;
  getCurrentLayouts?: () => GridModel[];
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
  isCurrent = () => true,
  getCurrentLayouts,
}: SaveGridModelParams): Promise<SaveGridModelResult> {
  if (!isCurrent()) throw new Error('A edição do modelo mudou.');
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
  const modelToSave = labelRemoteLayoutDraftSchema.parse({
    ...newModel,
    category: selectedCategory ?? newModel.category,
    baseModelId: isSystemDefault ? editingGridModel?.id : editingGridModel?.baseModelId,
  });

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
  } catch { throw new LabelLayoutUnconfirmedError(); }
  if ((resultError as { uncertain?: boolean } | null)?.uncertain || (!finalModel && !resultError && !String(targetId).startsWith('custom_'))) {
    throw new LabelLayoutUnconfirmedError();
  }
  if (!isCurrent()) throw new Error('A edição do modelo mudou. Confira os modelos antes de repetir.');

  // Contingência Local caso remoto falhe ou não tenha gravado
  if (!finalModel) {
    const localId = isDbWriteable ? `custom_${crypto.randomUUID()}` : targetId || `custom_${crypto.randomUUID()}`;
    finalModel = { ...modelToSave, id: localId, baseModelId: modelToSave.baseModelId ?? (isDbWriteable ? targetId ?? undefined : undefined) };
  }

  // Atualizar Estado (Substituição por Origem e ID)
  const targetBaseId = finalModel.baseModelId;
  const updatedLayouts = [
    ...(getCurrentLayouts?.() ?? customLayouts).filter((model) => {
      const isOldId = model.id === finalModel.id;
      const isOldOverride = Boolean(targetBaseId && model.baseModelId === targetBaseId);
      return !isOldId && !isOldOverride;
    }),
    finalModel,
  ];

  const locallySaved = saveCustomLabelLayouts(updatedLayouts);
  if (!savedToDb && locallySaved !== true) throw new Error('Não foi possível salvar o modelo neste computador. Confira o armazenamento local e tente novamente.');

  return {
    finalModel,
    updatedLayouts,
    savedToDb,
    resultError,
  };
}
