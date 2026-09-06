import html2canvas from 'html2canvas';

async function inlineImage(url: string) {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar uma imagem para exportação.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  });
}

export async function exportPostImage(element: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll('img')).map(image => image.decode()));
  const sources = Array.from(element.querySelectorAll('img, svg image')).map(image => image.getAttribute('src') || image.getAttribute('href') || '');
  const inlined = new Map(await Promise.all([...new Set(sources)].filter(Boolean).map(async source => [source, await inlineImage(source)] as const)));
  return html2canvas(element, { scale: 1080 / element.clientWidth, useCORS: true, foreignObjectRendering: true,
    backgroundColor: null, onclone: doc => {
      doc.querySelectorAll<HTMLElement>('[data-layer-id]').forEach(layer => { layer.style.outline = 'none'; });
      doc.querySelectorAll('#marketing-post-canvas img, #marketing-post-canvas svg image').forEach(image => {
        const attribute = image.tagName.toLowerCase() === 'img' ? 'src' : 'href';
        const value = inlined.get(image.getAttribute(attribute) || ''); if (value) image.setAttribute(attribute, value);
      });
    }
  });
}
