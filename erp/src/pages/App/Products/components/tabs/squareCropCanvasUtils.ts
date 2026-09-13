import { SquareSelection } from './squareCropSelection';
import { compressImageToFile } from '@/pages/utils/imageUtils';

export async function processSquareCropImage(
    img: HTMLImageElement,
    container: HTMLDivElement,
    selection: SquareSelection,
    paddingPercent: number
): Promise<File> {
    const stageCanvas = document.createElement('canvas');
    stageCanvas.width = container.clientWidth;
    stageCanvas.height = container.clientHeight;
    const stageCtx = stageCanvas.getContext('2d');
    if (!stageCtx) throw new Error('Não foi possível obter contexto 2D');

    stageCtx.fillStyle = '#FFFFFF';
    stageCtx.fillRect(0, 0, stageCanvas.width, stageCanvas.height);

    const padPx = (container.clientWidth * paddingPercent) / 100;
    const drawW = container.clientWidth - padPx * 2;
    const drawH = container.clientHeight - padPx * 2;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = drawW / drawH;

    let renderW = drawW;
    let renderH = drawH;
    let renderX = padPx;
    let renderY = padPx;

    if (imgAspect > containerAspect) {
        renderH = drawW / imgAspect;
        renderY = padPx + (drawH - renderH) / 2;
    } else {
        renderW = drawH * imgAspect;
        renderX = padPx + (drawW - renderW) / 2;
    }

    stageCtx.drawImage(img, renderX, renderY, renderW, renderH);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1080;
    finalCanvas.height = 1080;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('Não foi possível obter contexto final 2D');

    finalCtx.fillStyle = '#FFFFFF';
    finalCtx.fillRect(0, 0, 1080, 1080);

    const scaleSelectionX = 1080 / container.clientWidth;
    const scaleSelectionY = 1080 / container.clientHeight;

    finalCtx.drawImage(
        stageCanvas,
        selection.x * scaleSelectionX,
        selection.y * scaleSelectionY,
        selection.size * scaleSelectionX,
        selection.size * scaleSelectionY,
        0,
        0,
        1080,
        1080
    );

    const blob = await new Promise<Blob | null>(resolve => finalCanvas.toBlob(resolve, 'image/png', 1));
    if (!blob) throw new Error('Falha ao gerar imagem 1:1');

    const file = new File([blob], `produto-quadrado-${Date.now()}.png`, { type: 'image/png' });
    return compressImageToFile(file, { maxMB: 0.3, maxWidth: 1080 });
}
