type MobileLabelAction =
  | { action: 'check-print' }
  | { action: 'print'; html: string; width: number; height: number }
  | { action: 'share-image' | 'copy-image'; dataUrl: string; fileName: string };

type NativeLabelWindow = Window & {
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

export function hasMobileLabelBridge(): boolean {
  return window.location.pathname === '/mobile/etiquetas' &&
    typeof (window as NativeLabelWindow).ReactNativeWebView?.postMessage === 'function';
}

export function requestMobileLabelAction(action: MobileLabelAction): Promise<void> {
  const bridge = (window as NativeLabelWindow).ReactNativeWebView;
  if (!hasMobileLabelBridge() || !bridge) return Promise.reject(new Error('Impressão indisponível.'));
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const finish = (error?: string) => {
      window.clearTimeout(timer);
      window.removeEventListener('morante-label-action-result', receive);
      if (error) reject(new Error(error));
      else resolve();
    };
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; ok?: boolean; error?: string }>).detail;
      if (detail?.id !== id) return;
      finish(detail.ok ? undefined : detail.error || 'Não foi possível concluir a ação.');
    };
    const timer = window.setTimeout(() => finish('A operação demorou demais. Tente novamente.'), 120_000);
    window.addEventListener('morante-label-action-result', receive);
    try {
      bridge.postMessage(JSON.stringify({ type: 'morante-label-action', id, ...action }));
    } catch {
      finish('Não foi possível enviar a ação ao aplicativo.');
    }
  });
}

async function inlineBlobImages(original: Element, clone: Element): Promise<void> {
  const originals = Array.from(original.querySelectorAll('img'));
  const copies = Array.from(clone.querySelectorAll('img'));
  await Promise.all(originals.map(async (image, index) => {
    if (!image.src.startsWith('blob:') || !copies[index]) return;
    const response = await fetch(image.src);
    if (!response.ok) throw new Error('Não foi possível preparar uma imagem para impressão.');
    const blob = await response.blob();
    copies[index].src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagem inválida.'));
      reader.onerror = () => reject(new Error('Não foi possível preparar uma imagem para impressão.'));
      reader.readAsDataURL(blob);
    });
  }));
}

/** Prepara o portal já renderizado, preservando os códigos desenhados em canvas. */
export async function buildMobileLabelPrintHtml(): Promise<string> {
  const original = document.querySelector('body > .print-only');
  if (!original) throw new Error('A prévia de impressão não está disponível.');
  const clone = original.cloneNode(true) as HTMLElement;
  await inlineBlobImages(original, clone);
  const sourceCanvases = Array.from(original.querySelectorAll('canvas'));
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));
  sourceCanvases.forEach((canvas, index) => {
    const copy = clonedCanvases[index];
    if (!copy) throw new Error('Não foi possível preparar os códigos das etiquetas.');
    const image = document.createElement('img');
    image.src = canvas.toDataURL('image/png');
    image.setAttribute('style', canvas.getAttribute('style') || '');
    image.className = canvas.className;
    image.width = canvas.width;
    image.height = canvas.height;
    copy.replaceWith(image);
  });
  clone.querySelectorAll('script, iframe, object, embed').forEach((element) => element.remove());
  [clone, ...Array.from(clone.querySelectorAll('*'))].forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') ||
          (['href', 'src', 'xlink:href'].includes(name) && /^\s*javascript:/i.test(attribute.value))) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((element) => element.outerHTML).join('\n');
  return `<!doctype html><html><head><base href="${window.location.origin}/">${styles}</head><body class="label-printing-page">${clone.outerHTML}</body></html>`;
}
