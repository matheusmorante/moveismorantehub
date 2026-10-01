import type { LabelLogoAsset } from '../types/LabelGridItem.types';
import type { GridModel } from '../types/LabelGridModelTypes';
import type { CustomLabel } from '../utils/LabelConstants';

const STORAGE_KEYS = {
  customLayouts: 'custom_label_layouts',
  hiddenDefaultLayoutIds: 'hidden_default_layout_ids',
  lastSelectedRoundModelId: 'lastSelectedRoundModelId',
  lastSelectedRectModelId: 'lastSelectedRectModelId',
  customLabels: 'label_custom_labels',
  availableLogos: 'label_available_logos',
} as const;

const getStorage = (): Storage | null =>
  typeof window === 'undefined' ? null : window.localStorage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = (key: string): unknown => {
  try {
    const serialized = getStorage()?.getItem(key);
    return serialized ? (JSON.parse(serialized) as unknown) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    getStorage()?.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Não foi possível salvar ${key} no armazenamento local:`, error);
  }
};

const isGridModel = (value: unknown): value is GridModel => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.columns === 'number' &&
    typeof value.rows === 'number' &&
    typeof value.marginT === 'number' &&
    typeof value.marginB === 'number' &&
    typeof value.marginL === 'number' &&
    typeof value.marginR === 'number' &&
    typeof value.gapH === 'number' &&
    typeof value.gapV === 'number' &&
    typeof value.paperSize === 'string' &&
    typeof value.icon === 'string'
  );
};

const isCustomLabel = (value: unknown): value is CustomLabel =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.image === 'string';

const isLabelLogoAsset = (value: unknown): value is LabelLogoAsset =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.image === 'string';

export const getCustomLabelLayouts = (): GridModel[] | null => {
  const value = readJson(STORAGE_KEYS.customLayouts);
  return Array.isArray(value) && value.every(isGridModel) ? value : null;
};

export const saveCustomLabelLayouts = (layouts: readonly GridModel[]): void => {
  writeJson(STORAGE_KEYS.customLayouts, layouts);
};

export const getHiddenDefaultLayoutIds = (): string[] => {
  const value = readJson(STORAGE_KEYS.hiddenDefaultLayoutIds);
  return Array.isArray(value) && value.every((id): id is string => typeof id === 'string')
    ? value
    : [];
};

export const saveHiddenDefaultLayoutIds = (ids: readonly string[]): void => {
  writeJson(STORAGE_KEYS.hiddenDefaultLayoutIds, ids);
};

export const getLastSelectedRoundModelId = (): string =>
  getStorage()?.getItem(STORAGE_KEYS.lastSelectedRoundModelId) || 'round-small';

export const saveLastSelectedRoundModelId = (id: string): void => {
  getStorage()?.setItem(STORAGE_KEYS.lastSelectedRoundModelId, id);
};

export const getLastSelectedRectModelId = (): string =>
  getStorage()?.getItem(STORAGE_KEYS.lastSelectedRectModelId) || 'labels-image-compact';

export const saveLastSelectedRectModelId = (id: string): void => {
  getStorage()?.setItem(STORAGE_KEYS.lastSelectedRectModelId, id);
};

export const getCustomLabels = (): CustomLabel[] => {
  const value = readJson(STORAGE_KEYS.customLabels);
  return Array.isArray(value) ? value.filter(isCustomLabel) : [];
};

export const saveCustomLabels = (labels: readonly CustomLabel[]): void => {
  writeJson(STORAGE_KEYS.customLabels, labels);
};

export const getAvailableLabelLogos = (
  defaultLogos: readonly LabelLogoAsset[]
): LabelLogoAsset[] => {
  const value = readJson(STORAGE_KEYS.availableLogos);
  if (!Array.isArray(value)) return [...defaultLogos];

  const combined = [...defaultLogos];
  value.filter(isLabelLogoAsset).forEach((logo) => {
    if (!combined.some((existing) => existing.id === logo.id)) combined.push(logo);
  });
  return combined;
};

export const saveAvailableLabelLogos = (logos: readonly LabelLogoAsset[]): void => {
  writeJson(STORAGE_KEYS.availableLogos, logos);
};
