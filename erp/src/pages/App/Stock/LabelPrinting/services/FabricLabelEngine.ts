import { fabric } from 'fabric';

export const FABRIC_DPI = 300;
export const MM_PER_INCH = 25.4;

export const mmToPx = (mm: number, dpi = FABRIC_DPI): number => {
    return Math.round((mm / MM_PER_INCH) * dpi);
};

export interface LabelProductData {
    title?: string;
    normalPrice?: string;
    promoPrice?: string;
    deText?: string;
    porText?: string;
    currencySymbol?: string;
    centsText?: string;
    installments?: string;
    bgColor?: string;
    priceColor?: string;
    titleColor?: string;
}

export interface FabricLabelDimensions {
    widthMm: number;
    heightMm: number;
    widthPx: number;
    heightPx: number;
}

export const getLabelDimensions = (widthMm = 100, heightMm = 56): FabricLabelDimensions => {
    const validWidthMm = Math.max(10, widthMm);
    const validHeightMm = Math.max(10, heightMm);
    return {
        widthMm: validWidthMm,
        heightMm: validHeightMm,
        widthPx: mmToPx(validWidthMm),
        heightPx: mmToPx(validHeightMm),
    };
};

/**
 * Cria ou inicializa os objetos padrão de uma etiqueta de preço no canvas do Fabric.
 */
export const initDefaultFabricLabel = (
    canvas: fabric.Canvas,
    dimensions: FabricLabelDimensions,
    initialData?: LabelProductData
) => {
    canvas.clear();

    const { widthPx, heightPx } = dimensions;
    canvas.setWidth(widthPx);
    canvas.setHeight(heightPx);

    // 1. Fundo (Background)
    const background = new fabric.Rect({
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        fill: initialData?.bgColor || '#ff7900',
        selectable: false,
        evented: false,
        name: 'background',
    });
    canvas.add(background);

    // 2. Título / Descrição do Produto
    const title = new fabric.Textbox(initialData?.title || 'NOME DO PRODUTO', {
        left: widthPx / 2,
        top: heightPx * 0.08,
        originX: 'center',
        originY: 'top',
        width: widthPx * 0.9,
        fontSize: Math.round(heightPx * 0.08),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: initialData?.titleColor || '#000000',
        textAlign: 'center',
        name: 'title',
        splitByGrapheme: false,
    });
    canvas.add(title);

    // 3. Texto "De"
    const deText = new fabric.Text(initialData?.deText || 'De', {
        left: widthPx * 0.08,
        top: heightPx * 0.28,
        originX: 'left',
        originY: 'top',
        fontSize: Math.round(heightPx * 0.08),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: '#000000',
        name: 'deText',
    });
    canvas.add(deText);

    // 4. Preço Normal / Antigo (R$ 699,00)
    const normalPrice = new fabric.Text(initialData?.normalPrice || 'R$ 699,00', {
        left: widthPx * 0.18,
        top: heightPx * 0.28,
        originX: 'left',
        originY: 'top',
        fontSize: Math.round(heightPx * 0.08),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: '#dc2626',
        linethrough: true,
        name: 'normalPrice',
    });
    canvas.add(normalPrice);

    // 5. Texto "por:"
    const porText = new fabric.Text(initialData?.porText || 'por:', {
        left: widthPx * 0.48,
        top: heightPx * 0.28,
        originX: 'left',
        originY: 'top',
        fontSize: Math.round(heightPx * 0.08),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: '#000000',
        name: 'porText',
    });
    canvas.add(porText);

    // 6. Símbolo Moeda "R$"
    const currencySymbol = new fabric.Text(initialData?.currencySymbol || 'R$', {
        left: widthPx * 0.08,
        top: heightPx * 0.45,
        originX: 'left',
        originY: 'top',
        fontSize: Math.round(heightPx * 0.16),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: '#000000',
        name: 'currencySymbol',
    });
    canvas.add(currencySymbol);

    // 7. Preço Principal Promocional (Número Grande Único)
    const promoPrice = new fabric.Text(initialData?.promoPrice || '599', {
        left: widthPx / 2,
        top: heightPx * 0.62,
        originX: 'center',
        originY: 'center',
        fontSize: Math.round(heightPx * 0.45),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: initialData?.priceColor || '#000000',
        name: 'promoPrice',
    });
    canvas.add(promoPrice);

    // 8. Centavos ",00"
    const cents = new fabric.Text(initialData?.centsText || ',00', {
        left: widthPx * 0.92,
        top: heightPx * 0.45,
        originX: 'right',
        originY: 'top',
        fontSize: Math.round(heightPx * 0.16),
        fontFamily: 'Inter',
        fontWeight: '900',
        fill: '#000000',
        name: 'cents',
    });
    canvas.add(cents);

    // 9. Parcelamento
    const installments = new fabric.Text(initialData?.installments || 'Em até 10x sem juros no cartão', {
        left: widthPx / 2,
        top: heightPx * 0.92,
        originX: 'center',
        originY: 'bottom',
        fontSize: Math.round(heightPx * 0.05),
        fontFamily: 'Inter',
        fontWeight: '700',
        fill: '#000000',
        name: 'installments',
        visible: false,
    });
    canvas.add(installments);

    canvas.renderAll();
};

