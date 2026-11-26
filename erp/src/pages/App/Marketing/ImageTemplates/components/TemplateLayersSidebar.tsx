import type { RefObject } from 'react';
import {
  IMAGE_FORMATS,
  LAYER_TYPES,
  MAX_IMAGE_LAYERS,
  type ImageFormat,
  type ImageLayer,
  type ImageLayerType,
  type ImageLayout,
  type ImageTemplateDesign,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { releaseTemplateLayer } from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import type { LayerSelectionMode } from '../TemplateGroupSettings';
import { TemplateLayersList } from '../TemplateLayersList';
import { FIRST_TEMPLATE_FORMAT, TEMPLATE_FORMAT_LABELS } from '../hooks/useImageTemplateHistory';

interface TemplateLayersSidebarProps {
  design: ImageTemplateDesign;
  currentFormat: ImageFormat;
  layout: ImageLayout;
  activeId: string;
  busy: boolean;
  sources: ReadonlyMap<string, string>;
  selectionMode: LayerSelectionMode | null;
  artboardRef: RefObject<HTMLDivElement>;
  setActiveId: (id: string) => void;
  setUploadError: (msg: string) => void;
  chooseFormat: (format: ImageFormat) => void;
  removeCurrentFormat: () => void;
  changeLayout: (next: ImageLayout, amendHistory?: boolean) => void;
  setSelectionMode: (next: LayerSelectionMode | null) => void;
  toggleLayerSelection: (id: string) => void;
  removeGrouping: (groupId: string) => void;
  duplicateGrouping: (groupId: string) => void;
  renameLayer: (layerId: string) => void;
  removeLayer: (layer: ImageLayer) => void;
  duplicateLayer: (layer: ImageLayer) => void;
  openCopyLayersDialog: (layerIds: string[]) => void;
  canRemove: (layer: ImageLayer) => boolean;
  reorder: (layerId: string, targetId: string) => void;
  addLayer: (type: ImageLayerType) => void;
}

export function TemplateLayersSidebar({
  design,
  currentFormat,
  layout,
  activeId,
  busy,
  sources,
  selectionMode,
  artboardRef,
  setActiveId,
  setUploadError,
  chooseFormat,
  removeCurrentFormat,
  changeLayout,
  setSelectionMode,
  toggleLayerSelection,
  removeGrouping,
  duplicateGrouping,
  renameLayer,
  removeLayer,
  duplicateLayer,
  openCopyLayersDialog,
  canRemove,
  reorder,
  addLayer,
}: TemplateLayersSidebarProps) {
  return (
    <aside className="ct-layers" aria-label="Camadas">
      <h2>Camadas</h2>
      <p className="ct-muted">Adicione e personalize as camadas.</p>
      <strong className="ct-format-label">Proporção do modelo</strong>
      <div className="ct-format-tabs" role="tablist" aria-label="Proporção do modelo">
        {IMAGE_FORMATS.map((ratio, index) => (
          <button
            type="button"
            role="tab"
            key={ratio}
            data-ratio={ratio}
            id={`ct-format-${ratio.replace(':', '-')}`}
            aria-controls="ct-format-layers"
            aria-selected={currentFormat === ratio}
            tabIndex={currentFormat === ratio ? 0 : -1}
            disabled={busy}
            title={`${TEMPLATE_FORMAT_LABELS[ratio]}${design.formats[ratio] ? '' : ' · criar a partir do formato atual'}`}
            onClick={() => chooseFormat(ratio)}
            onKeyDown={(event) => {
              const next = event.key === 'ArrowRight'
                ? (index + 1) % IMAGE_FORMATS.length
                : event.key === 'ArrowLeft'
                  ? (index + IMAGE_FORMATS.length - 1) % IMAGE_FORMATS.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? IMAGE_FORMATS.length - 1
                      : -1;
              if (next < 0) return;
              event.preventDefault();
              chooseFormat(IMAGE_FORMATS[next]);
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(`[data-ratio="${IMAGE_FORMATS[next]}"]`)
                ?.focus();
            }}
          >
            {ratio}
          </button>
        ))}
      </div>
      {currentFormat !== FIRST_TEMPLATE_FORMAT && (
        <div className="ct-format-heading">
          <button type="button" className="ct-link" disabled={busy} onClick={removeCurrentFormat}>
            Remover formato
          </button>
        </div>
      )}
      <div
        id="ct-format-layers"
        role="tabpanel"
        aria-labelledby={`ct-format-${currentFormat.replace(':', '-')}`}
        className="ct-layer-panel"
      >
        <TemplateLayersList
          key={currentFormat}
          layout={layout}
          activeId={activeId}
          sources={sources}
          disabled={busy}
          selection={selectionMode}
          onSelect={(selectedId) => {
            setActiveId(selectedId);
            artboardRef.current?.focus({ preventScroll: true });
            setUploadError('');
          }}
          onToggleSelection={toggleLayerSelection}
          onBeginSelection={(selectedId) => setSelectionMode({ layerIds: [selectedId] })}
          onAddToGroup={(groupId) => {
            setActiveId(groupId);
            setSelectionMode({ groupId, layerIds: [] });
          }}
          onRemoveGroup={removeGrouping}
          onDuplicateGroup={duplicateGrouping}
          onUngroup={(layerId) => {
            changeLayout(releaseTemplateLayer(layout, layerId));
            setActiveId(layerId);
          }}
          onRename={renameLayer}
          onRemove={removeLayer}
          onDuplicate={duplicateLayer}
          onCopyToFormat={openCopyLayersDialog}
          canRemove={canRemove}
          onReorder={reorder}
        />
      </div>
      <label className="ct-field">
        <span className="sr-only">Adicionar camada</span>
        <select
          value=""
          disabled={busy || !!selectionMode || layout.layers.length >= MAX_IMAGE_LAYERS}
          onChange={(event) => addLayer(event.target.value as ImageLayerType)}
        >
          <option value="" disabled>＋ Adicionar camada</option>
          {Object.entries(LAYER_TYPES)
            .filter(([type]) => type !== 'background')
            .map(([type, info]) => (
              <option key={type} value={type}>{info.label}</option>
            ))}
        </select>
      </label>
    </aside>
  );
}
