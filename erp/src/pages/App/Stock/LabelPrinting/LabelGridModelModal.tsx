import React, { useState } from 'react';
import { toast } from 'react-toastify';

export interface GridModel {
    id: string;
    name: string;
    columns: number;
    rows: number;
    marginT: number;
    marginB: number;
    marginL: number;
    marginR: number;
    gapH: number;
    gapV: number;
    paperSize: string;
    paperWidth?: number;
    paperHeight?: number;
    icon: string;
    category?: 'identificacao' | 'precos' | 'logos' | 'posts';
    type?: 'round' | 'rect';
    // Design tipográfico
    nameFontSize?: number;
    nameColor?: string;
    nameBold?: boolean;
    nameAlign?: 'left' | 'center' | 'right';
    nameVAlign?: 'top' | 'middle' | 'bottom';
    priceFontSize?: number;
    priceColor?: string;
    priceBold?: boolean;
    priceAlign?: 'left' | 'center' | 'right';
    priceVAlign?: 'top' | 'middle' | 'bottom';
    promoFontSize?: number;
    promoColor?: string;
    promoBold?: boolean;
    promoAlign?: 'left' | 'center' | 'right';
    promoVAlign?: 'top' | 'middle' | 'bottom';
    // Posições
    namePosX?: number;
    namePosY?: number;
    pricePosX?: number;
    pricePosY?: number;
    promoPosX?: number;
    promoPosY?: number;
    barcodePosX?: number;
    barcodePosY?: number;
    // Fontes por faixa
    priceFontSizeTens?: number;
    priceFontSizeHundreds?: number;
    priceFontSizeThousands?: number;
    priceFontSizeTenThousands?: number;
    promoPriceColor?: string;
    oldPriceColor?: string;
    promoPriceFontSize?: number;
    // Estilos Independentes Promo/Antigo
    promoPriceBold?: boolean;
    promoPriceAlign?: 'left' | 'center' | 'right';
    promoPriceVAlign?: 'top' | 'middle' | 'bottom';
    oldPriceBold?: boolean;
    oldPriceFontSize?: number;
    oldPriceAlign?: 'left' | 'center' | 'right';
    oldPriceVAlign?: 'top' | 'middle' | 'bottom';
    // Estilo de Preço Dividido
    priceFormat?: 'standard' | 'split';
    priceSymbolFontSize?: number;
    priceDecimalsFontSize?: number;
    priceSymbolPosX?: number;
    priceSymbolPosY?: number;
    priceDecimalsPosX?: number;
    priceDecimalsPosY?: number;
    priceSymbolColor?: string;
    priceDecimalsColor?: string;
    priceSymbolBold?: boolean;
    priceDecimalsBold?: boolean;
    // Variações de Promoção (Independentes)
    oldPricePosX?: number; oldPricePosY?: number; oldPriceWidth?: number; oldPriceHeight?: number;
    promoNamePosX?: number; promoNamePosY?: number; promoNameFontSize?: number;
    promoNameAlign?: 'left' | 'center' | 'right'; promoNameVAlign?: 'top' | 'middle' | 'bottom';
    promoNameColor?: string; promoNameBold?: boolean; promoNameWidth?: number; promoNameHeight?: number;
    promoNameBgColor?: string;
    promoBarcodePosX?: number; promoBarcodePosY?: number;
    // Split Price Promoção
    promoPriceSymbolPosX?: number; promoPriceSymbolPosY?: number;
    promoPriceSymbolFontSize?: number; promoPriceSymbolBold?: boolean; promoPriceSymbolColor?: string;
    promoPriceDecimalsPosX?: number; promoPriceDecimalsPosY?: number;
    promoPriceDecimalsFontSize?: number; promoPriceDecimalsBold?: boolean; promoPriceDecimalsColor?: string;
    // Áreas de Segurança
    nameWidth?: number;
    nameHeight?: number;
    priceWidth?: number;
    priceHeight?: number;
    promoWidth?: number;
    promoHeight?: number;
    bg_color?: string;
    nameBgColor?: string;
    priceBgColor?: string;
    promoBgColor?: string;
    extraFields?: any[];
    extraFieldsPromo?: any[];
}

interface LabelGridModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (model: GridModel) => void;
    editingModel?: GridModel | null;
    currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
    existingModels?: GridModel[];
    previewImage?: string | null;
}

const PAPER_OPTIONS = [
    { id: 'A4', name: 'Folha A4 (210x297mm)', w: 210, h: 297 },
    { id: 'A3', name: 'Folha A3 (297x420mm)', w: 297, h: 420 },
    { id: 'A5', name: 'Folha A5 (148x210mm)', w: 148, h: 210 },
    { id: 'Letter', name: 'Carta (216x279mm)', w: 216, h: 279 },
    { id: 'Custom', name: 'Tamanho Personalizado', w: 0, h: 0 },
];

