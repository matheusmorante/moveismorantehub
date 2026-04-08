import React, { useState } from 'react';
import { toast } from 'react-toastify';

const BOOTSTRAP_ICONS_URL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Libre+Barcode+128&display=swap";

export interface GridModel {
    id: string;
    baseModelId?: string; // ID do modelo padrão original, se este for um override
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
    imageFit?: 'contain' | 'cover' | 'fill';
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
    fontFamily?: string;
    safetyMargin?: number;
    previewImage?: string | null;
}

interface LabelGridModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (model: GridModel) => void;
    editingModel?: GridModel | null;
    currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
    currentType?: 'round' | 'rect';
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

const LabelGridModelModal: React.FC<LabelGridModelModalProps> = ({ isOpen, onClose, onSave, editingModel, currentCategory, currentType, existingModels, previewImage }) => {
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
    const [layoutType, setLayoutType] = useState<'round' | 'rect'>(currentType || 'rect');
    const [safetyMargin, setSafetyMargin] = useState(0);
    const [customPreviewImage, setCustomPreviewImage] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    const [promoFontSize, setPromoFontSize] = useState(9);
    const [promoColor, setPromoColor] = useState('#dc2626');

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
    const [selectedElement, setSelectedElement] = useState<string | null>('name');
    const [editingTextElement, setEditingTextElement] = useState<string | null>(null);
    const [resizingElement, setResizingElement] = useState<string | null>(null);
    const [resizeSide, setResizeSide] = useState<'left' | 'right' | 'font' | null>(null);
    const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
    const [resizeStartValue, setResizeStartValue] = useState(0);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);
    const [resizeStartY, setResizeStartY] = useState(0);
    const [resizeStartHeight, setResizeStartHeight] = useState(0);

    // Estados de Preço Dividido
    const [priceFormat, setPriceFormat] = useState<'standard' | 'split'>('split'); // Default to split as requested
    const [fontFamily, setFontFamily] = useState('Inter');
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
        setSelectedElement(newField.id);
    };

    const duplicateExtraField = (id: string) => {
        const fields = isPromoPreview ? extraFieldsPromo : extraFields;
        const source = fields.find(f => f.id === id);
        if (!source) return;
        
        const newField = {
            ...source,
            id: `extra_${Date.now()}`,
            x: Math.min(95, source.x + 5),
            y: Math.min(95, source.y + 5)
        };
        
        if (isPromoPreview) setExtraFieldsPromo(prev => [...prev, newField]);
        else setExtraFields(prev => [...prev, newField]);
        setSelectedElement(newField.id);
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

    const handleMouseDownResize = (e: React.MouseEvent, element: string, side: 'left' | 'right' | 'font', val: number, currentX: number, currentW: number, currentY: number, currentH: number) => {
        e.stopPropagation(); e.preventDefault();
        setResizingElement(element); setResizeSide(side);
        setResizeStartPos({ x: e.clientX, y: e.clientY }); 
        setResizeStartValue(val);
        setResizeStartX(currentX);
        setResizeStartWidth(currentW);
        setResizeStartY(currentY);
        setResizeStartHeight(currentH);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingElement && !resizingElement) return;
        const rect = previewRef?.getBoundingClientRect();
        if (!rect) return;
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        let newX = Math.max(0, Math.min(100, (targetX / rect.width) * 100));
        let newY = Math.max(0, Math.min(100, (targetY / rect.height) * 100));

        if (resizingElement && resizeSide) {
            const deltaX = e.clientX - resizeStartPos.x; const deltaY = e.clientY - resizeStartPos.y;
            const previewW = rect.width;
            const deltaPX = (deltaX / previewW) * 100;

            if (resizeSide === 'font') {
                const newValue = Math.max(4, resizeStartValue + (deltaY / 2));
                
                if (resizingElement === 'name') { 
                    if (isPromoPreview) { setPromoNameFontSize(newValue); }
                    else { setNameFontSize(newValue); }
                }
                else if (resizingElement === 'mainPrice') { 
                    if (isPromoPreview) { setPromoPriceFontSize(newValue); setPromoFontSize(newValue); } 
                    else { setPriceFontSize(newValue); }
                }
                else if (resizingElement === 'oldPrice') { 
                    setOldPriceFontSize(newValue);
                }
                else if (resizingElement === 'priceSymbol') { 
                    if (isPromoPreview) setPromoPriceSymbolFontSize(newValue); else setPriceSymbolFontSize(newValue); 
                }
                else if (resizingElement === 'priceDecimals') { 
                    if (isPromoPreview) setPromoPriceDecimalsFontSize(newValue); else setPriceDecimalsFontSize(newValue); 
                }
                else if (resizingElement.startsWith('extra_')) {
                    const update = (prev: any[]) => prev.map(f => f.id === resizingElement ? { ...f, size: newValue } : f);
                    if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
                }
            } else if (resizeSide === 'right' || resizeSide === 'left') {
                const isLeft = resizeSide === 'left';
                const FixedEdge = isLeft ? (resizeStartX + resizeStartWidth / 2) : (resizeStartX - resizeStartWidth / 2);
                
                const requestedWidth = isLeft ? (resizeStartWidth - deltaPX) : (resizeStartWidth + deltaPX);
                const maxPossibleWidth = isLeft ? FixedEdge : (100 - FixedEdge);
                
                const newWidth = Math.max(5, Math.min(maxPossibleWidth, requestedWidth));
                const newX = isLeft ? (FixedEdge - newWidth / 2) : (FixedEdge + newWidth / 2);
                
                if (resizingElement === 'name') { 
                    if (isPromoPreview) { setPromoNameWidth(newWidth); setPromoNamePos(p => ({ ...p, x: newX })); }
                    else { setNameWidth(newWidth); setNamePos(p => ({ ...p, x: newX })); }
                }
                else if (resizingElement === 'mainPrice') { 
                    if (isPromoPreview) { setPromoWidth(newWidth); setPromoPos(p => ({ ...p, x: newX })); }
                    else { setPriceWidth(newWidth); setPricePos(p => ({ ...p, x: newX })); }
                }
                else if (resizingElement === 'oldPrice') { 
                    setOldPriceWidth(newWidth); setOldPricePos(p => ({ ...p, x: newX })); 
                }
                else if (resizingElement.startsWith('extra_')) {
                    const update = (prev: any[]) => prev.map(f => f.id === resizingElement ? { ...f, width: newWidth, x: newX } : f);
                    if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
                }
            }
        } else if (draggingElement) {
            const snappedX = (snapEnabled && Math.abs(newX - 50) < 3.5) ? 50 : newX;
            const snappedY = (snapEnabled && Math.abs(newY - 50) < 3.5) ? 50 : newY;
            
            setShowGuides({ 
                h: snapEnabled && snappedX === 50, 
                v: snapEnabled && snappedY === 50 
            });

            // Helper para obter largura/altura atual do elemento arrastado
            const getElemSize = () => {
                if (draggingElement === 'name') return { w: isPromoPreview ? promoNameWidth : nameWidth, h: isPromoPreview ? promoNameHeight : nameHeight };
                if (draggingElement === 'mainPrice') return { w: isPromoPreview ? promoWidth : priceWidth, h: isPromoPreview ? promoHeight : priceHeight };
                if (draggingElement === 'oldPrice') return { w: oldPriceWidth, h: oldPriceHeight };
                if (draggingElement === 'barcode') return { w: 80, h: 15 };
                if (draggingElement?.startsWith('extra_')) {
                    const f = (isPromoPreview ? extraFieldsPromo : extraFields).find(field => field.id === draggingElement);
                    return { w: f?.width || 40, h: f?.height || 10 };
                }
                return { w: 10, h: 10 };
            };

            const size = getElemSize();
            const minX = size.w / 2;
            const maxX = 100 - (size.w / 2);
            const minY = size.h / 2;
            const maxY = 100 - (size.h / 2);

            const finalX = Math.max(minX, Math.min(maxX, snappedX));
            const finalY = Math.max(minY, Math.min(maxY, snappedY));

            if (draggingElement === 'name') {
                if (isPromoPreview) { setPromoNamePos({ x: finalX, y: finalY }); } else { setNamePos({ x: finalX, y: finalY }); }
            } else if (draggingElement === 'mainPrice') {
                if (isPromoPreview) { setPromoPos({ x: finalX, y: finalY }); } else { setPricePos({ x: finalX, y: finalY }); }
            } else if (draggingElement === 'oldPrice') { 
                setOldPricePos({ x: finalX, y: finalY }); 
            }
            else if (draggingElement === 'barcode') {
                if (isPromoPreview) { setPromoBarcodePos({ x: finalX, y: finalY }); } else { setBarcodePos({ x: finalX, y: finalY }); }
            }
            else if (draggingElement === 'priceSymbol') {
                // Símbolo e decimais não têm largura fixa no designer, vamos usar 10% como margem de segurança
                const sX = Math.max(5, Math.min(95, snappedX));
                const sY = Math.max(5, Math.min(95, snappedY));
                if (isPromoPreview) setPromoPriceSymbolPos({ x: sX, y: sY }); else setPriceSymbolPos({ x: sX, y: sY });
            }
            else if (draggingElement === 'priceDecimals') {
                const sX = Math.max(5, Math.min(95, snappedX));
                const sY = Math.max(5, Math.min(95, snappedY));
                if (isPromoPreview) setPromoPriceDecimalsPos({ x: sX, y: sY }); else setPriceDecimalsPos({ x: sX, y: sY });
            }
            else if (draggingElement.startsWith('extra_')) {
                const update = (prev: any[]) => prev.map(f => f.id === draggingElement ? { ...f, x: finalX, y: finalY } : f);
                if (isPromoPreview) setExtraFieldsPromo(update); else setExtraFields(update);
            }
        }
    };

    const handleMouseUp = () => { setDraggingElement(null); setResizingElement(null); setShowGuides({ h: false, v: false }); };

    React.useEffect(() => {
        if (draggingElement || resizingElement) { 
            window.addEventListener('mouseup', handleMouseUp); 
            return () => window.removeEventListener('mouseup', handleMouseUp); 
        }
    }, [draggingElement, resizingElement]);

    React.useEffect(() => {
        if (isOpen) {
            setIsDesignMode(false); 
            if (editingModel) {
                setLayoutType(editingModel.type || 'rect');
                setPaperSize(editingModel.paperSize); setColumns(editingModel.columns); setRows(editingModel.rows);
                setMarginT(editingModel.marginT); setMarginB(editingModel.marginB); setMarginL(editingModel.marginL); setMarginR(editingModel.marginR);
                setGapH(editingModel.gapH); setGapV(editingModel.gapV);
                if (editingModel.bg_color !== undefined) setBgColor(editingModel.bg_color);
                if (editingModel.nameFontSize !== undefined) setNameFontSize(editingModel.nameFontSize);
                if (editingModel.nameColor !== undefined) setNameColor(editingModel.nameColor);
                if (editingModel.nameBold !== undefined) setNameBold(editingModel.nameBold);
                if (editingModel.nameAlign !== undefined) setNameAlign(editingModel.nameAlign);
                if (editingModel.nameVAlign !== undefined) setNameVAlign(editingModel.nameVAlign);
                if (editingModel.priceFontSize !== undefined) setPriceFontSize(editingModel.priceFontSize);
                if (editingModel.priceColor !== undefined) setPriceColor(editingModel.priceColor);
                if (editingModel.priceBold !== undefined) setPriceBold(editingModel.priceBold);
                if (editingModel.priceAlign !== undefined) setPriceAlign(editingModel.priceAlign);
                if (editingModel.priceVAlign !== undefined) setPriceVAlign(editingModel.priceVAlign);
                if (editingModel.promoPriceFontSize !== undefined) setPromoPriceFontSize(editingModel.promoPriceFontSize);
                if (editingModel.promoPriceColor !== undefined) setPromoPriceColor(editingModel.promoPriceColor);
                if (editingModel.promoPriceBold !== undefined) setPromoPriceBold(editingModel.promoPriceBold);
                if (editingModel.promoPriceAlign !== undefined) setPromoPriceAlign(editingModel.promoPriceAlign);
                if (editingModel.promoPriceVAlign !== undefined) setPromoPriceVAlign(editingModel.promoPriceVAlign);
                
                if (editingModel.oldPriceColor !== undefined) setOldPriceColor(editingModel.oldPriceColor);
                if (editingModel.oldPriceFontSize !== undefined) setOldPriceFontSize(editingModel.oldPriceFontSize);
                if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
                if (editingModel.oldPriceAlign !== undefined) setOldPriceAlign(editingModel.oldPriceAlign);
                if (editingModel.oldPriceVAlign !== undefined) setOldPriceVAlign(editingModel.oldPriceVAlign);
                if (editingModel.nameWidth !== undefined) setNameWidth(editingModel.nameWidth);
                if (editingModel.nameHeight) setNameHeight(editingModel.nameHeight);
                if (editingModel.priceWidth) setPriceWidth(editingModel.priceWidth);
                if (editingModel.priceHeight) setPriceHeight(editingModel.priceHeight);
                if (editingModel.promoWidth) setPromoWidth(editingModel.promoWidth);
                if (editingModel.promoHeight) setPromoHeight(editingModel.promoHeight);
                if (editingModel.priceFontSizeTens) setPriceFontSizeTens(editingModel.priceFontSizeTens);
                if (editingModel.priceFontSizeHundreds) setPriceFontSizeHundreds(editingModel.priceFontSizeHundreds);
                if (editingModel.priceFontSizeThousands) setPriceFontSizeThousands(editingModel.priceFontSizeThousands);
                if (editingModel.priceFontSizeTenThousands) setPriceFontSizeTenThousands(editingModel.priceFontSizeTenThousands);
                if (editingModel.promoFontSize) setPromoFontSize(editingModel.promoFontSize);
                if (editingModel.promoColor) setPromoColor(editingModel.promoColor);
                if (editingModel.bg_color) setBgColor(editingModel.bg_color);
                if (editingModel.nameBgColor) setNameBgColor(editingModel.nameBgColor);
                if (editingModel.priceBgColor) setPriceBgColor(editingModel.priceBgColor);
                if (editingModel.promoBgColor) setPromoBgColor(editingModel.promoBgColor);

                setNamePos({ x: editingModel.namePosX ?? 50, y: editingModel.namePosY ?? 30 });
                setPricePos({ x: editingModel.pricePosX ?? 50, y: editingModel.pricePosY ?? 60 });
                setPromoPos({ x: editingModel.promoPosX ?? 50, y: editingModel.promoPosY ?? 75 });
                setBarcodePos({ x: editingModel.barcodePosX ?? 50, y: editingModel.barcodePosY ?? 90 });

                setPriceFormat(editingModel.priceFormat || 'split');
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
                if (editingModel.fontFamily) setFontFamily(editingModel.fontFamily);
                if (editingModel.priceFormat) setPriceFormat(editingModel.priceFormat);
                if (editingModel.safetyMargin !== undefined) setSafetyMargin(editingModel.safetyMargin);
                if (editingModel.previewImage) setCustomPreviewImage(editingModel.previewImage);

                // Carregar Split Price Promoção
                if (editingModel.promoPriceSymbolPosX !== undefined) setPromoPriceSymbolPos({ x: editingModel.promoPriceSymbolPosX, y: editingModel.promoPriceSymbolPosY ?? 70 });
                if (editingModel.promoPriceSymbolFontSize) setPromoPriceSymbolFontSize(editingModel.promoPriceSymbolFontSize);
                if (editingModel.promoPriceSymbolColor) setPromoPriceSymbolColor(editingModel.promoPriceSymbolColor);
                if (editingModel.promoPriceSymbolBold !== undefined) setPromoPriceSymbolBold(editingModel.promoPriceSymbolBold);

                if (editingModel.promoPriceDecimalsPosX !== undefined) setPromoPriceDecimalsPos({ x: editingModel.promoPriceDecimalsPosX, y: editingModel.promoPriceDecimalsPosY ?? 70 });
                if (editingModel.promoPriceDecimalsFontSize) setPromoPriceDecimalsFontSize(editingModel.promoPriceDecimalsFontSize);
                if (editingModel.promoPriceDecimalsColor) setPromoPriceDecimalsColor(editingModel.promoPriceDecimalsColor);
                if (editingModel.promoPriceDecimalsBold !== undefined) setPromoPriceDecimalsBold(editingModel.promoPriceDecimalsBold);
            } else {
                setLayoutType(currentType || 'rect');
                // Reset para padrões ao criar novo
                setName('');
                setPaperSize('A4');
                setColumns(3); setRows(7);
                setMarginT(10); setMarginB(10); setMarginL(10); setMarginR(10);
                setGapH(2); setGapV(2);
                setBgColor('#ffffff');
                setNamePos({ x: 50, y: 30 });
                setPricePos({ x: 50, y: 60 });
                setPromoPos({ x: 50, y: 75 });
                setBarcodePos({ x: 50, y: 90 });
                setExtraFields([]);
                setExtraFieldsPromo([]);
                if (currentCategory === 'precos') {
                    setExtraFields([{
                        id: `extra_default`,
                        text: 'DESCRIÇÃO EXTRA',
                        x: 50, y: 45, size: 8, color: '#64748b', bold: false, align: 'center', width: 60, height: 10, bgColor: 'transparent'
                    }]);
                }
            }
        }
    }, [isOpen, editingModel, currentType, currentCategory]);

    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const newModel: GridModel = {
                id: editingModel?.id || `custom_${Date.now()}`,
                name: generatedName, 
                columns: columns, 
                rows: rows, 
                marginT: marginT, 
                marginB: marginB, 
                marginL: marginL, 
                marginR: marginR, 
                gapH: gapH, 
                gapV: gapV, 
                paperSize: paperSize,
                paperWidth: paperSize === 'Custom' ? customWidth : undefined, 
                paperHeight: paperSize === 'Custom' ? customHeight : undefined,
                icon: layoutType === 'round' ? 'bi-circle' : 'bi-grid-fill', 
                category: editingModel?.category || (currentCategory as any) || 'identificacao',
                type: layoutType, 
                nameFontSize: nameFontSize, 
                nameColor: nameColor, 
                nameBold: nameBold, 
                nameAlign: nameAlign, 
                nameVAlign: nameVAlign,
                priceFontSize: priceFontSize, 
                priceColor: priceColor, 
                priceBold: priceBold, 
                priceAlign: priceAlign, 
                priceVAlign: priceVAlign,
                promoFontSize: promoFontSize, 
                promoColor: promoColor,
                promoPriceFontSize: promoPriceFontSize, 
                promoPriceColor: promoPriceColor, 
                promoPriceBold: promoPriceBold, 
                promoPriceAlign: promoPriceAlign, 
                promoPriceVAlign: promoPriceVAlign,
                oldPriceFontSize: oldPriceFontSize, 
                oldPriceColor: oldPriceColor, 
                oldPriceBold: oldPriceBold, 
                oldPriceAlign: oldPriceAlign, 
                oldPriceVAlign: oldPriceVAlign,
                namePosX: namePos.x, 
                namePosY: namePos.y, 
                pricePosX: pricePos.x, 
                pricePosY: pricePos.y, 
                promoPosX: promoPos.x, 
                promoPosY: promoPos.y, 
                barcodePosX: barcodePos.x, 
                barcodePosY: barcodePos.y,
                nameWidth: nameWidth, 
                nameHeight: nameHeight, 
                priceWidth: priceWidth, 
                priceHeight: priceHeight, 
                promoWidth: promoWidth, 
                promoHeight: promoHeight,
                priceFontSizeTens: priceFontSizeTens,
                priceFontSizeHundreds: priceFontSizeHundreds,
                priceFontSizeThousands: priceFontSizeThousands,
                priceFontSizeTenThousands: priceFontSizeTenThousands,
                bg_color: bgColor,
                nameBgColor: nameBgColor,
                priceBgColor: priceBgColor,
                promoBgColor: promoBgColor,
                priceFormat: priceFormat,
                priceSymbolFontSize: priceSymbolFontSize,
                priceSymbolColor: priceSymbolColor,
                priceSymbolBold: priceSymbolBold,
                priceSymbolPosX: priceSymbolPos.x,
                priceSymbolPosY: priceSymbolPos.y,
                priceDecimalsFontSize: priceDecimalsFontSize,
                priceDecimalsColor: priceDecimalsColor,
                priceDecimalsBold: priceDecimalsBold,
                priceDecimalsPosX: priceDecimalsPos.x,
                priceDecimalsPosY: priceDecimalsPos.y,
                promoNamePosX: promoNamePos.x,
                promoNamePosY: promoNamePos.y,
                promoNameFontSize: promoNameFontSize,
                promoNameAlign: promoNameAlign,
                promoNameVAlign: promoNameVAlign,
                promoNameColor: promoNameColor,
                promoNameBold: promoNameBold,
                promoNameWidth: promoNameWidth,
                promoNameHeight: promoNameHeight,
                promoNameBgColor: promoNameBgColor,
                oldPricePosX: oldPricePos.x,
                oldPricePosY: oldPricePos.y,
                oldPriceWidth: oldPriceWidth,
                oldPriceHeight: oldPriceHeight,
                promoBarcodePosX: promoBarcodePos.x,
                promoBarcodePosY: promoBarcodePos.y,
                extraFields: extraFields,
                extraFieldsPromo: extraFieldsPromo,
                fontFamily: fontFamily,
                // Split Price Promoção no Modelo
                promoPriceSymbolPosX: promoPriceSymbolPos.x, 
                promoPriceSymbolPosY: promoPriceSymbolPos.y,
                promoPriceSymbolFontSize: promoPriceSymbolFontSize, 
                promoPriceSymbolColor: promoPriceSymbolColor,
                promoPriceSymbolBold: promoPriceSymbolBold,
                promoPriceDecimalsPosX: promoPriceDecimalsPos.x, 
                promoPriceDecimalsPosY: promoPriceDecimalsPos.y,
                promoPriceDecimalsFontSize: promoPriceDecimalsFontSize, 
                promoPriceDecimalsColor: promoPriceDecimalsColor,
                promoPriceDecimalsBold: promoPriceDecimalsBold,
                safetyMargin: safetyMargin,
                previewImage: customPreviewImage
            };
            await onSave(newModel);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Métodos de Estilo Unificados (Acessíveis pelo Toolbar e Edição Inline)
    const isInactive = !selectedElement;
    const isText = selectedElement && selectedElement !== 'barcode';
    
    const getActiveValue = () => {
        if (selectedElement === 'name') return { font: nameFontSize, color: nameColor, bold: nameBold, align: nameAlign, valign: nameVAlign, text: 'Sofá de Canto Luxo Reclinável' };
        if (selectedElement === 'mainPrice') {
            if (isPromoPreview) return { font: promoPriceFontSize, color: promoPriceColor, bold: promoPriceBold, align: promoPriceAlign, valign: promoPriceVAlign, text: '2.990' };
            return { font: priceFontSize, color: priceColor, bold: priceBold, align: priceAlign, valign: priceVAlign, text: '3.490' };
        }
        if (selectedElement === 'oldPrice') return { font: oldPriceFontSize, color: oldPriceColor, bold: oldPriceBold, align: oldPriceAlign, valign: oldPriceVAlign, text: '3.490' };
        if (selectedElement === 'priceSymbol') {
            if (isPromoPreview) return { font: promoPriceSymbolFontSize, color: promoPriceSymbolColor, bold: promoPriceSymbolBold, align: 'center' as const, valign: 'middle' as const, text: 'R$' };
            return { font: priceSymbolFontSize, color: priceSymbolColor, bold: priceSymbolBold, align: 'center' as const, valign: 'middle' as const, text: 'R$' };
        }
        if (selectedElement === 'priceDecimals') {
            if (isPromoPreview) return { font: promoPriceDecimalsFontSize, color: promoPriceDecimalsColor, bold: promoPriceDecimalsBold, align: 'center' as const, valign: 'middle' as const, text: ',00' };
            return { font: priceDecimalsFontSize, color: priceDecimalsColor, bold: priceDecimalsBold, align: 'center' as const, valign: 'middle' as const, text: ',00' };
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
                    selectedElement === 'mainPrice' ? (isPromoPreview ? promoBgColor : priceBgColor) :
                    selectedElement === 'oldPrice' ? 'transparent' :
                    (selectedElement === 'priceSymbol' || selectedElement === 'priceDecimals') ? (isPromoPreview ? promoBgColor : priceBgColor) : 'transparent';

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
        } else if (selectedElement === 'mainPrice') {
             if (isPromoPreview) {
                if (key === 'color') setPromoPriceColor(val); if (key === 'size') { setPromoPriceFontSize(val); setPromoFontSize(val); } if (key === 'bold') setPromoPriceBold(val);
                if (key === 'align') setPromoPriceAlign(val); if (key === 'valign') setPromoPriceVAlign(val);
                if (key === 'bg') setPromoBgColor(val);
             } else {
                if (key === 'color') setPriceColor(val); if (key === 'size') setPriceFontSize(val); if (key === 'bold') setPriceBold(val);
                if (key === 'align') setPriceAlign(val); if (key === 'valign') setPriceVAlign(val);
                if (key === 'bg') setPriceBgColor(val);
             }
        } else if (selectedElement === 'oldPrice') {
            if (key === 'color') setOldPriceColor(val); if (key === 'size') setOldPriceFontSize(val); if (key === 'bold') setOldPriceBold(val);
            if (key === 'align') setOldPriceAlign(val); if (key === 'valign') setOldPriceVAlign(val);
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
            if (isPromoPreview) setExtraFieldsPromo(update);
            else setExtraFields(update);
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

    // Componente da Barra de Ferramentas Fixa (Header do Designer com Scroll)
    const FixedToolbar = () => {
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
                        {(selectedElement === 'mainPrice' || selectedElement === 'oldPrice') && (
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

                        <button onClick={cycleVAlign} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-sm flex flex-col items-center gap-1 group">
                             <i className={`bi bi-align-${activeVAlign === 'middle' ? 'center' : activeVAlign} text-slate-600`} />
                             <span className="text-[7px] font-black uppercase text-slate-400 group-hover:text-blue-500">Vert</span>
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2" />

                    {/* Seletor de Fonte */}
                    <div className="flex items-center gap-2">
                        <i className="bi bi-fonts text-slate-400" />
                        <select 
                            value={fontFamily} 
                            onChange={e => setFontFamily(e.target.value)}
                            className="bg-slate-50 border-none text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px]"
                        >
                            <option value="Inter">Inter (Padrão)</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Oswald">Oswald</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Playfair Display">Playfair</option>
                            <option value="Bebas Neue">Bebas Neue</option>
                            <option value="Libre Barcode 128">Barcode Font</option>
                        </select>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2" />

                    {/* Toggle de Preço Separado */}
                    {selectedElement === 'mainPrice' && (
                        <div className="flex items-center gap-2 bg-blue-50/50 p-1 rounded-2xl border border-blue-100">
                            <span className="text-[8px] font-black text-blue-600 uppercase px-3">Preço: {priceFormat === 'split' ? 'Separado' : 'Unificado'}</span>
                            <button 
                                onClick={() => setPriceFormat(prev => prev === 'split' ? 'standard' : 'split')}
                                className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${priceFormat === 'split' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 hover:bg-blue-100'}`}
                            >
                                {priceFormat === 'split' ? 'Mudar p/ Unificado' : 'Mudar p/ Separado'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                     <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selecionado</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 truncate max-w-[120px]">
                            {selectedElement === 'name' ? 'Produto' : selectedElement === 'mainPrice' ? 'Preço Principal' : selectedElement === 'oldPrice' ? 'Preço Antigo' : selectedElement === 'priceSymbol' ? 'Símbolo R$' : selectedElement === 'priceDecimals' ? 'Centavos' : 'Nenhum'}
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

    const effectivePreviewImage = customPreviewImage || previewImage;

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
            <div className="flex flex-col items-center gap-6 w-full">
                {/* Botão de Upload de Exemplo */}
                <div className="w-full max-w-4xl flex items-center justify-between">
                   <div className="flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Conteúdo de Amostra</p>
                        <p className="text-[7px] text-slate-400 italic">Escolha uma imagem para pré-visualizar o layout da folha.</p>
                   </div>
                   <div className="flex items-center gap-3">
                        {customPreviewImage && (
                            <button 
                                onClick={() => setCustomPreviewImage(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[8px] font-black uppercase transition-all"
                            >
                                <i className="bi bi-trash3 mr-2" /> Limpar
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (re) => setCustomPreviewImage(re.target?.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-3"
                        >
                            <i className="bi bi-image-fill" /> {customPreviewImage ? 'Trocar Amostra' : 'Escolher Amostra'}
                        </button>
                   </div>
                </div>

                <div className="relative bg-white shadow-2xl border-4 border-white overflow-hidden flex flex-col" style={{ width: `${previewW}px`, height: `${previewH}px`, padding: `${marginT/2}px ${marginR/2}px ${marginB/2}px ${marginL/2}px` }}>
                    {/* Camada de Fundo (Backgrounds) */}
                    <div 
                        className="flex-1 grid" 
                        style={{ 
                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                            columnGap: `${gapH/2}px`,
                            rowGap: `${gapV/2}px`
                        }}
                    >
                        {Array.from({ length: columns * rows }).map((_, i) => (
                            <div key={i} className="relative flex items-center justify-center overflow-visible">
                                <div style={{ 
                                    position: 'absolute',
                                    width: `calc(100% + ${(safetyMargin / (w / previewW)) * 2}px)`,
                                    height: `calc(100% + ${(safetyMargin / (w / previewW)) * 2}px)`,
                                    backgroundColor: bgColor || 'white',
                                    zIndex: 0
                                }}>
                                    {effectivePreviewImage && (
                                        <img 
                                            src={effectivePreviewImage} 
                                            alt="" 
                                            style={{ 
                                                position: 'absolute', 
                                                inset: 0, 
                                                width: '100%', 
                                                height: '100%', 
                                                objectFit: 'cover', 
                                                opacity: 1 // Amostra com 100% de opacidade na prévia da folha
                                            }} 
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Camada de Bordas (Sobrepostas e visíveis umas sobre as outras) */}
                    <div 
                        className="absolute grid pointer-events-none" 
                        style={{ 
                            inset: `${marginT/2}px ${marginR/2}px ${marginB/2}px ${marginL/2}px`,
                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                            columnGap: `${gapH/2}px`,
                            rowGap: `${gapV/2}px`
                        }}
                    >
                        {Array.from({ length: columns * rows }).map((_, i) => {
                            const safetyPx = (safetyMargin / (w / previewW));
                            return (
                                <div key={i} className="relative flex items-center justify-center overflow-visible">
                                    {/* Borda de Sangria (Azul) - Desenha por cima de tudo */}
                                    <div style={{ 
                                        position: 'absolute',
                                        width: `calc(100% + ${safetyPx * 2}px)`,
                                        height: `calc(100% + ${safetyPx * 2}px)`,
                                        border: safetyMargin > 0 ? '0.8px dashed #3b82f6' : 'none',
                                        zIndex: 10
                                    }} />
                                    
                                    {/* Borda da Etiqueta (Cinza) */}
                                    <div className={`relative border border-slate-400 overflow-hidden ${layoutType === 'round' ? 'rounded-full' : ''}`} 
                                         style={{ width: '100%', height: '100%', zIndex: 5 }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
            <link rel="stylesheet" href={BOOTSTRAP_ICONS_URL} />
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-500" onClick={onClose} />
            <div className={`relative bg-white dark:bg-slate-900 w-full ${isDesignMode ? 'max-w-7xl' : 'max-w-5xl'} h-[95vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500`}>
                
                {/* Header Principal */}
                <div className="px-12 py-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"> <i className={`bi bi-${isDesignMode ? 'brush-fill' : 'grid-3x3-gap-fill'} text-2xl`} /> </div>
                        <div> 
                            <div className="flex items-center gap-3 mb-1">
                                <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black leading-none">
                                    {isDesignMode ? 'Design da Etiqueta' : 'Editar Modelo de Etiqueta'}
                                </p>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest leading-none">
                                    Margens: {marginT}|{marginB}|{marginL}|{marginR} - Gaps: {gapH}|{gapV} (mm)
                                </p>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{name || 'Editar Modelo de Etiqueta'}</h3> 
                        </div>
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
                        {FixedToolbar()}
                        <div className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start gap-12 select-none">
                            {/* Visualização da Etiqueta Interativa */}
                            <div className="relative flex-1 flex flex-col items-center justify-center p-4">
                                {(() => {
                                    const paperW = customWidth || 210;
                                    const paperH = customHeight || 297;
                                    const cols = columns || 1;
                                    const rowCount = rows || 1;
                                    const totalGapW = (gapH || 0) * (cols - 1);
                                    const totalGapH = (gapV || 0) * (rowCount - 1);
                                    const totalMarginsW = (marginL || 0) + (marginR || 0);
                                    const totalMarginsH = (marginT || 0) + (marginB || 0);
                                    const labelW = (paperW - totalMarginsW - totalGapW) / cols;
                                    const labelH = (paperH - totalMarginsH - totalGapH) / rowCount;
                                    const aspectRatio = labelW / labelH;

                                    return (
                                        <div className="relative flex items-center justify-center">
                                            {/* Área de Sangria Interativa (Azul) - Prioridade Visual para a Imagem */}
                                            <div style={{
                                                position: 'absolute',
                                                width: `${500 + ((safetyMargin * 500) / labelW) * 2}px`,
                                                height: `${(500 / (aspectRatio || 1)) + ((safetyMargin * (500 / aspectRatio)) / labelH) * 2}px`,
                                                border: safetyMargin > 0 ? '2px dashed #3b82f6' : 'none',
                                                backgroundColor: bgColor || 'white',
                                                zIndex: 0,
                                                borderRadius: '8px',
                                                overflow: 'hidden' // Importante para a imagem respeitar a área de sangria
                                            }}>
                                                {effectivePreviewImage && (
                                                    <img 
                                                        src={effectivePreviewImage} 
                                                        alt="" 
                                                        style={{ 
                                                            position: 'absolute', 
                                                            inset: 0, 
                                                            width: '100%', 
                                                            height: '100%', 
                                                            objectFit: 'cover' 
                                                        }} 
                                                    />
                                                )}
                                            </div>

                                            <div 
                                                ref={setPreviewRef}
                                                style={{ 
                                                    width: '500px', 
                                                    height: `${500 / (aspectRatio || 1)}px`,
                                                    backgroundColor: 'transparent', 
                                                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
                                                    position: 'relative', 
                                                    overflow: 'hidden', 
                                                    containerType: 'size', 
                                                    border: '1px solid #94a3b8', 
                                                    borderRadius: '4px',
                                                    zIndex: 1
                                                }}
                                                onMouseMove={handleMouseMove}
                                                onMouseUp={handleMouseUp}
                                                onMouseLeave={handleMouseUp}
                                            >
                                            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                            {showGuides.h && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/50 z-50 pointer-events-none" />}
                                            {showGuides.v && <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/50 z-50 pointer-events-none" />}

                                            {[
                                                { id: 'name', pos: isPromoPreview ? promoNamePos : namePos, width: isPromoPreview ? promoNameWidth : nameWidth, height: isPromoPreview ? promoNameHeight : nameHeight, font: isPromoPreview ? promoNameFontSize : nameFontSize, color: isPromoPreview ? promoNameColor : nameColor, bold: isPromoPreview ? promoNameBold : nameBold, align: isPromoPreview ? promoNameAlign : nameAlign, valign: isPromoPreview ? promoNameVAlign : nameVAlign, text: 'Sofá de Canto Luxo Reclinável', bgColor: isPromoPreview ? promoNameBgColor : nameBgColor },
                                                { 
                                                    id: 'mainPrice', 
                                                    pos: isPromoPreview ? promoPos : pricePos, 
                                                    width: isPromoPreview ? promoWidth : priceWidth, 
                                                    height: isPromoPreview ? promoHeight : priceHeight, 
                                                    font: (isPromoPreview ? (promoPriceFontSize || 0) : (priceFontSize || 0)) + (priceFontSizeThousands || 0), 
                                                    color: isPromoPreview ? promoPriceColor : priceColor, 
                                                    bold: isPromoPreview ? promoPriceBold : priceBold, 
                                                    align: isPromoPreview ? promoPriceAlign : priceAlign, 
                                                    valign: isPromoPreview ? promoPriceVAlign : priceVAlign, 
                                                    text: isPromoPreview ? '2.990' : '3.490', 
                                                    bgColor: isPromoPreview ? promoBgColor : priceBgColor 
                                                },
                                                { 
                                                    id: 'oldPrice', 
                                                    pos: oldPricePos, 
                                                    width: oldPriceWidth, 
                                                    height: oldPriceHeight, 
                                                    font: oldPriceFontSize, 
                                                    color: oldPriceColor, 
                                                    bold: oldPriceBold, 
                                                    align: oldPriceAlign, 
                                                    valign: oldPriceVAlign, 
                                                    text: (
                                                        <span className="relative">
                                                            R$ 3.490,00
                                                            <div className="absolute top-[50%] left-[-5%] right-[-5%] h-[4px] bg-red-500 rounded-full" />
                                                        </span>
                                                    ),
                                                    hidden: !isPromoPreview,
                                                    bgColor: 'transparent'
                                                },
                                                { id: 'priceSymbol', pos: isPromoPreview ? promoPriceSymbolPos : priceSymbolPos, font: isPromoPreview ? (promoPriceSymbolFontSize || 0) : (priceSymbolFontSize || 0), color: isPromoPreview ? promoPriceSymbolColor : priceSymbolColor, bold: isPromoPreview ? promoPriceSymbolBold : priceSymbolBold, text: 'R$', hidden: priceFormat !== 'split' },
                                                { id: 'priceDecimals', pos: isPromoPreview ? promoPriceDecimalsPos : priceDecimalsPos, font: isPromoPreview ? (promoPriceDecimalsFontSize || 0) : (priceDecimalsFontSize || 0), color: isPromoPreview ? promoPriceDecimalsColor : priceDecimalsColor, bold: isPromoPreview ? promoPriceDecimalsBold : priceDecimalsBold, text: ',00', hidden: priceFormat !== 'split' },
                                                ...(currentCategory !== 'precos' ? [{ id: 'barcode', pos: isPromoPreview ? promoBarcodePos : barcodePos, width: 80, isBarcode: true }] : []),
                                                ...(isPromoPreview ? (extraFieldsPromo || []) : (extraFields || [])).map(f => ({ id: f.id, pos: { x: f.x, y: f.y }, width: f.width || 40, height: f.height || 10, font: f.size, color: f.color, bold: f.bold, align: f.align || 'center', valign: 'middle', text: f.text, hidden: false, bgColor: f.bgColor }))
                                            ].filter(el => !el.hidden).map((el: any) => (
                                                <div 
                                                    key={el.id} 
                                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingElement(el.id); setSelectedElement(el.id); }} 
                                                    className={`absolute flex cursor-move border group/el ${(draggingElement === el.id || resizingElement === el.id) ? 'z-50' : 'transition-all duration-200 z-10'} ${selectedElement === el.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-slate-300'}`} 
                                                    style={{ 
                                                        left: `${el.pos.x}%`, top: `${el.pos.y}%`, width: `${el.width}%`, height: el.isBarcode ? '15%' : 'max-content', transform: 'translate(-50%, -50%)', 
                                                        padding: el.isBarcode ? '0' : '4px',
                                                        backgroundColor: el.bgColor || 'transparent', fontFamily: fontFamily || 'Inter', display: 'flex', 
                                                        alignItems: el.valign === 'bottom' ? 'flex-end' : el.valign === 'top' ? 'flex-start' : 'center', 
                                                        justifyContent: el.align === 'right' ? 'flex-end' : el.align === 'left' ? 'flex-start' : 'center',
                                                        overflow: 'visible'
                                                    }}
                                                >
                                                    {el.id === 'barcode' ? (
                                                        <div className="w-full flex items-center justify-center opacity-40"> <i className="bi bi-barcode text-5xl" /> </div>
                                                    ) : (
                                                        <div onDoubleClick={() => { if (el.id.startsWith('extra_') || el.id === 'name') setEditingTextElement(el.id); }} style={{ fontSize: `calc( (${el.font} / 500) * 100cqh )`, fontWeight: el.bold ? '950' : '400', color: el.color, textAlign: el.align, width: '100%', lineHeight: '1.1', whiteSpace: el.id === 'name' ? 'normal' : 'nowrap', wordBreak: el.id === 'name' ? 'break-word' : 'normal' }}> 
                                                            {editingTextElement === el.id ? (
                                                                <input autoFocus value={el.text} onChange={e => updateStyle('text', e.target.value)} onBlur={() => setEditingTextElement(null)} onKeyDown={e => { if (e.key === 'Enter') setEditingTextElement(null); }} className="w-full bg-blue-500/10 border-none outline-none text-center rounded ring-4 ring-blue-500/20" style={{ fontSize: 'inherit', color: 'inherit', fontWeight: 'inherit', textAlign: 'inherit' }} />
                                                            ) : el.text} 
                                                        </div>
                                                    )}
                                                    
                                                    {selectedElement === el.id && el.id.startsWith('extra_') && (
                                                        <div className="absolute -top-4 -right-4 z-[200]">
                                                            <div className="relative group/menu">
                                                                <button className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"> <i className="bi bi-three-dots-vertical text-xs" /> </button>
                                                                <div className="absolute top-0 left-full ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl opacity-0 scale-90 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:scale-100 group-hover/menu:pointer-events-auto transition-all flex flex-col min-w-[120px]">
                                                                    <button onClick={(e) => { e.stopPropagation(); duplicateExtraField(el.id); }} className="w-full px-4 py-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors flex items-center gap-3"> <i className="bi bi-copy text-[10px]" /> <span className="text-[8px] font-black uppercase">Duplicar</span> </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); removeExtraField(el.id); }} className="w-full px-4 py-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors flex items-center gap-3"> <i className="bi bi-trash3-fill text-[10px]" /> <span className="text-[8px] font-black uppercase">Excluir</span> </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedElement === el.id && el.id !== 'barcode' && (
                                                        <>
                                                            {/* Alças de Largura (Laterais Ampliadas) */}
                                                            <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'right', el.font, el.pos.x, el.width, el.pos.y, el.height ?? 10)} className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize z-50 flex items-center justify-center"> <div className="w-1.5 h-8 bg-blue-600 rounded-full border border-white" /> </div>
                                                            <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'left', el.font, el.pos.x, el.width, el.pos.y, el.height ?? 10)} className="absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize z-50 flex items-center justify-center"> <div className="w-1.5 h-8 bg-blue-600 rounded-full border border-white" /> </div>
                                                            
                                                            {/* NOVO: Alça de Fonte (Borda Inferior) */}
                                                            <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'font', el.font, el.pos.x, el.width, el.pos.y, el.height ?? 10)} className="absolute -bottom-2 left-0 right-0 h-4 cursor-ns-resize z-[51] flex flex-col items-center justify-center">
                                                                <div className="w-1/2 h-1 bg-blue-600 rounded-full" />
                                                                <div className="text-[6px] font-black text-blue-600 uppercase mt-0.5 bg-white/80 px-1 rounded">Fonte</div>
                                                            </div>
 
                                                            {/* Alça de Canto */}
                                                            <div onMouseDown={(e) => handleMouseDownResize(e, el.id, 'font', el.font, el.pos.x, el.width, el.pos.y, el.height ?? 10)} className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-[3px] border-blue-600 rounded-full cursor-nwse-resize shadow-xl z-[52] flex items-center justify-center hover:scale-125 transition-transform"> <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Lista Horizontal de Elementos */}
                            <div className="w-full max-w-4xl flex items-center gap-2 overflow-x-auto pb-4 px-2 no-scrollbar shrink-0">
                                {[
                                    { id: 'name', label: 'Produto', icon: 'bi-type-h1', hidden: false },
                                    { id: 'mainPrice', label: 'Preço Principal', icon: 'bi-currency-dollar', hidden: false },
                                    { id: 'oldPrice', label: 'Preço Antigo', icon: 'bi-type-strikethrough', hidden: !isPromoPreview },
                                    { id: 'priceSymbol', label: 'Símbolo R$', icon: 'bi-coin', hidden: currentCategory !== 'precos' },
                                    { id: 'priceDecimals', label: 'Centavos', icon: 'bi-percent', hidden: currentCategory !== 'precos' },
                                    ...(currentCategory !== 'precos' ? [{ id: 'barcode', label: 'Código Barras', icon: 'bi-barcode', hidden: false }] : []),
                                    ...(isPromoPreview ? (extraFieldsPromo || []) : (extraFields || [])).map(f => ({ id: f.id, label: f.text, icon: 'bi-fonts', hidden: false }))
                                ].filter(i => !i.hidden).map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => setSelectedElement(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap text-[9px] font-black uppercase transition-all shadow-sm shrink-0 ${selectedElement === item.id ? 'bg-blue-600 text-white translate-y-[-2px] shadow-blue-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100'}`}
                                    >
                                        <i className={item.icon} /> {item.label}
                                    </button>
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
                                        <input type="number" step="0.1" placeholder="L" value={customWidth} onChange={e => setCustomWidth(parseFloat(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" />
                                        <input type="number" step="0.1" placeholder="H" value={customHeight} onChange={e => setCustomHeight(parseFloat(e.target.value) || 0)} className="w-full bg-slate-100 rounded-xl p-3 text-center font-black" />
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

                            {/* Espaçamento (Gaps) */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Distância entre Etiquetas (Gaps mm)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Horizontal</label> <input type="number" step="0.1" value={gapH} onChange={e => setGapH(parseFloat(e.target.value) || 0)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center font-black" /> </div>
                                    <div> <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Vertical</label> <input type="number" step="0.1" value={gapV} onChange={e => setGapV(parseFloat(e.target.value) || 0)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center font-black" /> </div>
                                </div>
                            </div>

                            {/* Margem de Segurança (Sangria) */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Margem de Segurança (Sangria)</p>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">+{safetyMargin}mm</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="10" 
                                        step="0.1" 
                                        value={safetyMargin} 
                                        onChange={e => setSafetyMargin(parseFloat(e.target.value))} 
                                        className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                                    />
                                </div>
                                <p className="text-[7px] text-slate-400 italic">Aumenta o tamanho da imagem da etiqueta para evitar bordas brancas se a impressora estiver desalinhada.</p>
                            </div>

                            {/* Margens do Papel */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4 lg:col-span-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Margens do Papel (Sangria mm)</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"> 
                                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Topo (T)</label> 
                                        <input type="number" step="0.1" value={marginT} onChange={e => setMarginT(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-center font-black text-blue-600 outline-none" /> 
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"> 
                                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Base (B)</label> 
                                        <input type="number" step="0.1" value={marginB} onChange={e => setMarginB(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-center font-black text-blue-600 outline-none" /> 
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"> 
                                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Esq. (L)</label> 
                                        <input type="number" step="0.1" value={marginL} onChange={e => setMarginL(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-center font-black text-blue-600 outline-none" /> 
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"> 
                                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Dir. (R)</label> 
                                        <input type="number" step="0.1" value={marginR} onChange={e => setMarginR(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-center font-black text-blue-600 outline-none" /> 
                                    </div>
                                </div>
                                <p className="text-[7px] text-slate-400 italic text-center">Para modelos 1x1 (térmicos), deixe todos em 0 para não ter bordas brancas.</p>
                            </div>

                        </div>

                        {/* Botão de Edição de Design (Oculto no Modo Logos) */}
                        {currentCategory !== 'logos' && (
                            <div className="relative group shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                                <button onClick={() => setIsDesignMode(true)} className="relative px-12 py-6 bg-white dark:bg-slate-900 border-2 border-blue-500/20 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:scale-105 transition-all">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"> <i className="bi bi-palette2 text-3xl" /> </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aparência da Etiqueta</p>
                                        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Editar Design Visual</h4>
                                    </div>
                                    <i className="bi bi-chevron-right text-2xl text-blue-300 ml-4" />
                                </button>
                            </div>
                        )}

                        {/* Prévia da Folha */}
                        <div className="flex flex-col items-center gap-4 w-full pb-12">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Prévia do modelo em folha inteira</p>
                            {SheetPreviewGrid()}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LabelGridModelModal;
