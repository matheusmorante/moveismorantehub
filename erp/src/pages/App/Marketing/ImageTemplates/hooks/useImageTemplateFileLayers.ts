import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  createImageLayer,
  MAX_IMAGE_LAYERS,
  templateAssetIds,
  type ImageFormat,
  type ImageLayer,
  type ImageLayout,
  type ImageTemplateDesign,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import type { TemplateSelection } from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import { imageTemplateError, prepareTemplateAsset, type TemplateAsset } from '../imageTemplateService';
import { imageFileDimensions, imageLayerBoundsAfterCrop, imageLayerBoundsForSourceSize, type TemplateImageCrop } from '../templateImageCrop';
import { createTemplatePictureLoader } from '../renderImageTemplate';

function sanitizeTemplateAssetName(fileName: string): string {
  return fileName.split(/[\\/]/).pop()?.replace(/\p{Cc}/gu, ' ').trim().slice(0, 120) || 'Imagem carregada';
}

/**
 * Handles image asset uploads, drag-drop layer creation, and automatic proportional sizing
 * when newly uploaded image assets resolve in the template canvas.
 */
export function useImageTemplateFileLayers({
  getDesign,
  setDesign,
  currentFormat,
  layout,
  active,
  isBusy,
  testArtifact,
  assetSources,
  getPicture,
  past,
  future,
  setPendingAssets,
  replaceLayer,
  changeLayout,
  setActiveId,
  setError,
  setMessage,
}: {
  getDesign: () => ImageTemplateDesign;
  setDesign: (next: ImageTemplateDesign) => void;
  currentFormat: ImageFormat;
  layout: ImageLayout;
  active: TemplateSelection | null;
  isBusy: () => boolean;
  testArtifact?: ImageTemplateDesign['testArtifact'] | null;
  assetSources: ReadonlyMap<string, string>;
  getPicture: ReturnType<typeof createTemplatePictureLoader>;
  past: MutableRefObject<ImageTemplateDesign[]>;
  future: MutableRefObject<ImageTemplateDesign[]>;
  setPendingAssets: Dispatch<SetStateAction<Map<string, TemplateAsset>>>;
  replaceLayer: (layer: TemplateSelection, amendHistory?: boolean) => boolean;
  changeLayout: (next: ImageLayout, amendHistory?: boolean) => void;
  setActiveId: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setMessage: Dispatch<SetStateAction<string>>;
}) {
  const confirmedAssets = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const imageSources = layout.layers.flatMap((layer) => {
      if (layer.type !== 'image' || !layer.assetId) return [];
      const source = assetSources.get(layer.assetId);
      return source ? [{ id: layer.id, assetId: layer.assetId, source }] : [];
    });
    if (!imageSources.length) return;

    void Promise.all(imageSources.map(async ({ id, assetId, source }) => {
      try {
        const picture = await getPicture(source, false);
        return { id, assetId, width: picture.width, height: picture.height };
      } catch {
        return null;
      }
    })).then((loaded) => {
      if (cancelled) return;
      const sizes = new Map<string, NonNullable<(typeof loaded)[number]>>();
      loaded.forEach((entry) => {
        if (entry) sizes.set(entry.id, entry);
      });
      const latest = getDesign();
      const currentLayout = latest.formats[currentFormat];
      if (!currentLayout) return;

      let changed = false;
      const layers = currentLayout.layers.map((layer) => {
        const size = layer.type === 'image' ? sizes.get(layer.id) : undefined;
        if (!size || layer.type !== 'image' || layer.assetId !== size.assetId) return layer;
        const bounds = imageLayerBoundsForSourceSize(layer, size.width, size.height);
        if (bounds.width === layer.width && bounds.height === layer.height) return layer;
        changed = true;
        return { ...layer, ...bounds };
      });
      if (!changed) return;

      const next = { ...latest, formats: { ...latest.formats, [currentFormat]: { ...currentLayout, layers } } };
      past.current = [...past.current.slice(-49), latest];
      future.current = [];
      setDesign(testArtifact ? { ...next, testArtifact } : next);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [assetSources, currentFormat, future, getDesign, getPicture, layout.layers, past, setDesign, testArtifact]);

  async function attachFile(file: File, options?: { fit?: 'contain' | 'cover'; crop?: TemplateImageCrop }): Promise<boolean> {
    if (isBusy() || active?.type !== 'image') return false;
    const layerId = active.id;
    setUploading(true);
    setUploadError('');
    try {
      const asset = await prepareTemplateAsset(file);
      const layer = getDesign().formats[currentFormat]?.layers.find((entry) => entry.id === layerId);
      if (layer?.type !== 'image') return false;

      const assetName = sanitizeTemplateAssetName(file.name);
      const cropBounds = options?.crop
        ? imageLayerBoundsAfterCrop(layer, options.crop)
        : await imageFileDimensions(file).then((sourceSize) =>
          imageLayerBoundsForSourceSize(layer, sourceSize.width, sourceSize.height),
        );

      if (!replaceLayer({ ...layer, ...cropBounds, assetId: asset.id, assetName, fit: options?.fit ?? layer.fit })) {
        return false;
      }
      setPendingAssets((current) => new Map(current).set(asset.id, asset));
      return true;
    } catch (cause) {
      setUploadError(imageTemplateError(cause));
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function addImageLayerFromFile(file: File) {
    if (isBusy()) return;
    setUploadError('');
    if (layout.layers.length >= MAX_IMAGE_LAYERS) {
      setError(`O modelo já atingiu o limite de ${MAX_IMAGE_LAYERS} camadas.`);
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const asset = await prepareTemplateAsset(file);
      const sourceSize = await imageFileDimensions(file);
      const latestDesign = getDesign();
      const latestLayout = latestDesign.formats[currentFormat];
      if (!latestLayout) throw new Error('O formato atual do modelo não está disponível.');
      if (latestLayout.layers.length >= MAX_IMAGE_LAYERS) {
        throw new Error(`O modelo já atingiu o limite de ${MAX_IMAGE_LAYERS} camadas.`);
      }
      const assetIds = templateAssetIds(latestDesign);
      if (!assetIds.includes(asset.id) && assetIds.length >= 12) {
        throw new Error('O modelo já usa o limite de 12 imagens diferentes.');
      }

      const highestImageNumber = latestLayout.layers.reduce((highest, layer) => {
        if (layer.type !== 'image') return highest;
        const match = /^Imagem(?:\s+(?:personalizada|importada))?\s+(\d+)$/i.exec(layer.name.trim());
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);

      const baseLayer = {
        ...createImageLayer('image', currentFormat) as Extract<ImageLayer, { type: 'image' }>,
        name: `Imagem importada ${highestImageNumber + 1}`,
        assetId: asset.id,
        assetName: sanitizeTemplateAssetName(file.name),
      };
      const layer = { ...baseLayer, ...imageLayerBoundsForSourceSize(baseLayer, sourceSize.width, sourceSize.height) };
      setPendingAssets((current) => new Map(current).set(asset.id, asset));
      changeLayout({ ...latestLayout, layers: [layer, ...latestLayout.layers] });
      setActiveId(layer.id);
      setMessage(`Camada “${layer.name}” adicionada. Salvamento automático em até 1 minuto.`);
    } catch (cause) {
      setError(imageTemplateError(cause));
    } finally {
      setUploading(false);
    }
  }

  return {
    confirmedAssets,
    uploading,
    uploadError,
    setUploadError,
    attachFile,
    addImageLayerFromFile,
  };
}
