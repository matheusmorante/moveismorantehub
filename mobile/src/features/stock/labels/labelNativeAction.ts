export type NativeLabelAction =
  | { id: string; action: 'check-print' }
  | { id: string; action: 'print'; html: string; width: number; height: number }
  | { id: string; action: 'share-image' | 'copy-image'; base64: string; fileName: string };

export function parseNativeLabelAction(value: unknown): NativeLabelAction | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.type !== 'morante-label-action' || typeof data.id !== 'string' || !/^[a-z0-9-]{1,64}$/i.test(data.id)) return null;
  if (data.action === 'check-print') return { id: data.id, action: data.action };
  if (data.action === 'print') {
    const width = Number(data.width);
    const height = Number(data.height);
    if (typeof data.html !== 'string' || data.html.length > 30_000_000 ||
        !Number.isFinite(width) || !Number.isFinite(height) || width < 10 || height < 10 || width > 2000 || height > 2000) return null;
    return { id: data.id, action: data.action, html: data.html, width, height };
  }
  if (data.action === 'share-image' || data.action === 'copy-image') {
    const match = typeof data.dataUrl === 'string' && data.dataUrl.length <= 20_000_000
      ? /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(data.dataUrl)
      : null;
    if (!match) return null;
    const fileName = typeof data.fileName === 'string' ? data.fileName : 'etiqueta.png';
    return { id: data.id, action: data.action, base64: match[1], fileName };
  }
  return null;
}
