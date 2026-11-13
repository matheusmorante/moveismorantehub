import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  copyImageLayerToFormat,
  createImageLayer,
  MAX_IMAGE_LAYERS,
  type ImageFormat,
  type ImageLayer,
  type ImageLayerType,
  type ImageLayout,
  type ImageTemplateDesign,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import {
  addTemplateGroupLayers,
  applyTemplateSelection,
  createTemplateGroup,
  deleteTemplateLayer,
  duplicateTemplateGroup,
  findTemplateSelection,
  removeTemplateGroup,
  reorderTemplateItem,
  type TemplateSelection,
} from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import type { LayerSelectionMode } from '../TemplateGroupSettings';
import { imageTemplateError } from '../imageTemplateService';
import { TEMPLATE_FORMAT_LABELS } from './useImageTemplateHistory';

export type CopyLayersRequest = { sourceFormat: ImageFormat; layerIds: string[] };

/**
 * Encapsulates layer, group, multi-selection, and cross-format copy actions for the image template editor.
 */
export function useImageTemplateLayerActions({
  getDesign,
  currentFormat,
  layout,
  activeId,
  isBusy,
  setActiveId,
  setUploadError,
  setError,
  setMessage,
  changeLayout,
  commit,
}: {
  getDesign: () => ImageTemplateDesign;
  currentFormat: ImageFormat;
  layout: ImageLayout;
  activeId: string;
  isBusy: () => boolean;
  setActiveId: Dispatch<SetStateAction<string>>;
  setUploadError: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setMessage: Dispatch<SetStateAction<string>>;
  changeLayout: (next: ImageLayout, amendHistory?: boolean) => void;
  commit: (next: ImageTemplateDesign) => void;
}) {
  const [selectionMode, setSelectionMode] = useState<LayerSelectionMode | null>(null);
  const [copyLayersRequest, setCopyLayersRequest] = useState<CopyLayersRequest | null>(null);

  function replaceLayer(layer: TemplateSelection, amendHistory = false) {
    const latest = getDesign().formats[currentFormat]!;
    const current = findTemplateSelection(latest, layer.id);
    if (current && JSON.stringify(current) !== JSON.stringify(layer)) {
      try {
        changeLayout(applyTemplateSelection(latest, layer), amendHistory);
      } catch (cause) {
        setError(imageTemplateError(cause));
        return false;
      }
    }
    return !!current;
  }

  function addLayer(type: ImageLayerType) {
    if (type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const layer = createImageLayer(type, currentFormat);
    changeLayout({ ...layout, layers: [layer, ...layout.layers] });
    setActiveId(layer.id);
  }

  function duplicateLayer(layer: ImageLayer) {
    if (layer.type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const copy = { ...layer, id: crypto.randomUUID(), name: `${layer.name.slice(0, 72)} (cópia)` };
    const layers = [...layout.layers];
    layers.splice(layout.layers.findIndex((entry) => entry.id === layer.id), 0, copy);
    const groups = layout.groups?.map((group) =>
      group.layerIds.includes(layer.id) ? { ...group, layerIds: [...group.layerIds, copy.id] } : group,
    );
    changeLayout({ ...layout, layers, ...(groups ? { groups } : {}) });
    setActiveId(copy.id);
  }

  function reorder(layerId: string, targetId: string) {
    const next = reorderTemplateItem(layout, layerId, targetId);
    if (next !== layout) changeLayout(next);
  }

  function canRemove(layer: ImageLayer) {
    return layer.type !== 'background' && (
      layer.type !== 'product' || layout.layers.filter((entry) => entry.type === 'product').length > 1
    );
  }

  function removeLayer(layer: ImageLayer) {
    if (isBusy() || !canRemove(layer)) return;
    const nextLayer = layout.layers.find((entry) => entry.id !== layer.id);
    changeLayout(deleteTemplateLayer(layout, layer.id));
    setActiveId(nextLayer?.id ?? '');
    if (nextLayer) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>('.ct-select-layer[aria-pressed="true"]')?.focus();
      });
    }
  }

  function removeGrouping(groupId: string) {
    const group = layout.groups?.find((entry) => entry.id === groupId);
    changeLayout(removeTemplateGroup(layout, groupId));
    if (activeId === groupId) setActiveId(group?.layerIds[0] ?? '');
  }

  function duplicateGrouping(groupId: string) {
    const group = layout.groups?.find((entry) => entry.id === groupId);
    if (!group || layout.layers.length + group.layerIds.length > MAX_IMAGE_LAYERS) return;
    try {
      const duplicated = duplicateTemplateGroup(layout, groupId);
      changeLayout(duplicated.layout);
      setActiveId(duplicated.group.id);
    } catch (cause) {
      setError(imageTemplateError(cause));
    }
  }

  function confirmSelection() {
    if (!selectionMode) return;
    try {
      if (selectionMode.groupId) {
        changeLayout(addTemplateGroupLayers(layout, selectionMode.groupId, selectionMode.layerIds));
        setActiveId(selectionMode.groupId);
      } else {
        const created = createTemplateGroup(layout, selectionMode.layerIds);
        changeLayout(created.layout);
        setActiveId(created.group.id);
      }
      setSelectionMode(null);
    } catch (cause) {
      setError(imageTemplateError(cause));
    }
  }

  function openCopyLayersDialog(layerIds: string[]) {
    const selectedIds = [...new Set(layerIds)].filter((entryId) =>
      layout.layers.some((layer) => layer.id === entryId && layer.type !== 'background'),
    );
    if (!selectedIds.length) return;
    setError('');
    setCopyLayersRequest({ sourceFormat: currentFormat, layerIds: selectedIds });
  }

  function copySelectedLayersToFormats(targetFormats: ImageFormat[]) {
    if (!copyLayersRequest) return;
    const latest = getDesign();
    const sourceFormat = copyLayersRequest.sourceFormat;
    const sourceLayout = latest.formats[sourceFormat];
    if (!sourceLayout) throw new Error('A proporção de origem não está mais disponível.');

    const sourceIds = new Set(copyLayersRequest.layerIds);
    const selectedLayers = sourceLayout.layers.filter(
      (layer): layer is Exclude<ImageLayer, { type: 'background' }> =>
        layer.type !== 'background' && sourceIds.has(layer.id),
    );
    if (!selectedLayers.length || selectedLayers.length !== sourceIds.size) {
      throw new Error('Uma ou mais camadas selecionadas não estão mais disponíveis.');
    }

    const nextFormats = { ...latest.formats };
    const suffix = ' (cópia)';
    for (const targetFormat of targetFormats) {
      if (targetFormat === sourceFormat) continue;
      let targetLayout = nextFormats[targetFormat];
      if (!targetLayout) {
        const sourceBackground = [...sourceLayout.layers]
          .reverse()
          .find((layer): layer is Extract<ImageLayer, { type: 'background' }> => layer.type === 'background');
        const background = sourceBackground
          ? { ...sourceBackground, id: crypto.randomUUID() }
          : createImageLayer('background', targetFormat);
        const layers: ImageLayer[] = selectedLayers.some((layer) => layer.type === 'product')
          ? [background]
          : [createImageLayer('product', targetFormat), background];
        targetLayout = { layers };
      }

      const copies = selectedLayers.map((layer) => {
        const adapted = copyImageLayerToFormat(layer, sourceFormat, targetFormat);
        return { ...adapted, id: crypto.randomUUID(), name: `${layer.name.slice(0, 80 - suffix.length)}${suffix}` };
      });
      if (targetLayout.layers.length + copies.length > MAX_IMAGE_LAYERS) {
        throw new Error(`A proporção ${targetFormat} não tem espaço para todas as camadas copiadas.`);
      }
      nextFormats[targetFormat] = { ...targetLayout, layers: [...copies, ...targetLayout.layers] };
    }

    commit({ ...latest, formats: nextFormats });
    setSelectionMode(null);
    setActiveId(copyLayersRequest.layerIds[0]);
    setMessage(`Camadas copiadas para ${targetFormats.map((ratio) => TEMPLATE_FORMAT_LABELS[ratio]).join(' e ')}.`);
    setCopyLayersRequest(null);
  }

  function toggleLayerSelection(layerId: string) {
    setSelectionMode((current) =>
      current
        ? {
          ...current,
          layerIds: current.layerIds.includes(layerId)
            ? current.layerIds.filter((entryId) => entryId !== layerId)
            : [...current.layerIds, layerId],
        }
        : null,
    );
  }

  function renameLayer(layerId: string) {
    setActiveId(layerId);
    setUploadError('');
    window.requestAnimationFrame(() => {
      const input = document.getElementById('ct-layer-name') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  return {
    selectionMode,
    setSelectionMode,
    copyLayersRequest,
    setCopyLayersRequest,
    replaceLayer,
    addLayer,
    duplicateLayer,
    reorder,
    canRemove,
    removeLayer,
    removeGrouping,
    duplicateGrouping,
    confirmSelection,
    openCopyLayersDialog,
    copySelectedLayersToFormats,
    toggleLayerSelection,
    renameLayer,
  };
}