const LabelGridModelModal: React.FC<LabelGridModelModalProps> = ({ isOpen, onClose, onSave, editingModel, currentCategory, existingModels, previewImage }) => {
    const [name, setName] = useState('');
    const [paperSize, setPaperSize] = useState('A4');
    const [customWidth, setCustomWidth] = useState(210);
    const [customHeight, setCustomHeight] = useState(297);
    const [columns, setColumns] = useState(3);
    const [rows, setRows] = useState(7);
    const [marginT, setMarginT] = useState(10);
    const [marginB, setMarginB] = useState(10);
    const [marginL, setMarginL] = useState(10);
    const [marginR, setMarginR] = useState(10);
    const [gapH, setGapH] = useState(2);
    const [gapV, setGapV] = useState(2);
    const [layoutType, setLayoutType] = useState<'round' | 'rect'>('rect');

    // Estados de tipografia
    const [nameFontSize, setNameFontSize] = useState(7);
    const [nameColor, setNameColor] = useState('#1e293b');
    const [nameBold, setNameBold] = useState(true);
    const [nameAlign, setNameAlign] = useState<'left' | 'center' | 'right'>('center');
    const [nameVAlign, setNameVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');

    // Estados de tipografia Normal
    const [priceFontSize, setPriceFontSize] = useState(11);
    const [priceColor, setPriceColor] = useState('#1e293b');
    const [priceBold, setPriceBold] = useState(true);
    const [priceAlign, setPriceAlign] = useState<'left' | 'center' | 'right'>('center');
    const [priceVAlign, setPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');

    // Estados de tipografia Promocional (Novo Preço)
    const [promoPriceFontSize, setPromoPriceFontSize] = useState(24);
    const [promoPriceColor, setPromoPriceColor] = useState('#2563eb');
    const [promoPriceBold, setPromoPriceBold] = useState(true);
    const [promoPriceAlign, setPromoPriceAlign] = useState<'left' | 'center' | 'right'>('center');
    const [promoPriceVAlign, setPromoPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');

    // Estados de tipografia Promocional (Preço Antigo Riscado)
    const [oldPriceFontSize, setOldPriceFontSize] = useState(7);
    const [oldPriceColor, setOldPriceColor] = useState('#94a3b8');
    const [oldPriceBold, setOldPriceBold] = useState(false);
    const [oldPriceAlign, setOldPriceAlign] = useState<'left' | 'center' | 'right'>('center');
    const [oldPriceVAlign, setOldPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');

    const [bgColor, setBgColor] = useState('#ffffff');
    const [nameBgColor, setNameBgColor] = useState('transparent');
    const [priceBgColor, setPriceBgColor] = useState('transparent');
    const [promoBgColor, setPromoBgColor] = useState('transparent');

    const [priceFontSizeTens, setPriceFontSizeTens] = useState<number | undefined>(undefined);
    const [priceFontSizeHundreds, setPriceFontSizeHundreds] = useState<number | undefined>(undefined);
    const [priceFontSizeThousands, setPriceFontSizeThousands] = useState<number | undefined>(undefined);
    const [priceFontSizeTenThousands, setPriceFontSizeTenThousands] = useState<number | undefined>(undefined);

    // Estados de Posicionamento
    const [namePos, setNamePos] = useState({ x: 50, y: 30 });
    const [pricePos, setPricePos] = useState({ x: 50, y: 60 });
    const [promoPos, setPromoPos] = useState({ x: 50, y: 75 });
    const [barcodePos, setBarcodePos] = useState({ x: 50, y: 90 });

    // Estados de Áreas de Segurança (Largura baseada em %)
    const [nameWidth, setNameWidth] = useState(80);
    const [nameHeight, setNameHeight] = useState(20);
    const [priceWidth, setPriceWidth] = useState(80);
    const [priceHeight, setPriceHeight] = useState(30);
    const [promoWidth, setPromoWidth] = useState(80);
    const [promoHeight, setPromoHeight] = useState(40);

    // Lógica de Interação
    const [selectedElement, setSelectedElement] = useState<'name' | 'price' | 'promo' | 'barcode' | 'priceSymbol' | 'priceDecimals' | null>('name');
    const [resizingElement, setResizingElement] = useState<string | null>(null);
    const [resizeSide, setResizeSide] = useState<'left' | 'right' | 'font' | null>(null);
    const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
    const [resizeStartValue, setResizeStartValue] = useState(0);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);

    // Estados de Preço Dividido
    const [priceFormat, setPriceFormat] = useState<'standard' | 'split'>('standard');
    const [priceSymbolFontSize, setPriceSymbolFontSize] = useState(8);
    const [priceSymbolColor, setPriceSymbolColor] = useState('#1e293b');
    const [priceSymbolBold, setPriceSymbolBold] = useState(true);
    const [priceSymbolPos, setPriceSymbolPos] = useState({ x: 35, y: 55 });

    const [priceDecimalsFontSize, setPriceDecimalsFontSize] = useState(8);
    const [priceDecimalsColor, setPriceDecimalsColor] = useState('#1e293b');
    const [priceDecimalsBold, setPriceDecimalsBold] = useState(true);
    const [priceDecimalsPos, setPriceDecimalsPos] = useState({ x: 65, y: 55 });

    // Estados Específicos para o Modo Promocional
    const [promoNamePos, setPromoNamePos] = useState({ x: 50, y: 25 });
    const [promoNameFontSize, setPromoNameFontSize] = useState(9);
    const [promoNameAlign, setPromoNameAlign] = useState<'left' | 'center' | 'right'>('center');
    const [promoNameVAlign, setPromoNameVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
    const [promoNameColor, setPromoNameColor] = useState('#1e293b');
    const [promoNameBold, setPromoNameBold] = useState(false);
    const [promoNameWidth, setPromoNameWidth] = useState(80);
    const [promoNameHeight, setPromoNameHeight] = useState(20);
    const [promoNameBgColor, setPromoNameBgColor] = useState('transparent');
    
    const [oldPricePos, setOldPricePos] = useState({ x: 50, y: 60 });
    const [oldPriceWidth, setOldPriceWidth] = useState(80);
    const [oldPriceHeight, setOldPriceHeight] = useState(30);
    
    const [promoBarcodePos, setPromoBarcodePos] = useState({ x: 50, y: 85 });

    // Campos Extras (Texto Livre)
    const [extraFields, setExtraFields] = useState<any[]>([]);
    const [extraFieldsPromo, setExtraFieldsPromo] = useState<any[]>([]);

    const addExtraField = () => {
        const newField = {
            id: `extra_${Date.now()}`,
            text: 'Novo Texto',
            x: 50,
            y: 50,
            size: 10,
            color: '#1e293b',
            bold: false,
            align: 'center',
            width: 40,
            height: 10,
            bgColor: 'transparent'
        };
        if (isPromoPreview) setExtraFieldsPromo(prev => [...prev, newField]);
        else setExtraFields(prev => [...prev, newField]);
        setSelectedElement(newField.id as any);
    };

    const removeExtraField = (id: string) => {
        if (isPromoPreview) setExtraFieldsPromo(prev => prev.filter(f => f.id !== id));
        else setExtraFields(prev => prev.filter(f => f.id !== id));
        setSelectedElement(null);
    };

    // Estados de Preço Dividido Promoção
    const [promoPriceSymbolFontSize, setPromoPriceSymbolFontSize] = useState(12);
    const [promoPriceSymbolColor, setPromoPriceSymbolColor] = useState('#2563eb');
    const [promoPriceSymbolBold, setPromoPriceSymbolBold] = useState(true);
    const [promoPriceSymbolPos, setPromoPriceSymbolPos] = useState({ x: 35, y: 70 });

    const [promoPriceDecimalsFontSize, setPromoPriceDecimalsFontSize] = useState(12);
    const [promoPriceDecimalsColor, setPromoPriceDecimalsColor] = useState('#2563eb');
    const [promoPriceDecimalsBold, setPromoPriceDecimalsBold] = useState(true);
    const [promoPriceDecimalsPos, setPromoPriceDecimalsPos] = useState({ x: 65, y: 70 });

    // Lógica de Interação
    const [draggingElement, setDraggingElement] = useState<string | null>(null);
    const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null);
    const [showGuides, setShowGuides] = useState({ h: false, v: false });

    // NOVOS ESTADOS DE CONTROLE DE FLUXO E ÍMÃ
    const [isDesignMode, setIsDesignMode] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [showColorPalette, setShowColorPalette] = useState(false);
    const [isPromoPreview, setIsPromoPreview] = useState(true);

    // Fecha a paleta ao mudar de elemento
    React.useEffect(() => setShowColorPalette(false), [selectedElement]);

    const formatLabel = layoutType === 'round' ? 'Redonda' : 'Retangular';
    const generatedName = currentCategory === 'logos'
        ? `${columns * rows} Etiquetas (${formatLabel}) (${columns}x${rows})`
        : `${columns * rows} ${columns * rows === 1 ? 'Etiqueta' : 'Etiquetas'} (${columns}x${rows})`;

    const handleMouseDownResize = (e: React.MouseEvent, element: string, side: 'left' | 'right' | 'font', val: number, currentX: number, currentW: number) => {
        e.stopPropagation(); e.preventDefault();
        setResizingElement(element); setResizeSide(side);
        setResizeStartPos({ x: e.clientX, y: e.clientY }); 
        setResizeStartValue(val);
        setResizeStartX(currentX);
        setResizeStartWidth(currentW);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingElement && !resizingElement) return;
        const rect = previewRef?.getBoundingClientRect();
        if (!rect) return;
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        const newX = (targetX / rect.width) * 100;
        const newY = (targetY / rect.height) * 100;

        if (resizingElement && resizeSide) {
            const deltaX = e.clientX - resizeStartPos.x; const deltaY = e.clientY - resizeStartPos.y;
            const previewW = rect.width;
            const deltaPX = (deltaX / previewW) * 100;

            if (resizeSide === 'font') {
                const newValue = Math.max(4, resizeStartValue + (deltaY / 2));
                const newWidth = Math.max(10, resizeStartWidth + (deltaX / 2));
                
                if (resizingElement === 'name') { 
                    if (isPromoPreview) { setPromoNameFontSize(newValue); setPromoNameWidth(newWidth); }
                    else { setNameFontSize(newValue); setNameWidth(newWidth); }
                }
                else if (resizingElement === 'price') { 
                    if (isPromoPreview) { setOldPriceFontSize(newValue); setOldPriceWidth(newWidth); } 
                    else { setPriceFontSize(newValue); setPriceWidth(newWidth); }
                }
                else if (resizingElement === 'promo') { setPromoPriceFontSize(newValue); setPromoWidth(newWidth); }
                else if (resizingElement === 'priceSymbol') { 
                    if (isPromoPreview) setPromoPriceSymbolFontSize(newValue); else setPriceSymbolFontSize(newValue); 
                }
                else if (resizingElement === 'priceDecimals') { 
                    if (isPromoPreview) setPromoPriceDecimalsFontSize(newValue); else setPriceDecimalsFontSize(newValue); 
                }
                else if (resizingElement.startsWith('extra_')) {
                    const update = (prev: any[]) => prev.map(f => f.id === resizingElement ? { ...f, size: newValue, width: newWidth } : f);
                    if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
                }
            } else if (resizeSide === 'right' || resizeSide === 'left') {
                const isLeft = resizeSide === 'left';
                const newWidth = Math.max(10, isLeft ? (resizeStartWidth - deltaPX) : (resizeStartWidth + deltaPX));
                const newX = resizeStartX + (newWidth - resizeStartWidth) / (isLeft ? -2 : 2);
                
                if (resizingElement === 'name') { 
                    if (isPromoPreview) { setPromoNameWidth(newWidth); setPromoNamePos(p => ({ ...p, x: newX })); }
                    else { setNameWidth(newWidth); setNamePos(p => ({ ...p, x: newX })); }
                }
                else if (resizingElement === 'price') { 
                    if (isPromoPreview) { setOldPriceWidth(newWidth); setOldPricePos(p => ({ ...p, x: newX })); }
                    else { setPriceWidth(newWidth); setPricePos(p => ({ ...p, x: newX })); }
                }
                else if (resizingElement === 'promo') { setPromoWidth(newWidth); setPromoPos(p => ({ ...p, x: newX })); }
            }
        } else if (draggingElement) {
            if (draggingElement === 'name') {
                if (isPromoPreview) { setPromoNamePos({ x: newX, y: newY }); } else { setNamePos({ x: newX, y: newY }); }
            } else if (draggingElement === 'price') {
                if (isPromoPreview) { setOldPricePos({ x: newX, y: newY }); } else { setPricePos({ x: newX, y: newY }); }
            } else if (draggingElement === 'promo') { setPromoPos({ x: newX, y: newY }); }
            else if (draggingElement === 'barcode') {
                if (isPromoPreview) { setPromoBarcodePos({ x: newX, y: newY }); } else { setBarcodePos({ x: newX, y: newY }); }
            }
            else if (draggingElement === 'priceSymbol') {
                if (isPromoPreview) setPromoPriceSymbolPos({ x: newX, y: newY }); else setPriceSymbolPos({ x: newX, y: newY });
            }
            else if (draggingElement === 'priceDecimals') {
                if (isPromoPreview) setPromoPriceDecimalsPos({ x: newX, y: newY }); else setPriceDecimalsPos({ x: newX, y: newY });
            }
            else if (draggingElement.startsWith('extra_')) {
                const update = (prev: any[]) => prev.map(f => f.id === draggingElement ? { ...f, x: newX, y: newY } : f);
                if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
            }
        }
    };

    const handleMouseUp = () => { setDraggingElement(null); setResizingElement(null); setShowGuides({ h: false, v: false }); };

    React.useEffect(() => {
        if (draggingElement || resizingElement) { window.addEventListener('mouseup', handleMouseUp); return () => window.removeEventListener('mouseup', handleMouseUp); }
    }, [draggingElement, resizingElement]);

    React.useEffect(() => {
        if (isOpen) {
            setIsDesignMode(false); // Sempre começa no nível de folha/matriz
            if (editingModel) {
            setPaperSize(editingModel.paperSize); setColumns(editingModel.columns); setRows(editingModel.rows);
            setMarginT(editingModel.marginT); setMarginB(editingModel.marginB); setMarginL(editingModel.marginL); setMarginR(editingModel.marginR);
            setGapH(editingModel.gapH); setGapV(editingModel.gapV); setLayoutType(editingModel.type || 'rect');
            if (editingModel.bg_color) setBgColor(editingModel.bg_color);
            if (editingModel.nameFontSize) setNameFontSize(editingModel.nameFontSize);
            if (editingModel.nameColor) setNameColor(editingModel.nameColor);
            if (editingModel.nameBold !== undefined) setNameBold(editingModel.nameBold);
            if (editingModel.nameAlign) setNameAlign(editingModel.nameAlign);
            if (editingModel.nameVAlign) setNameVAlign(editingModel.nameVAlign);
            if (editingModel.priceFontSize) setPriceFontSize(editingModel.priceFontSize);
            if (editingModel.priceColor) setPriceColor(editingModel.priceColor);
            if (editingModel.priceBold !== undefined) setPriceBold(editingModel.priceBold);
            if (editingModel.priceAlign) setPriceAlign(editingModel.priceAlign);
            if (editingModel.priceVAlign) setPriceVAlign(editingModel.priceVAlign);
            if (editingModel.promoPriceFontSize) setPromoPriceFontSize(editingModel.promoPriceFontSize);
            if (editingModel.promoPriceColor) setPromoPriceColor(editingModel.promoPriceColor);
            if (editingModel.promoPriceBold !== undefined) setPromoPriceBold(editingModel.promoPriceBold);
            if (editingModel.promoPriceAlign) setPromoPriceAlign(editingModel.promoPriceAlign);
            if (editingModel.promoPriceVAlign) setPromoPriceVAlign(editingModel.promoPriceVAlign);
            
            if (editingModel.oldPriceColor) setOldPriceColor(editingModel.oldPriceColor);
            if (editingModel.oldPriceFontSize) setOldPriceFontSize(editingModel.oldPriceFontSize);
            if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
            if (editingModel.oldPriceAlign) setOldPriceAlign(editingModel.oldPriceAlign);
            if (editingModel.oldPriceVAlign) setOldPriceVAlign(editingModel.oldPriceVAlign);
            if (editingModel.nameWidth) setNameWidth(editingModel.nameWidth);
            if (editingModel.nameHeight) setNameHeight(editingModel.nameHeight);
            if (editingModel.priceWidth) setPriceWidth(editingModel.priceWidth);
            if (editingModel.priceHeight) setPriceHeight(editingModel.priceHeight);
            if (editingModel.promoWidth) setPromoWidth(editingModel.promoWidth);
            if (editingModel.promoHeight) setPromoHeight(editingModel.promoHeight);
            if (editingModel.priceFontSizeTens) setPriceFontSizeTens(editingModel.priceFontSizeTens);
            if (editingModel.priceFontSizeHundreds) setPriceFontSizeHundreds(editingModel.priceFontSizeHundreds);
            if (editingModel.priceFontSizeThousands) setPriceFontSizeThousands(editingModel.priceFontSizeThousands);
            if (editingModel.priceFontSizeTenThousands) setPriceFontSizeTenThousands(editingModel.priceFontSizeTenThousands);
            if (editingModel.bg_color) setBgColor(editingModel.bg_color);
            if (editingModel.nameBgColor) setNameBgColor(editingModel.nameBgColor);
            if (editingModel.priceBgColor) setPriceBgColor(editingModel.priceBgColor);
            if (editingModel.promoBgColor) setPromoBgColor(editingModel.promoBgColor);

            setNamePos({ x: editingModel.namePosX ?? 50, y: editingModel.namePosY ?? 30 });
            setPricePos({ x: editingModel.pricePosX ?? 50, y: editingModel.pricePosY ?? 60 });
            setPromoPos({ x: editingModel.promoPosX ?? 50, y: editingModel.promoPosY ?? 75 });
            setBarcodePos({ x: editingModel.barcodePosX ?? 50, y: editingModel.barcodePosY ?? 90 });

            setPriceFormat(editingModel.priceFormat || 'standard');
            if (editingModel.priceSymbolFontSize) setPriceSymbolFontSize(editingModel.priceSymbolFontSize);
            if (editingModel.priceSymbolColor) setPriceSymbolColor(editingModel.priceSymbolColor);
            if (editingModel.priceSymbolBold !== undefined) setPriceSymbolBold(editingModel.priceSymbolBold);
            setPriceSymbolPos({ x: editingModel.priceSymbolPosX ?? 35, y: editingModel.priceSymbolPosY ?? 55 });

            if (editingModel.priceDecimalsFontSize) setPriceDecimalsFontSize(editingModel.priceDecimalsFontSize);
            if (editingModel.priceDecimalsColor) setPriceDecimalsColor(editingModel.priceDecimalsColor);
            if (editingModel.priceDecimalsBold !== undefined) setPriceDecimalsBold(editingModel.priceDecimalsBold);
            setPriceDecimalsPos({ x: editingModel.priceDecimalsPosX ?? 65, y: editingModel.priceDecimalsPosY ?? 55 });

            // Carregar Estados Promocionais
            setPromoNamePos({ x: editingModel.promoNamePosX ?? 50, y: editingModel.promoNamePosY ?? 25 });
            if (editingModel.promoNameFontSize) setPromoNameFontSize(editingModel.promoNameFontSize);
            if (editingModel.promoNameAlign) setPromoNameAlign(editingModel.promoNameAlign);
            if (editingModel.promoNameVAlign) setPromoNameVAlign(editingModel.promoNameVAlign);
            if (editingModel.promoNameColor) setPromoNameColor(editingModel.promoNameColor);
            if (editingModel.promoNameBold !== undefined) setPromoNameBold(editingModel.promoNameBold);
            if (editingModel.promoNameWidth) setPromoNameWidth(editingModel.promoNameWidth);
            if (editingModel.promoNameHeight) setPromoNameHeight(editingModel.promoNameHeight);
            if (editingModel.promoNameBgColor) setPromoNameBgColor(editingModel.promoNameBgColor);

            setOldPricePos({ x: editingModel.oldPricePosX ?? 50, y: editingModel.oldPricePosY ?? 60 });
            if (editingModel.oldPriceWidth) setOldPriceWidth(editingModel.oldPriceWidth);
            if (editingModel.oldPriceHeight) setOldPriceHeight(editingModel.oldPriceHeight);
            if (editingModel.oldPriceFontSize) setOldPriceFontSize(editingModel.oldPriceFontSize);
            if (editingModel.oldPriceColor) setOldPriceColor(editingModel.oldPriceColor);
            if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
            if (editingModel.oldPriceAlign) setOldPriceAlign(editingModel.oldPriceAlign);
            if (editingModel.oldPriceVAlign) setOldPriceVAlign(editingModel.oldPriceVAlign);

            setPromoBarcodePos({ x: editingModel.promoBarcodePosX ?? 50, y: editingModel.promoBarcodePosY ?? 85 });
            if (editingModel.extraFields) setExtraFields(editingModel.extraFields);
            if (editingModel.extraFieldsPromo) setExtraFieldsPromo(editingModel.extraFieldsPromo);

            // Carregar Split Price Promoção
            if (editingModel.promoPriceSymbolPosX !== undefined) setPromoPriceSymbolPos({ x: editingModel.promoPriceSymbolPosX, y: editingModel.promoPriceSymbolPosY ?? 70 });
            if (editingModel.promoPriceSymbolFontSize) setPromoPriceSymbolFontSize(editingModel.promoPriceSymbolFontSize);
            if (editingModel.promoPriceSymbolColor) setPromoPriceSymbolColor(editingModel.promoPriceSymbolColor);
            if (editingModel.promoPriceSymbolBold !== undefined) setPromoPriceSymbolBold(editingModel.promoPriceSymbolBold);

            if (editingModel.promoPriceDecimalsPosX !== undefined) setPromoPriceDecimalsPos({ x: editingModel.promoPriceDecimalsPosX, y: editingModel.promoPriceDecimalsPosY ?? 70 });
            if (editingModel.promoPriceDecimalsFontSize) setPromoPriceDecimalsFontSize(editingModel.promoPriceDecimalsFontSize);
            if (editingModel.promoPriceDecimalsColor) setPromoPriceDecimalsColor(editingModel.promoPriceDecimalsColor);
            if (editingModel.promoPriceDecimalsBold !== undefined) setPromoPriceDecimalsBold(editingModel.promoPriceDecimalsBold);
            }
        }
    }, [isOpen, editingModel]);

    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const newModel: GridModel = {
                id: editingModel?.id || `custom_${Date.now()}`,
                name: generatedName, columns, rows, marginT, marginB, marginL, marginR, gapH, gapV, paperSize,
                paperWidth: paperSize === 'Custom' ? customWidth : undefined, paperHeight: paperSize === 'Custom' ? customHeight : undefined,
                icon: layoutType === 'round' ? 'bi-circle' : 'bi-grid-fill', category: editingModel?.category || (currentCategory as any) || 'identificacao',
                type: layoutType, nameFontSize, nameColor, nameBold, nameAlign, nameVAlign,
                priceFontSize, priceColor, priceBold, priceAlign, priceVAlign,
                promoPriceFontSize, promoPriceColor, promoPriceBold, promoPriceAlign, promoPriceVAlign,
                oldPriceFontSize, oldPriceColor, oldPriceBold, oldPriceAlign, oldPriceVAlign,
                namePosX: namePos.x, namePosY: namePos.y, pricePosX: pricePos.x, pricePosY: pricePos.y, promoPosX: promoPos.x, promoPosY: promoPos.y, barcodePosX: barcodePos.x, barcodePosY: barcodePos.y,
                priceWidth, priceHeight, promoWidth, promoHeight,
                priceFontSizeTens, priceFontSizeHundreds, priceFontSizeThousands, priceFontSizeTenThousands,
                bg_color: bgColor,
                nameBgColor,
                priceBgColor,
                promoBgColor,
                priceFormat,
                priceSymbolFontSize, priceSymbolColor, priceSymbolBold,
                priceSymbolPosX: priceSymbolPos.x, priceSymbolPosY: priceSymbolPos.y,
                priceDecimalsFontSize, priceDecimalsColor, priceDecimalsBold,
                priceDecimalsPosX: priceDecimalsPos.x, priceDecimalsPosY: priceDecimalsPos.y,
                // Promo-specific fields
                oldPricePosX: oldPricePos.x, oldPricePosY: oldPricePos.y, 
                oldPriceWidth: oldPriceWidth, oldPriceHeight: oldPriceHeight,
                promoNamePosX: promoNamePos.x, promoNamePosY: promoNamePos.y,
                promoNameFontSize: promoNameFontSize, promoNameAlign: promoNameAlign,
                promoNameVAlign: promoNameVAlign, promoNameColor: promoNameColor,
                promoNameBold: promoNameBold, promoNameWidth: promoNameWidth,
                promoNameHeight: promoNameHeight, promoNameBgColor: promoNameBgColor,
                promoBarcodePosX: promoBarcodePos.x, promoBarcodePosY: promoBarcodePos.y,
                // Split Price Promoção no Modelo
                promoPriceSymbolPosX: promoPriceSymbolPos.x, promoPriceSymbolPosY: promoPriceSymbolPos.y,
                promoPriceSymbolFontSize: promoPriceSymbolFontSize, promoPriceSymbolColor: promoPriceSymbolColor,
                promoPriceSymbolBold: promoPriceSymbolBold,
                promoPriceDecimalsPosX: promoPriceDecimalsPos.x, promoPriceDecimalsPosY: promoPriceDecimalsPos.y,
                promoPriceDecimalsFontSize: promoPriceDecimalsFontSize, promoPriceDecimalsColor: promoPriceDecimalsColor,
                promoPriceDecimalsBold: promoPriceDecimalsBold,
                extraFields: extraFields,
                extraFieldsPromo: extraFieldsPromo
            };
            await onSave(newModel);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Componente da Barra de Ferramentas Fixa (Sekondary Header)
    const FixedToolbar = () => {
        const isInactive = !selectedElement;
        const isText = selectedElement && selectedElement !== 'barcode';
        
        const getActiveValue = () => {
            if (selectedElement === 'name') return { font: nameFontSize, color: nameColor, bold: nameBold, align: nameAlign, valign: nameVAlign };
            if (selectedElement === 'price') {
                if (isPromoPreview) return { font: oldPriceFontSize, color: oldPriceColor, bold: oldPriceBold, align: oldPriceAlign, valign: oldPriceVAlign };
                return { font: priceFontSize, color: priceColor, bold: priceBold, align: priceAlign, valign: priceVAlign };
            }
            if (selectedElement === 'promo') return { font: promoPriceFontSize, color: promoPriceColor, bold: promoPriceBold, align: promoPriceAlign, valign: promoPriceVAlign };
            if (selectedElement === 'priceSymbol') {
                if (isPromoPreview) return { font: promoPriceSymbolFontSize, color: promoPriceSymbolColor, bold: promoPriceSymbolBold, align: 'center' as const, valign: 'middle' as const };
                return { font: priceSymbolFontSize, color: priceSymbolColor, bold: priceSymbolBold, align: 'center' as const, valign: 'middle' as const };
            }
            if (selectedElement === 'priceDecimals') {
                if (isPromoPreview) return { font: promoPriceDecimalsFontSize, color: promoPriceDecimalsColor, bold: promoPriceDecimalsBold, align: 'center' as const, valign: 'middle' as const };
                return { font: priceDecimalsFontSize, color: priceDecimalsColor, bold: priceDecimalsBold, align: 'center' as const, valign: 'middle' as const };
            }
            if (selectedElement?.toString().startsWith('extra_')) {
                const fields = isPromoPreview ? extraFieldsPromo : extraFields;
                const f = fields.find(field => field.id === selectedElement);
                if (f) return { font: f.size, color: f.color, bold: f.bold, align: f.align || 'center', valign: 'middle' as const, text: f.text };
            }
            return { font: 0, color: '#ccc', bold: false, align: 'center' as const, valign: 'middle' as const, text: '' };
        };

        const active = getActiveValue();
        const activeColor = isText ? active.color : '#ccc';
        const activeSize = isText ? active.font : 0;
        const activeBold = isText ? active.bold : false;
        const activeAlign = isText ? active.align : 'center';
        const activeVAlign = isText ? active.valign : 'middle';
        
        const activeBg = !selectedElement ? bgColor : 
                        selectedElement === 'name' ? (isPromoPreview ? promoNameBgColor : nameBgColor) :
                        selectedElement === 'price' ? priceBgColor :
                        selectedElement === 'promo' ? promoBgColor : 
                        (selectedElement === 'priceSymbol' || selectedElement === 'priceDecimals') ? priceBgColor : 'transparent';

        const updateStyle = (key: string, val: any) => {
            if (!selectedElement) {
                if (key === 'bg') setBgColor(val);
                return;
            }
            if (selectedElement === 'name') {
                if (isPromoPreview) {
                    if (key === 'color') setPromoNameColor(val); if (key === 'size') setPromoNameFontSize(val); if (key === 'bold') setPromoNameBold(val);
                    if (key === 'align') setPromoNameAlign(val); if (key === 'valign') setPromoNameVAlign(val);
                    if (key === 'bg') setPromoNameBgColor(val);
                } else {
                    if (key === 'color') setNameColor(val); if (key === 'size') setNameFontSize(val); if (key === 'bold') setNameBold(val);
                    if (key === 'align') setNameAlign(val); if (key === 'valign') setNameVAlign(val);
                    if (key === 'bg') setNameBgColor(val);
                }
            } else if (selectedElement === 'price') {
                 if (isPromoPreview) {
                    if (key === 'color') setOldPriceColor(val); if (key === 'size') setOldPriceFontSize(val); if (key === 'bold') setOldPriceBold(val);
                    if (key === 'align') setOldPriceAlign(val); if (key === 'valign') setOldPriceVAlign(val);
                 } else {
                    if (key === 'color') setPriceColor(val); if (key === 'size') setPriceFontSize(val); if (key === 'bold') setPriceBold(val);
                    if (key === 'align') setPriceAlign(val); if (key === 'valign') setPriceVAlign(val);
                 }
                 if (key === 'bg') setPriceBgColor(val);
            } else if (selectedElement === 'promo') {
                if (key === 'color') setPromoPriceColor(val); if (key === 'size') setPromoPriceFontSize(val); if (key === 'bold') setPromoPriceBold(val);
                if (key === 'align') setPromoPriceAlign(val); if (key === 'valign') setPromoPriceVAlign(val);
                if (key === 'bg') setPromoBgColor(val);
            } else if (selectedElement === 'priceSymbol') {
                if (isPromoPreview) {
                    if (key === 'color') setPromoPriceSymbolColor(val); if (key === 'size') setPromoPriceSymbolFontSize(val); if (key === 'bold') setPromoPriceSymbolBold(val);
                } else {
                    if (key === 'color') setPriceSymbolColor(val); if (key === 'size') setPriceSymbolFontSize(val); if (key === 'bold') setPriceSymbolBold(val);
                }
                if (key === 'bg') setPriceBgColor(val);
            } else if (selectedElement === 'priceDecimals') {
                if (isPromoPreview) {
                    if (key === 'color') setPromoPriceDecimalsColor(val); if (key === 'size') setPromoPriceDecimalsFontSize(val); if (key === 'bold') setPromoPriceDecimalsBold(val);
                } else {
                    if (key === 'color') setPriceDecimalsColor(val); if (key === 'size') setPriceDecimalsFontSize(val); if (key === 'bold') setPriceDecimalsBold(val);
                }
                if (key === 'bg') setPriceBgColor(val);
            } else if (selectedElement?.toString().startsWith('extra_')) {
                const update = (prev: any[]) => prev.map(f => {
                    if (f.id === selectedElement) {
                        if (key === 'color') return { ...f, color: val };
                        if (key === 'size') return { ...f, size: val };
                        if (key === 'bold') return { ...f, bold: val };
                        if (key === 'text') return { ...f, text: val };
                        if (key === 'align') return { ...f, align: val };
                    }
                    return f;
                });
                if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
            }
        };

        const cycleAlign = () => {
            const next: Record<string, 'left' | 'center' | 'right'> = { left: 'center', center: 'right', right: 'left' };
            updateStyle('align', next[activeAlign]);
        };

        const cycleVAlign = () => {
            const next: Record<string, 'top' | 'middle' | 'bottom'> = { top: 'middle', middle: 'bottom', bottom: 'top' };
            updateStyle('valign', next[activeVAlign]);
        };

        return (
            <div className={`px-12 py-3 border-b min-h-[85px] flex items-center justify-between transition-all ${isInactive && !isDesignMode ? 'bg-slate-50/50 grayscale opacity-50' : 'bg-white dark:bg-slate-900 shadow-sm border-blue-500/20'}`}>
                <div className="flex items-center gap-6 flex-wrap">
                    <button onClick={() => setIsDesignMode(false)} className="px-5 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 shrink-0">
                        <i className="bi bi-chevron-left" /> Voltar
                    </button>
                    
                    <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                    {/* Modo de Visualização (Alternar entre Normal e Promo) */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl">
                        <button 
                            onClick={() => { setIsPromoPreview(false); setSelectedElement(null); }} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${!isPromoPreview ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Preço Normal
                        </button>
                        <button 
                            onClick={() => { setIsPromoPreview(true); setSelectedElement(null); }} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isPromoPreview ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Promocional
                        </button>
                    </div>

                    <button onClick={addExtraField} className="px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-sm border border-blue-100 active:scale-95 shrink-0">
                        <i className="bi bi-fonts" /> Texto+
                    </button>

                    <div className="h-8 w-px bg-slate-200" />

                    {selectedElement?.toString().startsWith('extra_') && (
                        <div className="flex items-center gap-2 bg-blue-50/50 p-1 rounded-xl border border-blue-100">
                             <input 
                                type="text"
                                value={active.text || ''}
                                onChange={e => updateStyle('text', e.target.value)}
                                placeholder="Editar texto..."
                                className="bg-white border-none text-[10px] font-bold px-3 py-1.5 rounded-lg w-48 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                            <button onClick={() => removeExtraField(selectedElement as string)} className="p-1 px-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-all">
                                <i className="bi bi-trash3-fill text-[10px]" />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Cor de Fundo Dinâmica */}
                        <div className="relative flex flex-col items-center gap-1">
                            <div className="relative">
                                <button className="w-9 h-9 rounded-xl border-2 border-slate-200 shadow-sm transition-all hover:scale-110 active:scale-90" style={{ backgroundColor: activeBg === 'transparent' ? '#fff' : activeBg }}>
                                    <input type="color" value={activeBg === 'transparent' ? '#ffffff' : activeBg} onChange={e => updateStyle('bg', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    {activeBg === 'transparent' ? (
                                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 -rotate-45" />
                                    ) : null}
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                                        <i className={`bi bi-${selectedElement ? 'square-fill' : 'card-heading'} text-[8px] text-slate-500`} />
                                    </div>
                                </button>
                                {activeBg !== 'transparent' && (
                                    <button 
                                        onClick={() => updateStyle('bg', 'transparent')}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600 transition-colors"
                                    >
                                        <i className="bi bi-x" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-1" />

                        {/* Ímã Toggle */}
                        <button 
                            onClick={() => setSnapEnabled(!snapEnabled)} 
                            title={snapEnabled ? "Desativar Ímã de Centro" : "Ativar Ímã de Centro"}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${snapEnabled ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                        >
                            <i className={`bi bi-magnet${snapEnabled ? '-fill' : ''} text-base`} />
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1" />

                        {/* Cor do Texto */}
                        <div className="relative">
                            <button disabled={isInactive} onClick={() => setShowColorPalette(!showColorPalette)} className={`flex flex-col items-center px-2 py-1 rounded-xl transition-all ${showColorPalette ? 'bg-slate-100' : 'hover:bg-slate-50'} ${isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                <span className="text-[12px] font-black leading-none" style={{ color: activeColor }}>A</span>
                                <div className="h-[2.5px] w-4 mt-0.5 rounded-full" style={{ backgroundColor: activeColor }} />
                            </button>
                            {showColorPalette && (
                                <>
                                    <div className="fixed inset-0 z-[1000]" onClick={() => setShowColorPalette(false)} />
                                    <div className="absolute top-full left-0 mt-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-2xl z-[1001] w-48">
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'].map(c => (
                                                <button key={c} onClick={() => updateStyle('color', c)} className="w-6 h-6 rounded-md hover:scale-125 transition-transform" style={{ backgroundColor: c, border: c.toLowerCase() === '#ffffff' ? '1px solid #ddd' : 'none' }}>
                                                    {activeColor.toLowerCase() === c.toLowerCase() && <i className={`bi bi-check text-[10px] ${c.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}`} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-px bg-slate-50 my-2" />
                                        <div className="relative group">
                                            <button className="w-full text-[7px] font-black uppercase text-slate-400 py-1">Mais...</button>
                                            <input type="color" value={activeColor} onChange={e => updateStyle('color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Tamanho Base */}
                        <div className={`flex flex-col items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl ${isInactive ? 'opacity-30' : ''}`}>
                            <span className="text-[7px] font-black uppercase text-slate-400">Base</span>
                            <input disabled={isInactive} type="number" value={Math.round(activeSize)} onChange={e => updateStyle('size', parseInt(e.target.value) || 1)} className="w-9 bg-transparent border-none text-[11px] font-black text-center outline-none cursor-pointer" />
                        </div>

                        {/* Escalas Dinâmicas (Apenas para Preços) */}
                        {(selectedElement === 'price' || selectedElement === 'promo') && (
                            <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                                <div className="h-6 w-px bg-slate-200 mx-1" />
                                <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
                                    <span className="text-[6px] font-black uppercase text-slate-400">10+</span>
                                    <input type="number" value={priceFontSizeTens || 0} onChange={e => setPriceFontSizeTens(parseInt(e.target.value) || 0)} className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600" />
                                </div>
                                <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
                                    <span className="text-[6px] font-black uppercase text-slate-400">100+</span>
                                    <input type="number" value={priceFontSizeHundreds || 0} onChange={e => setPriceFontSizeHundreds(parseInt(e.target.value) || 0)} className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600" />
                                </div>
                                <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
                                    <span className="text-[6px] font-black uppercase text-slate-400">1k+</span>
                                    <input type="number" value={priceFontSizeThousands || 0} onChange={e => setPriceFontSizeThousands(parseInt(e.target.value) || 0)} className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600" />
                                </div>
                                <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
                                    <span className="text-[6px] font-black uppercase text-slate-400">10k+</span>
                                    <input type="number" value={priceFontSizeTenThousands || 0} onChange={e => setPriceFontSizeTenThousands(parseInt(e.target.value) || 0)} className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600" />
                                </div>
                            </div>
                        )}

                        {/* Negrito */}
                        <button disabled={isInactive} onClick={() => updateStyle('bold', !activeBold)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeBold ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'} ${isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}>
                            <i className="bi bi-type-bold text-base" />
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1" />

                        {/* Alinhamento */}
                        <button disabled={isInactive} onClick={cycleAlign} className={`w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-all text-slate-600 ${isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}>
                             <i className={`bi bi-text-${activeAlign === 'center' ? 'center' : activeAlign === 'left' ? 'left' : 'right'} text-base`} />
                        </button>

                        <button disabled={isInactive} onClick={cycleVAlign} className={`w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-all text-slate-600 ${isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}>
                             <i className={`bi bi-align-${activeVAlign === 'middle' ? 'center' : activeVAlign} text-base`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                     <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selecionado</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 truncate max-w-[120px]">
                            {selectedElement === 'name' ? 'Produto' : selectedElement === 'price' ? (isPromoPreview ? 'Preço Antigo' : 'Preço') : selectedElement === 'promo' ? 'Novo Preço' : selectedElement === 'priceSymbol' ? 'Símbolo R$' : selectedElement === 'priceDecimals' ? 'Centavos' : 'Nenhum'}
                        </span>
                    </div>
                    {selectedElement && (
                        <button onClick={() => setSelectedElement(null)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-500 hover:text-white">
                            <i className="bi bi-x-lg text-sm" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Visualizador de Folha Inteira com Exemplos
    const SheetPreviewGrid = () => {
        const option = PAPER_OPTIONS.find(o => o.id === paperSize) || PAPER_OPTIONS[0];
        const w = paperSize === 'Custom' ? customWidth : option.w;
        const h = paperSize === 'Custom' ? customHeight : option.h;
        const aspect = w / h;
        const previewH = 1000;
        const previewW = previewH * aspect;

        const getAlignment = (align?: string) => align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        const getVAlignment = (valign?: string) => valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';

        return (
            <div className="relative bg-white shadow-2xl border-4 border-white overflow-hidden flex flex-col" style={{ width: `${previewW}px`, height: `${previewH}px`, padding: `${marginT/2}px ${marginR/2}px ${marginB/2}px ${marginL/2}px` }}>
                <div 
                    className="flex-1 grid" 
                    style={{ 
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                        columnGap: `${gapH/2}px`,
                        rowGap: `${gapV/2}px`
                    }}
                >
                    {Array.from({ length: columns * rows }).map((_, i) => {
                        const col = i % columns;
                        const isPromo = i % 2 !== 0; // Alternando promocional para comparação rápida
                        
                        // Teste de faixas para o preview
                        let priceValue = col === 0 ? 129.90 : 3490.00;
                        if (i > columns * 2) priceValue = 18500.00;
                        if (i % 7 === 0) priceValue = 59.90;
                        if (i % 5 === 0) priceValue = 9.90;

                        const isTen = priceValue >= 10 && priceValue < 100;
                        const isHundred = priceValue >= 100 && priceValue < 1000;
                        const isThousand = priceValue >= 1000 && priceValue < 10000;
                        const isTenThousand = priceValue >= 10000;
                        
                        const dynamicScale = isTen ? (priceFontSizeTens || 0) : 
                                            isHundred ? (priceFontSizeHundreds || 0) : 
                                            isThousand ? (priceFontSizeThousands || 0) :
                                            isTenThousand ? (priceFontSizeTenThousands || 0) : 0;
                        
                        // Ajuste dinâmico de fonte para a prévia (Hundreds / Thousands)
                        const dynamicAdjustment = isThousand ? (priceFontSizeThousands || 0) : (isHundred ? (priceFontSizeHundreds || 0) : 0);
                        const adjustedPriceSize = isPromo 
                            ? oldPriceFontSize + dynamicAdjustment
                            : priceFontSize + dynamicAdjustment;
                        
                        const currentPromoSize = promoPriceFontSize + dynamicAdjustment;

                        // Lógica de Preço Dividido para a prévia
                        const priceParts = priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',');
                        const integerPart = priceParts[0].replace('R$', '').trim();
                        const decimalPart = `,${priceParts[1]}`;

                        return (
                            <div key={i} className={`relative border border-slate-100 overflow-hidden flex items-center justify-center ${layoutType === 'round' ? 'rounded-full' : ''}`} style={{ backgroundColor: bgColor, containerType: 'size' }}>
                                {previewImage && (
                                    <img src={previewImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: (currentCategory === 'logos') ? 1 : 0.1, zIndex: 0 }} />
                                )}
                                <div className="absolute inset-0 pointer-events-none origin-center flex items-center justify-center w-full h-full">
                                    <div className="relative w-full h-full">
                                        {/* Nome do Produto */}
                                        <div style={{ 
                                            position: 'absolute', 
                                            left: `${(isPromo ? promoNamePos.x : namePos.x)}%`, 
                                            top: `${(isPromo ? promoNamePos.y : namePos.y)}%`, 
                                            width: `${(isPromo ? promoNameWidth : nameWidth)}%`, 
                                            height: `${(isPromo ? promoNameHeight : nameHeight)}%`, 
                                            transform: 'translate(-50%, -50%)', display: 'flex', 
                                            alignItems: getVAlignment(isPromo ? promoNameVAlign : nameVAlign), 
                                            justifyContent: getAlignment(isPromo ? promoNameAlign : nameAlign),
                                            backgroundColor: (isPromo ? promoNameBgColor : nameBgColor), 
                                            padding: ((isPromo ? promoNameBgColor : nameBgColor) && (isPromo ? promoNameBgColor : nameBgColor) !== 'transparent') ? 'calc( (8 / 500) * 100cqh )' : '0' 
                                        }}>
                                            <div style={{ 
                                                fontSize: `calc( (${isPromo ? promoNameFontSize : nameFontSize} / 500) * 100cqh )`, 
                                                fontWeight: (isPromo ? promoNameBold : nameBold) ? '950' : '500', 
                                                color: isPromo ? promoNameColor : nameColor, 
                                                textAlign: isPromo ? promoNameAlign : nameAlign 
                                            }}>Produto de Exemplo {isPromo ? '(Promo)' : ''}</div>
                                        </div>

                                        {/* Preço (Normal ou Antigo Riscado) */}
                                        <div style={{ 
                                            position: 'absolute', 
                                            left: `${(isPromo ? oldPricePos.x : pricePos.x)}%`, 
                                            top: `${(isPromo ? oldPricePos.y : pricePos.y)}%`, 
                                            width: `${(isPromo ? oldPriceWidth : priceWidth)}%`, 
                                            height: `${(isPromo ? oldPriceHeight : priceHeight)}%`, 
                                            transform: 'translate(-50%, -50%)', 
                                            display: 'flex', 
                                            alignItems: getVAlignment(isPromo ? oldPriceVAlign : priceVAlign), 
                                            justifyContent: getAlignment(isPromo ? oldPriceAlign : priceAlign),
                                            backgroundColor: priceBgColor, 
                                            padding: (priceBgColor && priceBgColor !== 'transparent') ? 'calc( (8 / 500) * 100cqh )' : '0' 
                                        }}>
                                            <div style={{ 
                                                fontSize: `calc( (${adjustedPriceSize} / 500) * 100cqh )`, 
                                                fontWeight: (isPromo ? oldPriceBold : priceBold) ? '950' : '500', 
                                                color: isPromo ? oldPriceColor : priceColor, 
                                                textAlign: isPromo ? oldPriceAlign : priceAlign 
                                            }}>
                                                {isPromo ? (
                                                    <span className="relative">
                                                        {(priceFormat === 'split' ? integerPart : priceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))} 
                                                        <div className="absolute top-1/2 left-[-2%] right-[-2%] h-[2px] bg-red-500 rounded-full opacity-100" />
                                                    </span>
                                                ) : (priceFormat === 'split' ? integerPart : priceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                                            </div>
                                        </div>

                                        {priceFormat === 'split' && !isPromo && (
                                            <>
                                                {/* Símbolo R$ */}
                                                <div style={{ 
                                                    position: 'absolute', left: `${priceSymbolPos.x}%`, top: `${priceSymbolPos.y}%`, 
                                                    transform: 'translate(-50%, -50%)', 
                                                    fontSize: `calc( (${priceSymbolFontSize} / 500) * 100cqh )`,
                                                    fontWeight: priceSymbolBold ? '950' : '400',
                                                    color: priceSymbolColor
                                                }}>R$</div>

                                                {/* Centavos ,00 */}
                                                <div style={{ 
                                                    position: 'absolute', left: `${priceDecimalsPos.x}%`, top: `${priceDecimalsPos.y}%`, 
                                                    transform: 'translate(-50%, -50%)', 
                                                    fontSize: `calc( (${priceDecimalsFontSize} / 500) * 100cqh )`,
                                                    fontWeight: priceDecimalsBold ? '950' : '400',
                                                    color: priceDecimalsColor
                                                }}>{decimalPart}</div>
                                            </>
                                        )}

                                        {isPromo && (
                                            <div style={{ 
                                                position: 'absolute', left: `${promoPos.x}%`, top: `${promoPos.y}%`, width: `${promoWidth}%`, height: `${promoHeight}%`, 
                                                transform: 'translate(-50%, -50%)', display: 'flex', alignItems: getVAlignment(promoPriceVAlign), justifyContent: getAlignment(promoPriceAlign),
                                                backgroundColor: promoBgColor, padding: (promoBgColor && promoBgColor !== 'transparent') ? 'calc( (8 / 500) * 100cqh )' : '0' 
                                            }}>
                                                <div style={{ fontSize: `calc( (${currentPromoSize} / 500) * 100cqh )`, fontWeight: promoPriceBold ? '950' : '400', color: promoPriceColor, textAlign: promoPriceAlign }}>R$ {(priceValue * 0.8).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                            </div>
                                        )}

                                        <div style={{ 
                                            position: 'absolute', 
                                            left: `${(isPromo ? promoBarcodePos.x : barcodePos.x)}%`, 
                                            top: `${(isPromo ? promoBarcodePos.y : barcodePos.y)}%`, 
                                            width: '100%', 
                                            transform: 'translate(-50%, -50%)', 
                                            opacity: 0.2, 
                                            display: 'flex', 
                                            justifyContent: 'center' 
                                        }}> <i className="bi bi-barcode" style={{ fontSize: '15cqh' }} /> </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-500" onClick={onClose} />
            <div className={`relative bg-white dark:bg-slate-900 w-full ${isDesignMode ? 'max-w-7xl' : 'max-w-5xl'} h-[95vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500`}>
                
                {/* Header Principal */}
                <div className="px-12 py-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"> <i className={`bi bi-${isDesignMode ? 'brush-fill' : 'grid-3x3-gap-fill'} text-2xl`} /> </div>
                        <div> <p className="text-[9px] text-slate-400 uppercase tracking-[0.4em] font-black mb-1">{isDesignMode ? 'Design da Etiqueta' : 'Editar Modelo da Etiqueta'}</p> <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{generatedName}</h3> </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isDesignMode && (
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className={`px-8 py-4 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2`}
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Modelo'}
                            </button>
                        )}
                        {isDesignMode && (
                            <button onClick={() => setIsDesignMode(false)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-4">
                               <i className="bi bi-check-circle-fill" /> Confirmar Design
                            </button>
                        )}
                    </div>
                </div>

                {isDesignMode ? (
                    <>
                        <FixedToolbar />
                        <div 
                            className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start gap-12 select-none" 
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <div 
                                ref={setPreviewRef} 
                                className="relative bg-white rounded-[2rem] shadow-2xl border-4 border-white transition-all duration-500 cursor-default group overflow-visible" 
                                style={{ width: '90%', maxWidth: '700px', height: '500px', backgroundColor: bgColor, containerType: 'size' }} 
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) setSelectedElement(null);
                                }}
                            >
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                {showGuides.h && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/50 z-50 pointer-events-none" />}
                                {showGuides.v && <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/50 z-50 pointer-events-none" />}

                                    {[
                                        { id: 'name', pos: isPromoPreview ? promoNamePos : namePos, width: isPromoPreview ? promoNameWidth : nameWidth, font: isPromoPreview ? promoNameFontSize : nameFontSize, color: isPromoPreview ? promoNameColor : nameColor, bold: isPromoPreview ? promoNameBold : nameBold, align: isPromoPreview ? promoNameAlign : nameAlign, valign: isPromoPreview ? promoNameVAlign : nameVAlign, text: 'Sofá de Canto Luxo Reclinável', bgColor: isPromoPreview ? promoNameBgColor : nameBgColor },
                                        { id: 'price', pos: isPromoPreview ? oldPricePos : pricePos, width: isPromoPreview ? oldPriceWidth : priceWidth, font: (isPromoPreview ? oldPriceFontSize : priceFontSize) + (priceFontSizeThousands || 0), color: isPromoPreview ? oldPriceColor : priceColor, bold: isPromoPreview ? oldPriceBold : priceBold, align: isPromoPreview ? oldPriceAlign : priceAlign, valign: isPromoPreview ? oldPriceVAlign : priceVAlign, text: isPromoPreview ? (
                                            <span className="relative">
                                                {priceFormat === 'split' ? '3.490' : 'R$ 3.490,00'}
                                                <div className="absolute top-[50%] left-[-5%] right-[-5%] h-[4px] bg-red-500 rounded-full opacity-100 shadow-sm" />
                                            </span>
                                        ) : (priceFormat === 'split' ? '3.490' : 'R$ 3.490,00'), bgColor: priceBgColor },
                                        { id: 'promo', pos: promoPos, width: promoWidth, font: promoPriceFontSize + (priceFontSizeThousands || 0), color: promoPriceColor, bold: promoPriceBold, align: promoPriceAlign, valign: promoPriceVAlign, text: priceFormat === 'split' ? '2.990' : 'R$ 2.990,00', hidden: !isPromoPreview, bgColor: promoBgColor },
                                        { id: 'priceSymbol', pos: isPromoPreview ? promoPriceSymbolPos : priceSymbolPos, font: isPromoPreview ? promoPriceSymbolFontSize : priceSymbolFontSize, color: isPromoPreview ? promoPriceSymbolColor : priceSymbolColor, bold: isPromoPreview ? promoPriceSymbolBold : priceSymbolBold, text: 'R$', hidden: priceFormat !== 'split' },
                                        { id: 'priceDecimals', pos: isPromoPreview ? promoPriceDecimalsPos : priceDecimalsPos, font: isPromoPreview ? promoPriceDecimalsFontSize : priceDecimalsFontSize, color: isPromoPreview ? promoPriceDecimalsColor : priceDecimalsColor, bold: isPromoPreview ? promoPriceDecimalsBold : priceDecimalsBold, text: ',00', hidden: priceFormat !== 'split' },
                                                                                                                        { id: 'barcode', pos: isPromoPreview ? promoBarcodePos : barcodePos, width: 80, isBarcode: true },
                                        ...(isPromoPreview ? extraFieldsPromo : extraFields).map(f => ({
                                            id: f.id,
                                            pos: { x: f.x, y: f.y },
                                            width: f.width || 40,
                                            font: f.size,
                                            color: f.color,
                                            bold: f.bold,
                                            align: f.align || 'center',
                                            valign: 'middle',
                                            text: f.text,
                                            hidden: false
                                        }))
                                    ].filter(el => !el.hidden).map((el: any) => (
                                    <div 
                                        key={el.id} 
                                        onMouseDown={(e) => { e.stopPropagation(); setDraggingElement(el.id); setSelectedElement(el.id); }} 
                                        onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
                                        className={`absolute flex cursor-move border-2 group/el ${(draggingElement === el.id || resizingElement === el.id) ? 'z-50' : 'transition-all duration-200 z-10'} ${selectedElement === el.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-slate-300'}`} 
                                        style={{ 
                                            left: `${el.pos.x}%`, 
                                            top: `${el.pos.y}%`, 
                                            width: `${el.width}%`, 
                                            minHeight: el.id === 'barcode' ? '10%' : '40px', 
                                            transform: 'translate(-50%, -50%)', 
                                            backgroundColor: el.bgColor || 'transparent',
                                            padding: (el.bgColor && el.bgColor !== 'transparent') ? 'calc( (8 / 500) * 100cqh )' : '0',
                                            display: 'flex', 
                                            alignItems: el.valign === 'middle' ? 'center' : el.valign === 'bottom' ? 'flex-end' : 'flex-start', 
                                            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        {el.id === 'barcode' ? (
                                            <div className="w-full flex items-center justify-center opacity-40"> <i className="bi bi-barcode text-5xl" /> </div>
                                        ) : (
                                            <div style={{ 
                                                fontSize: `calc( (${el.font} / 500) * 100cqh )`, 
                                                fontWeight: el.bold ? '950' : '400', 
                                                color: el.color, 
                                                textAlign: el.align, 
                                                width: '100%', 
                                                lineHeight: '1.1',
                                                whiteSpace: el.id === 'name' ? 'normal' : 'nowrap',
                                                wordBreak: el.id === 'name' ? 'break-word' : 'normal'
                                            }}> {el.text} </div>
                                        )}
                                        {selectedElement === el.id && el.id !== 'barcode' && (
                                            <>
                                                <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'right', el.width, el.pos.x, el.width)} className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-blue-600 rounded-full cursor-ew-resize border-2 border-white shadow-lg z-50 hover:scale-125 transition-transform" />
                                                <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'left', el.width, el.pos.x, el.width)} className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-blue-600 rounded-full cursor-ew-resize border-2 border-white shadow-lg z-50 hover:scale-125 transition-transform" />
                                                <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'font', el.font, el.pos.x, el.width)} className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-[3px] border-blue-600 rounded-full cursor-nwse-resize shadow-xl z-50 flex items-center justify-center hover:scale-125 transition-transform"> <i className="bi bi-alphabet text-[8px] text-blue-600 font-black" /> </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 flex flex-col gap-8 items-center">
                        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Formato do Papel */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Papel</p>
                                <select value={paperSize} onChange={e => {
                                    const opt = PAPER_OPTIONS.find(o => o.id === e.target.value);
                                    if (opt) { setPaperSize(opt.id); if (opt.id !== 'Custom') { setCustomWidth(opt.w); setCustomHeight(opt.h); } }
                                }} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-black outline-none">
                                    {PAPER_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                                {paperSize === 'Custom' && (
                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                        <input type="number" placeholder="L" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" />
                                        <input type="number" placeholder="H" value={customHeight} onChange={e => setCustomHeight(parseInt(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" />
                                    </div>
                                )}
                            </div>

                            {/* Matriz */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grade de Impressão</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Colunas</label> <input type="number" value={columns} onChange={e => setColumns(parseInt(e.target.value) || 1)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" /> </div>
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Linhas</label> <input type="number" value={rows} onChange={e => setRows(parseInt(e.target.value) || 1)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" /> </div>
                                </div>
                            </div>

                            {/* Espaçamento */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gaps (mm)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Horiz.</label> <input type="number" value={gapH} onChange={e => setGapH(parseInt(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" /> </div>
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Vert.</label> <input type="number" value={gapV} onChange={e => setGapV(parseInt(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" /> </div>
                                </div>
                            </div>

                            {/* Ajuste Automático de Fonte */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Auto-Ajuste de Preço (px)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Centena (3 dígitos)</label> <input type="number" value={priceFontSizeHundreds || 0} onChange={e => setPriceFontSizeHundreds(parseInt(e.target.value))} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black text-blue-600" /> </div>
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Milhar (4 dígitos)</label> <input type="number" value={priceFontSizeThousands || 0} onChange={e => setPriceFontSizeThousands(parseInt(e.target.value))} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black text-blue-600" /> </div>
                                </div>
                                <p className="text-[7px] text-slate-400 italic">Use valores negativos para diminuir a fonte (ex: -10).</p>
                            </div>
                        </div>

                        {/* Botão de Edição de Design */}
                        <div className="relative group shrink-0">
                             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                             <button onClick={() => setIsDesignMode(true)} className="relative px-12 py-6 bg-white dark:bg-slate-900 border-2 border-blue-500/20 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:scale-105 transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"> <i className="bi bi-palette2 text-3xl" /> </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aparência da Etiqueta</p>
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Editar Design Visual</h4>
                                </div>
                                <i className="bi bi-chevron-right text-2xl text-blue-300 ml-4" />
                             </button>
                        </div>

                        {/* Prévia da Folha */}
                        <div className="flex flex-col items-center gap-4 w-full pb-12">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Prévia do modelo em folha inteira</p>
                            <SheetPreviewGrid />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabelGridModelModal;
