import { useEffect, useMemo, useState } from 'react';
import { isLayerVisible, type ImageLayout, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { assetSource, imageTemplateError, readTemplateAssets, type TemplateAsset } from './imageTemplateService';

export function useTemplateAssets(layout: ImageLayout, product: TemplatePreviewProduct | null, pending: ReadonlyMap<string, TemplateAsset>) {
  const [stored, setStored] = useState<Map<string, string | null>>(() => new Map());
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const missing = [...new Set(layout.layers.flatMap((layer) => layer.type === 'image' && layer.assetId
    && isLayerVisible(layer, product) && !pending.has(layer.assetId) && !stored.has(layer.assetId) ? [layer.assetId] : []))].sort().join(',');

  useEffect(() => {
    setError('');
    if (!missing) return;
    const ids = missing.split(',');
    const controller = new AbortController();
    void readTemplateAssets(ids, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      const found = new Map(result.map((asset) => [asset.id, assetSource(asset)]));
      setStored((previous) => new Map([...previous, ...ids.map((id) => [id, found.get(id) ?? null] as const)]));
    }).catch((cause) => { if (!controller.signal.aborted) setError(imageTemplateError(cause)); });
    return () => controller.abort();
  }, [attempt, missing]);

  const sources = useMemo(() => {
    const result = new Map<string, string>();
    stored.forEach((url, id) => { if (url) result.set(id, url); });
    pending.forEach((asset, id) => result.set(id, assetSource(asset)));
    return result;
  }, [pending, stored]);
  return { sources, loading: !!missing && !error, error, retry: () => setAttempt((current) => current + 1) };
}