/**
 * Atualiza os textos e cores dos objetos existentes no canvas sem recriá-los.
 */
export const updateFabricLabelData = (canvas: fabric.Canvas, data: LabelProductData) => {
    const objects = canvas.getObjects();

    objects.forEach((obj: any) => {
        switch (obj.name) {
            case 'background':
                if (data.bgColor) obj.set({ fill: data.bgColor });
                break;
            case 'title':
                if (data.title !== undefined) obj.set({ text: data.title });
                if (data.titleColor) obj.set({ fill: data.titleColor });
                break;
            case 'deText':
                if (data.deText !== undefined) obj.set({ text: data.deText });
                break;
            case 'normalPrice':
                if (data.normalPrice !== undefined) obj.set({ text: data.normalPrice });
                break;
            case 'porText':
                if (data.porText !== undefined) obj.set({ text: data.porText });
                break;
            case 'currencySymbol':
                if (data.currencySymbol !== undefined) obj.set({ text: data.currencySymbol });
                break;
            case 'promoPrice':
                if (data.promoPrice !== undefined) obj.set({ text: data.promoPrice });
                if (data.priceColor) obj.set({ fill: data.priceColor });
                break;
            case 'cents':
                if (data.centsText !== undefined) obj.set({ text: data.centsText });
                break;
            case 'installments':
                if (data.installments !== undefined) obj.set({ text: data.installments });
                break;
            default:
                break;
        }
        obj.setCoords();
    });

    canvas.renderAll();
};

/**
 * Exporta o canvas diretamente para uma imagem PNG em alta resolução.
 */
export const exportFabricCanvasToDataUrl = async (
    canvas: fabric.Canvas,
    multiplier = 1
): Promise<string> => {
    if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
    }
    return canvas.toDataURL({
        format: 'png',
        multiplier,
        enableRetinaScaling: true,
    });
};

/**
 * Renderizador Headless: Carrega um template Fabric JSON, atualiza os dados do produto e exporta diretamente para Data URL PNG.
 */
export const renderFabricTemplateToDataUrl = async (
    templateJson: any,
    productData: LabelProductData,
    widthMm = 100,
    heightMm = 56
): Promise<string> => {
    if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
    }

    const { widthPx, heightPx } = getLabelDimensions(widthMm, heightMm);
    const hiddenCanvasEl = document.createElement('canvas');
    hiddenCanvasEl.width = widthPx;
    hiddenCanvasEl.height = heightPx;

    const staticCanvas = new fabric.StaticCanvas(hiddenCanvasEl, {
        width: widthPx,
        height: heightPx,
        renderOnAddRemove: false,
    });

    return new Promise((resolve) => {
        if (templateJson && typeof templateJson === 'object' && templateJson.objects) {
            staticCanvas.loadFromJSON(templateJson, () => {
                updateFabricLabelData(staticCanvas as any, productData);
                staticCanvas.renderAll();
                const dataUrl = staticCanvas.toDataURL({
                    format: 'png',
                    multiplier: 1,
                    enableRetinaScaling: true,
                });
                staticCanvas.dispose();
                resolve(dataUrl);
            });
        } else {
            initDefaultFabricLabel(staticCanvas as any, { widthMm, heightMm, widthPx, heightPx }, productData);
            staticCanvas.renderAll();
            const dataUrl = staticCanvas.toDataURL({
                format: 'png',
                multiplier: 1,
                enableRetinaScaling: true,
            });
            staticCanvas.dispose();
            resolve(dataUrl);
        }
    });
};
