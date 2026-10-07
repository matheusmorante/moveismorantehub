import React, { useState } from 'react';
import { LabelGridSheetPreview } from '../components/LabelGridSheetPreview';
import { createGridModelFromEditorState } from '../services/labelGridModelFactory';
import { LabelGridModelToolbar } from './label-grid-model-editor/LabelGridModelToolbar';
import { LabelGridModelSettingsPanel } from './label-grid-model-editor/LabelGridModelSettingsPanel';
import { LabelGridModelCanvasElement } from './label-grid-model-editor/LabelGridModelCanvasElement';
import type { LabelGridModelCanvasElementData } from './label-grid-model-editor/LabelGridModelCanvasElement';
import { LabelGridModelElementSelector } from './label-grid-model-editor/LabelGridModelElementSelector';

const BOOTSTRAP_ICONS_URL =
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Libre+Barcode+128&display=swap';

import type { GridModel } from '../types/LabelGridModelTypes';
export type { GridModel } from '../types/LabelGridModelTypes';

interface LabelGridModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: GridModel) => void;
  editingModel?: GridModel | null;
  currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
  currentType?: 'round' | 'rect';
  previewImage?: string | null;
}

const PAPER_OPTIONS = [
  { id: 'A4', name: 'Folha A4 (210x297mm)', w: 210, h: 297 },
  { id: 'A3', name: 'Folha A3 (297x420mm)', w: 297, h: 420 },
  { id: 'A5', name: 'Folha A5 (148x210mm)', w: 148, h: 210 },
  { id: 'Letter', name: 'Carta (216x279mm)', w: 216, h: 279 },
  { id: 'Custom', name: 'Tamanho Personalizado', w: 0, h: 0 },
];

const LabelGridModelModal: React.FC<LabelGridModelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingModel,
  currentCategory,
  currentType,
  previewImage,
}) => {
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

  const [imageScale, setImageScale] = useState(1);
  const [customPreviewImage, setCustomPreviewImage] = useState<string | null>(null);

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
  const [priceFontSizeThousands, setPriceFontSizeThousands] = useState<number | undefined>(
    undefined
  );
  const [priceFontSizeTenThousands, setPriceFontSizeTenThousands] = useState<number | undefined>(
    undefined
  );

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
      bgColor: 'transparent',
    };
    if (isPromoPreview) setExtraFieldsPromo((prev) => [...prev, newField]);
    else setExtraFields((prev) => [...prev, newField]);
    setSelectedElement(newField.id);
  };

  const duplicateExtraField = (id: string) => {
    const fields = isPromoPreview ? extraFieldsPromo : extraFields;
    const source = fields.find((f) => f.id === id);
    if (!source) return;

    const newField = {
      ...source,
      id: `extra_${Date.now()}`,
      x: Math.min(95, source.x + 5),
      y: Math.min(95, source.y + 5),
    };

    if (isPromoPreview) setExtraFieldsPromo((prev) => [...prev, newField]);
    else setExtraFields((prev) => [...prev, newField]);
    setSelectedElement(newField.id);
  };

  const removeExtraField = (id: string) => {
    if (isPromoPreview) setExtraFieldsPromo((prev) => prev.filter((f) => f.id !== id));
    else setExtraFields((prev) => prev.filter((f) => f.id !== id));
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
  const generatedName =
    currentCategory === 'logos'
      ? `${columns * rows} Etiquetas (${formatLabel}) (${columns}x${rows})`
      : `${columns * rows} ${columns * rows === 1 ? 'Etiqueta' : 'Etiquetas'} (${columns}x${rows})`;

  const handleMouseDownResize = (
    e: React.MouseEvent,
    element: string,
    side: 'left' | 'right' | 'font',
    val: number,
    currentX: number,
    currentW: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingElement(element);
    setResizeSide(side);
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
    const newX = Math.max(0, Math.min(100, (targetX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, (targetY / rect.height) * 100));

    if (resizingElement && resizeSide) {
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      const previewW = rect.width;
      const deltaPX = (deltaX / previewW) * 100;

      if (resizeSide === 'font') {
        const newValue = Math.max(4, resizeStartValue + deltaY / 2);

        if (resizingElement === 'name') {
          if (isPromoPreview) {
            setPromoNameFontSize(newValue);
          } else {
            setNameFontSize(newValue);
          }
        } else if (resizingElement === 'mainPrice') {
          if (isPromoPreview) {
            setPromoPriceFontSize(newValue);
            setPromoFontSize(newValue);
          } else {
            setPriceFontSize(newValue);
          }
        } else if (resizingElement === 'oldPrice') {
          setOldPriceFontSize(newValue);
        } else if (resizingElement === 'priceSymbol') {
          if (isPromoPreview) setPromoPriceSymbolFontSize(newValue);
          else setPriceSymbolFontSize(newValue);
        } else if (resizingElement === 'priceDecimals') {
          if (isPromoPreview) setPromoPriceDecimalsFontSize(newValue);
          else setPriceDecimalsFontSize(newValue);
        } else if (resizingElement.startsWith('extra_')) {
          const update = (prev: any[]) =>
            prev.map((f) => (f.id === resizingElement ? { ...f, size: newValue } : f));
          if (isPromoPreview) setExtraFieldsPromo(update);
          else setExtraFields(update);
        }
      } else if (resizeSide === 'right' || resizeSide === 'left') {
        const isLeft = resizeSide === 'left';
        const FixedEdge = isLeft
          ? resizeStartX + resizeStartWidth / 2
          : resizeStartX - resizeStartWidth / 2;

        const requestedWidth = isLeft ? resizeStartWidth - deltaPX : resizeStartWidth + deltaPX;
        const maxPossibleWidth = isLeft ? FixedEdge : 100 - FixedEdge;

        const newWidth = Math.max(5, Math.min(maxPossibleWidth, requestedWidth));
        const newX = isLeft ? FixedEdge - newWidth / 2 : FixedEdge + newWidth / 2;

        if (resizingElement === 'name') {
          if (isPromoPreview) {
            setPromoNameWidth(newWidth);
            setPromoNamePos((p) => ({ ...p, x: newX }));
          } else {
            setNameWidth(newWidth);
            setNamePos((p) => ({ ...p, x: newX }));
          }
        } else if (resizingElement === 'mainPrice') {
          if (isPromoPreview) {
            setPromoWidth(newWidth);
            setPromoPos((p) => ({ ...p, x: newX }));
          } else {
            setPriceWidth(newWidth);
            setPricePos((p) => ({ ...p, x: newX }));
          }
        } else if (resizingElement === 'oldPrice') {
          setOldPriceWidth(newWidth);
          setOldPricePos((p) => ({ ...p, x: newX }));
        } else if (resizingElement.startsWith('extra_')) {
          const update = (prev: any[]) =>
            prev.map((f) => (f.id === resizingElement ? { ...f, width: newWidth, x: newX } : f));
          if (isPromoPreview) setExtraFieldsPromo(update);
          else setExtraFields(update);
        }
      }
    } else if (draggingElement) {
      const snappedX = snapEnabled && Math.abs(newX - 50) < 3.5 ? 50 : newX;
      const snappedY = snapEnabled && Math.abs(newY - 50) < 3.5 ? 50 : newY;

      setShowGuides({
        h: snapEnabled && snappedX === 50,
        v: snapEnabled && snappedY === 50,
      });

      // Helper para obter largura/altura atual do elemento arrastado
      const getElemSize = () => {
        if (draggingElement === 'name')
          return {
            w: isPromoPreview ? promoNameWidth : nameWidth,
            h: isPromoPreview ? promoNameHeight : nameHeight,
          };
        if (draggingElement === 'mainPrice')
          return {
            w: isPromoPreview ? promoWidth : priceWidth,
            h: isPromoPreview ? promoHeight : priceHeight,
          };
        if (draggingElement === 'oldPrice') return { w: oldPriceWidth, h: oldPriceHeight };
        if (draggingElement === 'barcode') return { w: 80, h: 15 };
        if (draggingElement?.startsWith('extra_')) {
          const f = (isPromoPreview ? extraFieldsPromo : extraFields).find(
            (field) => field.id === draggingElement
          );
          return { w: f?.width || 40, h: f?.height || 10 };
        }
        return { w: 10, h: 10 };
      };

      const size = getElemSize();
      const minX = size.w / 2;
      const maxX = 100 - size.w / 2;
      const minY = size.h / 2;
      const maxY = 100 - size.h / 2;

      const finalX = Math.max(minX, Math.min(maxX, snappedX));
      const finalY = Math.max(minY, Math.min(maxY, snappedY));

      if (draggingElement === 'name') {
        if (isPromoPreview) {
          setPromoNamePos({ x: finalX, y: finalY });
        } else {
          setNamePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'mainPrice') {
        if (isPromoPreview) {
          setPromoPos({ x: finalX, y: finalY });
        } else {
          setPricePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'oldPrice') {
        setOldPricePos({ x: finalX, y: finalY });
      } else if (draggingElement === 'barcode') {
        if (isPromoPreview) {
          setPromoBarcodePos({ x: finalX, y: finalY });
        } else {
          setBarcodePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'priceSymbol') {
        // Símbolo e decimais não têm largura fixa no designer, vamos usar 10% como margem de segurança
        const sX = Math.max(5, Math.min(95, snappedX));
        const sY = Math.max(5, Math.min(95, snappedY));
        if (isPromoPreview) setPromoPriceSymbolPos({ x: sX, y: sY });
        else setPriceSymbolPos({ x: sX, y: sY });
      } else if (draggingElement === 'priceDecimals') {
        const sX = Math.max(5, Math.min(95, snappedX));
        const sY = Math.max(5, Math.min(95, snappedY));
        if (isPromoPreview) setPromoPriceDecimalsPos({ x: sX, y: sY });
        else setPriceDecimalsPos({ x: sX, y: sY });
      } else if (draggingElement.startsWith('extra_')) {
        const update = (prev: any[]) =>
          prev.map((f) => (f.id === draggingElement ? { ...f, x: finalX, y: finalY } : f));
        if (isPromoPreview) setExtraFieldsPromo(update);
        else setExtraFields(update);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setResizingElement(null);
    setShowGuides({ h: false, v: false });
  };

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
        setName(editingModel.name || '');
        setLayoutType(editingModel.type || 'rect');
        setPaperSize(editingModel.paperSize);
        setColumns(editingModel.columns);
        setRows(editingModel.rows);
        setMarginT(editingModel.marginT);
        setMarginB(editingModel.marginB);
        setMarginL(editingModel.marginL);
        setMarginR(editingModel.marginR);
        setGapH(editingModel.gapH);
        setGapV(editingModel.gapV);
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
        if (editingModel.promoPriceFontSize !== undefined)
          setPromoPriceFontSize(editingModel.promoPriceFontSize);
        if (editingModel.promoPriceColor !== undefined)
          setPromoPriceColor(editingModel.promoPriceColor);
        if (editingModel.promoPriceBold !== undefined)
          setPromoPriceBold(editingModel.promoPriceBold);
        if (editingModel.promoPriceAlign !== undefined)
          setPromoPriceAlign(editingModel.promoPriceAlign);
        if (editingModel.promoPriceVAlign !== undefined)
          setPromoPriceVAlign(editingModel.promoPriceVAlign);

        if (editingModel.oldPriceColor !== undefined) setOldPriceColor(editingModel.oldPriceColor);
        if (editingModel.oldPriceFontSize !== undefined)
          setOldPriceFontSize(editingModel.oldPriceFontSize);
        if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
        if (editingModel.oldPriceAlign !== undefined) setOldPriceAlign(editingModel.oldPriceAlign);
        if (editingModel.oldPriceVAlign !== undefined)
          setOldPriceVAlign(editingModel.oldPriceVAlign);
        if (editingModel.nameWidth !== undefined) setNameWidth(editingModel.nameWidth);
        if (editingModel.nameHeight) setNameHeight(editingModel.nameHeight);
        if (editingModel.priceWidth) setPriceWidth(editingModel.priceWidth);
        if (editingModel.priceHeight) setPriceHeight(editingModel.priceHeight);
        if (editingModel.promoWidth) setPromoWidth(editingModel.promoWidth);
        if (editingModel.promoHeight) setPromoHeight(editingModel.promoHeight);
        if (editingModel.priceFontSizeTens) setPriceFontSizeTens(editingModel.priceFontSizeTens);
        if (editingModel.priceFontSizeHundreds)
          setPriceFontSizeHundreds(editingModel.priceFontSizeHundreds);
        if (editingModel.priceFontSizeThousands)
          setPriceFontSizeThousands(editingModel.priceFontSizeThousands);
        if (editingModel.priceFontSizeTenThousands)
          setPriceFontSizeTenThousands(editingModel.priceFontSizeTenThousands);
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
        if (editingModel.priceSymbolFontSize)
          setPriceSymbolFontSize(editingModel.priceSymbolFontSize);
        if (editingModel.priceSymbolColor) setPriceSymbolColor(editingModel.priceSymbolColor);
        if (editingModel.priceSymbolBold !== undefined)
          setPriceSymbolBold(editingModel.priceSymbolBold);
        setPriceSymbolPos({
          x: editingModel.priceSymbolPosX ?? 35,
          y: editingModel.priceSymbolPosY ?? 55,
        });

        if (editingModel.priceDecimalsFontSize)
          setPriceDecimalsFontSize(editingModel.priceDecimalsFontSize);
        if (editingModel.priceDecimalsColor) setPriceDecimalsColor(editingModel.priceDecimalsColor);
        if (editingModel.priceDecimalsBold !== undefined)
          setPriceDecimalsBold(editingModel.priceDecimalsBold);
        setPriceDecimalsPos({
          x: editingModel.priceDecimalsPosX ?? 65,
          y: editingModel.priceDecimalsPosY ?? 55,
        });

        // Carregar Estados Promocionais
        setPromoNamePos({
          x: editingModel.promoNamePosX ?? 50,
          y: editingModel.promoNamePosY ?? 25,
        });
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

        setPromoBarcodePos({
          x: editingModel.promoBarcodePosX ?? 50,
          y: editingModel.promoBarcodePosY ?? 85,
        });
        if (editingModel.extraFields) setExtraFields(editingModel.extraFields);

        if (editingModel.extraFieldsPromo) setExtraFieldsPromo(editingModel.extraFieldsPromo);
        if (editingModel.fontFamily) setFontFamily(editingModel.fontFamily);
        if (editingModel.priceFormat) setPriceFormat(editingModel.priceFormat);

        if (editingModel.imageScale !== undefined) setImageScale(editingModel.imageScale);
        if (editingModel.previewImage) setCustomPreviewImage(editingModel.previewImage);

        // Carregar Split Price Promoção
        if (editingModel.promoPriceSymbolPosX !== undefined)
          setPromoPriceSymbolPos({
            x: editingModel.promoPriceSymbolPosX,
            y: editingModel.promoPriceSymbolPosY ?? 70,
          });
        if (editingModel.promoPriceSymbolFontSize)
          setPromoPriceSymbolFontSize(editingModel.promoPriceSymbolFontSize);
        if (editingModel.promoPriceSymbolColor)
          setPromoPriceSymbolColor(editingModel.promoPriceSymbolColor);
        if (editingModel.promoPriceSymbolBold !== undefined)
          setPromoPriceSymbolBold(editingModel.promoPriceSymbolBold);

        if (editingModel.promoPriceDecimalsPosX !== undefined)
          setPromoPriceDecimalsPos({
            x: editingModel.promoPriceDecimalsPosX,
            y: editingModel.promoPriceDecimalsPosY ?? 70,
          });
        if (editingModel.promoPriceDecimalsFontSize)
          setPromoPriceDecimalsFontSize(editingModel.promoPriceDecimalsFontSize);
        if (editingModel.promoPriceDecimalsColor)
          setPromoPriceDecimalsColor(editingModel.promoPriceDecimalsColor);
        if (editingModel.promoPriceDecimalsBold !== undefined)
          setPromoPriceDecimalsBold(editingModel.promoPriceDecimalsBold);
      } else {
        setLayoutType(currentType || 'rect');
        // Reset para padrões ao criar novo
        setName('');
        setPaperSize('A4');
        setColumns(3);
        setRows(7);
        setMarginT(10);
        setMarginB(10);
        setMarginL(10);
        setMarginR(10);
        setGapH(2);
        setGapV(2);
        setBgColor('#ffffff');
        setNamePos({ x: 50, y: 30 });
        setPricePos({ x: 50, y: 60 });
        setPromoPos({ x: 50, y: 75 });
        setBarcodePos({ x: 50, y: 90 });
        setExtraFields([]);
        setExtraFieldsPromo([]);
        if (currentCategory === 'precos') {
          setExtraFields([
            {
              id: `extra_default`,
              text: 'DESCRIÇÃO EXTRA',
              x: 50,
              y: 45,
              size: 8,
              color: '#64748b',
              bold: false,
              align: 'center',
              width: 60,
              height: 10,
              bgColor: 'transparent',
            },
          ]);
        }
      }
    }
  }, [isOpen, editingModel, currentType, currentCategory]);

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newModel = createGridModelFromEditorState({
        editingModel,
        name,
        generatedName,
        currentCategory,
        columns,
        rows,
        marginT,
        marginB,
        marginL,
        marginR,
        gapH,
        gapV,
        paperSize,
        customWidth,
        customHeight,
        layoutType,
        nameFontSize,
        nameColor,
        nameBold,
        nameAlign,
        nameVAlign,
        priceFontSize,
        priceColor,
        priceBold,
        priceAlign,
        priceVAlign,
        promoFontSize,
        promoColor,
        promoPriceFontSize,
        promoPriceColor,
        promoPriceBold,
        promoPriceAlign,
        promoPriceVAlign,
        oldPriceFontSize,
        oldPriceColor,
        oldPriceBold,
        oldPriceAlign,
        oldPriceVAlign,
        namePos,
        pricePos,
        promoPos,
        barcodePos,
        nameWidth,
        nameHeight,
        priceWidth,
        priceHeight,
        promoWidth,
        promoHeight,
        priceFontSizeTens,
        priceFontSizeHundreds,
        priceFontSizeThousands,
        priceFontSizeTenThousands,
        bg_color: bgColor,
        nameBgColor,
        priceBgColor,
        promoBgColor,
        priceFormat,
        priceSymbolFontSize,
        priceSymbolColor,
        priceSymbolBold,
        priceSymbolPos,
        priceDecimalsFontSize,
        priceDecimalsColor,
        priceDecimalsBold,
        priceDecimalsPos,
        promoNamePos,
        promoNameFontSize,
        promoNameAlign,
        promoNameVAlign,
        promoNameColor,
        promoNameBold,
        promoNameWidth,
        promoNameHeight,
        promoNameBgColor,
        oldPricePos,
        oldPriceWidth,
        oldPriceHeight,
        promoBarcodePos,
        extraFields,
        extraFieldsPromo,
        fontFamily,
        promoPriceSymbolPos,
        promoPriceSymbolFontSize,
        promoPriceSymbolColor,
        promoPriceSymbolBold,
        promoPriceDecimalsPos,
        promoPriceDecimalsFontSize,
        promoPriceDecimalsColor,
        promoPriceDecimalsBold,
        imageScale,
        customPreviewImage,
      });
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
    if (selectedElement === 'name')
      return {
        font: nameFontSize,
        color: nameColor,
        bold: nameBold,
        align: nameAlign,
        valign: nameVAlign,
        text: 'Sofá de Canto Luxo Reclinável',
      };
    if (selectedElement === 'mainPrice') {
      if (isPromoPreview)
        return {
          font: promoPriceFontSize,
          color: promoPriceColor,
          bold: promoPriceBold,
          align: promoPriceAlign,
          valign: promoPriceVAlign,
          text: '2.990',
        };
      return {
        font: priceFontSize,
        color: priceColor,
        bold: priceBold,
        align: priceAlign,
        valign: priceVAlign,
        text: '3.490',
      };
    }
    if (selectedElement === 'oldPrice')
      return {
        font: oldPriceFontSize,
        color: oldPriceColor,
        bold: oldPriceBold,
        align: oldPriceAlign,
        valign: oldPriceVAlign,
        text: '3.490',
      };
    if (selectedElement === 'priceSymbol') {
      if (isPromoPreview)
        return {
          font: promoPriceSymbolFontSize,
          color: promoPriceSymbolColor,
          bold: promoPriceSymbolBold,
          align: 'center' as const,
          valign: 'middle' as const,
          text: 'R$',
        };
      return {
        font: priceSymbolFontSize,
        color: priceSymbolColor,
        bold: priceSymbolBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: 'R$',
      };
    }
    if (selectedElement === 'priceDecimals') {
      if (isPromoPreview)
        return {
          font: promoPriceDecimalsFontSize,
          color: promoPriceDecimalsColor,
          bold: promoPriceDecimalsBold,
          align: 'center' as const,
          valign: 'middle' as const,
          text: ',00',
        };
      return {
        font: priceDecimalsFontSize,
        color: priceDecimalsColor,
        bold: priceDecimalsBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: ',00',
      };
    }
    if (selectedElement?.toString().startsWith('extra_')) {
      const fields = isPromoPreview ? extraFieldsPromo : extraFields;
      const f = fields.find((field) => field.id === selectedElement);
      if (f)
        return {
          font: f.size,
          color: f.color,
          bold: f.bold,
          align: f.align || 'center',
          valign: 'middle' as const,
          text: f.text,
        };
    }
    return {
      font: 0,
      color: '#ccc',
      bold: false,
      align: 'center' as const,
      valign: 'middle' as const,
      text: '',
    };
  };

  const active = getActiveValue();
  const activeColor = isText ? active.color : '#ccc';
  const activeSize = isText ? active.font : 0;
  const activeBold = isText ? active.bold : false;
  const activeAlign = isText ? active.align : 'center';
  const activeVAlign = isText ? active.valign : 'middle';

  const activeBg = !selectedElement
    ? bgColor
    : selectedElement === 'name'
      ? isPromoPreview
        ? promoNameBgColor
        : nameBgColor
      : selectedElement === 'mainPrice'
        ? isPromoPreview
          ? promoBgColor
          : priceBgColor
        : selectedElement === 'oldPrice'
          ? 'transparent'
          : selectedElement === 'priceSymbol' || selectedElement === 'priceDecimals'
            ? isPromoPreview
              ? promoBgColor
              : priceBgColor
            : 'transparent';

  const updateStyle = (key: string, val: any) => {
    if (!selectedElement) {
      if (key === 'bg') setBgColor(val);
      return;
    }
    if (selectedElement === 'name') {
      if (isPromoPreview) {
        if (key === 'color') setPromoNameColor(val);
        if (key === 'size') setPromoNameFontSize(val);
        if (key === 'bold') setPromoNameBold(val);
        if (key === 'align') setPromoNameAlign(val);
        if (key === 'valign') setPromoNameVAlign(val);
        if (key === 'bg') setPromoNameBgColor(val);
      } else {
        if (key === 'color') setNameColor(val);
        if (key === 'size') setNameFontSize(val);
        if (key === 'bold') setNameBold(val);
        if (key === 'align') setNameAlign(val);
        if (key === 'valign') setNameVAlign(val);
        if (key === 'bg') setNameBgColor(val);
      }
    } else if (selectedElement === 'mainPrice') {
      if (isPromoPreview) {
        if (key === 'color') setPromoPriceColor(val);
        if (key === 'size') {
          setPromoPriceFontSize(val);
          setPromoFontSize(val);
        }
        if (key === 'bold') setPromoPriceBold(val);
        if (key === 'align') setPromoPriceAlign(val);
        if (key === 'valign') setPromoPriceVAlign(val);
        if (key === 'bg') setPromoBgColor(val);
      } else {
        if (key === 'color') setPriceColor(val);
        if (key === 'size') setPriceFontSize(val);
        if (key === 'bold') setPriceBold(val);
        if (key === 'align') setPriceAlign(val);
        if (key === 'valign') setPriceVAlign(val);
        if (key === 'bg') setPriceBgColor(val);
      }
    } else if (selectedElement === 'oldPrice') {
      if (key === 'color') setOldPriceColor(val);
      if (key === 'size') setOldPriceFontSize(val);
      if (key === 'bold') setOldPriceBold(val);
      if (key === 'align') setOldPriceAlign(val);
      if (key === 'valign') setOldPriceVAlign(val);
    } else if (selectedElement === 'priceSymbol') {
      if (isPromoPreview) {
        if (key === 'color') setPromoPriceSymbolColor(val);
        if (key === 'size') setPromoPriceSymbolFontSize(val);
        if (key === 'bold') setPromoPriceSymbolBold(val);
      } else {
        if (key === 'color') setPriceSymbolColor(val);
        if (key === 'size') setPriceSymbolFontSize(val);
        if (key === 'bold') setPriceSymbolBold(val);
      }
      if (key === 'bg') setPriceBgColor(val);
    } else if (selectedElement === 'priceDecimals') {
      if (isPromoPreview) {
        if (key === 'color') setPromoPriceDecimalsColor(val);
        if (key === 'size') setPromoPriceDecimalsFontSize(val);
        if (key === 'bold') setPromoPriceDecimalsBold(val);
      } else {
        if (key === 'color') setPriceDecimalsColor(val);
        if (key === 'size') setPriceDecimalsFontSize(val);
        if (key === 'bold') setPriceDecimalsBold(val);
      }
      if (key === 'bg') setPriceBgColor(val);
    } else if (selectedElement?.toString().startsWith('extra_')) {
      const update = (prev: any[]) =>
        prev.map((f) => {
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
    const next: Record<string, 'left' | 'center' | 'right'> = {
      left: 'center',
      center: 'right',
      right: 'left',
    };
    updateStyle('align', next[activeAlign]);
  };

  const cycleVAlign = () => {
    const next: Record<string, 'top' | 'middle' | 'bottom'> = {
      top: 'middle',
      middle: 'bottom',
      bottom: 'top',
    };
    updateStyle('valign', next[activeVAlign]);
  };

  const effectivePreviewImage = customPreviewImage || previewImage || null;
  const selectedPaper = PAPER_OPTIONS.find((option) => option.id === paperSize) || PAPER_OPTIONS[0];
  const toolbarState = {
    isInactive,
    isDesignMode,
    isPromoPreview,
    selectedElement,
    activeBackground: activeBg,
    snapEnabled,
    showColorPalette,
    activeColor,
    activeSize,
    activeBold,
    activeAlign,
    activeVerticalAlign: activeVAlign,
    priceFontSizes: {
      tens: priceFontSizeTens,
      hundreds: priceFontSizeHundreds,
      thousands: priceFontSizeThousands,
      tenThousands: priceFontSizeTenThousands,
    },
    fontFamily,
    priceFormat,
  };
  const toolbarHandlers = {
    onExitDesignMode: () => setIsDesignMode(false),
    onChangePreviewMode: (promo: boolean) => {
      setIsPromoPreview(promo);
      setSelectedElement(null);
    },
    onAddExtraField: addExtraField,
    onUpdateStyle: updateStyle,
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onToggleColorPalette: setShowColorPalette,
    onPriceFontSizeChange: (
      scale: 'tens' | 'hundreds' | 'thousands' | 'tenThousands',
      value: number
    ) => {
      if (scale === 'tens') setPriceFontSizeTens(value);
      else if (scale === 'hundreds') setPriceFontSizeHundreds(value);
      else if (scale === 'thousands') setPriceFontSizeThousands(value);
      else setPriceFontSizeTenThousands(value);
    },
    onCycleAlign: cycleAlign,
    onCycleVerticalAlign: cycleVAlign,
    onFontFamilyChange: setFontFamily,
    onTogglePriceFormat: () =>
      setPriceFormat((prev) => (prev === 'split' ? 'standard' : 'split')),
    onClearSelection: () => setSelectedElement(null),
  };
  const settingsPanelState = {
    name,
    generatedName,
    paperSize,
    paperOptions: PAPER_OPTIONS,
    customWidth,
    customHeight,
    columns,
    rows,
    imageScale,
    gapH,
    gapV,
    marginT,
    marginB,
    marginL,
    marginR,
  };
  const settingsPanelHandlers = {
    onNameChange: setName,
    onPaperSizeChange: (value: string) => {
      const option = PAPER_OPTIONS.find((candidate) => candidate.id === value);
      if (option) {
        setPaperSize(option.id);
        if (option.id !== 'Custom') {
          setCustomWidth(option.w);
          setCustomHeight(option.h);
        }
      }
    },
    onCustomWidthChange: setCustomWidth,
    onCustomHeightChange: setCustomHeight,
    onColumnsChange: setColumns,
    onRowsChange: setRows,
    onDecreaseImageScale: () =>
      setImageScale((prev) => Math.max(0.1, parseFloat((prev - 0.01).toFixed(2)))),
    onImageScaleChange: setImageScale,
    onIncreaseImageScale: () =>
      setImageScale((prev) => Math.min(10, parseFloat((prev + 0.01).toFixed(2)))),
    onGapHChange: setGapH,
    onGapVChange: setGapV,
    onMarginTChange: setMarginT,
    onMarginBChange: setMarginB,
    onMarginLChange: setMarginL,
    onMarginRChange: setMarginR,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-grid-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
    >
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <link rel="stylesheet" href={BOOTSTRAP_ICONS_URL} />
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-500 border-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar editor de grade de etiqueta"
      />
      <div
        className={`relative bg-white dark:bg-slate-900 w-full ${isDesignMode ? 'max-w-7xl' : 'max-w-5xl'} h-[95vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500`}
      >
        {/* Header Principal */}
        <div className="px-12 py-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              {' '}
              <i
                className={`bi bi-${isDesignMode ? 'brush-fill' : 'grid-3x3-gap-fill'} text-2xl`}
              />{' '}
            </div>
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
              <h3
                id="label-grid-modal-title"
                className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none"
              >
                {name.trim() || generatedName}
              </h3>
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
              <button
                onClick={() => setIsDesignMode(false)}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-4"
              >
                <i className="bi bi-check-circle-fill" /> Confirmar Design
              </button>
            )}
          </div>
        </div>

        {isDesignMode ? (
          <>
            <LabelGridModelToolbar state={toolbarState} handlers={toolbarHandlers} />
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
                      <div
                        style={{
                          position: 'absolute',
                          width: '500px',
                          height: `${500 / (aspectRatio || 1)}px`,
                          backgroundColor: bgColor || 'white',
                          zIndex: 0,
                          borderRadius: '8px',
                          overflow: 'visible', // Permitir ver o transbordo no designer
                        }}
                      >
                        {effectivePreviewImage && (
                          <img
                            src={effectivePreviewImage}
                            alt=""
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transform: `translate(-50%, -50%) scale(${imageScale})`,
                              transition: 'transform 0.1s ease-out',
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
                          zIndex: 1,
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.05] pointer-events-none"
                          style={{
                            backgroundImage:
                              'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }}
                        />
                        {showGuides.h && (
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/50 z-50 pointer-events-none" />
                        )}
                        {showGuides.v && (
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/50 z-50 pointer-events-none" />
                        )}

                        {[
                          {
                            id: 'name',
                            pos: isPromoPreview ? promoNamePos : namePos,
                            width: isPromoPreview ? promoNameWidth : nameWidth,
                            height: isPromoPreview ? promoNameHeight : nameHeight,
                            font: isPromoPreview ? promoNameFontSize : nameFontSize,
                            color: isPromoPreview ? promoNameColor : nameColor,
                            bold: isPromoPreview ? promoNameBold : nameBold,
                            align: isPromoPreview ? promoNameAlign : nameAlign,
                            valign: isPromoPreview ? promoNameVAlign : nameVAlign,
                            text: 'Sofá de Canto Luxo Reclinável',
                            bgColor: isPromoPreview ? promoNameBgColor : nameBgColor,
                          },
                          {
                            id: 'mainPrice',
                            pos: isPromoPreview ? promoPos : pricePos,
                            width: isPromoPreview ? promoWidth : priceWidth,
                            height: isPromoPreview ? promoHeight : priceHeight,
                            font:
                              (isPromoPreview ? promoPriceFontSize || 0 : priceFontSize || 0) +
                              (priceFontSizeThousands || 0),
                            color: isPromoPreview ? promoPriceColor : priceColor,
                            bold: isPromoPreview ? promoPriceBold : priceBold,
                            align: isPromoPreview ? promoPriceAlign : priceAlign,
                            valign: isPromoPreview ? promoPriceVAlign : priceVAlign,
                            text: isPromoPreview ? '2.990' : '3.490',
                            bgColor: isPromoPreview ? promoBgColor : priceBgColor,
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
                            bgColor: 'transparent',
                          },
                          {
                            id: 'priceSymbol',
                            pos: isPromoPreview ? promoPriceSymbolPos : priceSymbolPos,
                            font: isPromoPreview
                              ? promoPriceSymbolFontSize || 0
                              : priceSymbolFontSize || 0,
                            color: isPromoPreview ? promoPriceSymbolColor : priceSymbolColor,
                            bold: isPromoPreview ? promoPriceSymbolBold : priceSymbolBold,
                            text: 'R$',
                            hidden: priceFormat !== 'split',
                          },
                          {
                            id: 'priceDecimals',
                            pos: isPromoPreview ? promoPriceDecimalsPos : priceDecimalsPos,
                            font: isPromoPreview
                              ? promoPriceDecimalsFontSize || 0
                              : priceDecimalsFontSize || 0,
                            color: isPromoPreview ? promoPriceDecimalsColor : priceDecimalsColor,
                            bold: isPromoPreview ? promoPriceDecimalsBold : priceDecimalsBold,
                            text: ',00',
                            hidden: priceFormat !== 'split',
                          },
                          ...(currentCategory !== 'precos'
                            ? [
                                {
                                  id: 'barcode',
                                  pos: isPromoPreview ? promoBarcodePos : barcodePos,
                                  width: 80,
                                  isBarcode: true,
                                },
                              ]
                            : []),
                          ...(isPromoPreview ? extraFieldsPromo || [] : extraFields || []).map(
                            (f) => ({
                              id: f.id,
                              pos: { x: f.x, y: f.y },
                              width: f.width || 40,
                              height: f.height || 10,
                              font: f.size,
                              color: f.color,
                              bold: f.bold,
                              align: f.align || 'center',
                              valign: 'middle',
                              text: f.text,
                              hidden: false,
                              bgColor: f.bgColor,
                            })
                          ),
                        ]
                          .filter((el) => !el.hidden)
                          .map((el: LabelGridModelCanvasElementData) => (
                            <LabelGridModelCanvasElement
                              key={el.id}
                              el={el}
                              draggingElement={draggingElement}
                              resizingElement={resizingElement}
                              selectedElement={selectedElement}
                              editingTextElement={editingTextElement}
                              fontFamily={fontFamily}
                              setDraggingElement={setDraggingElement}
                              setSelectedElement={setSelectedElement}
                              setEditingTextElement={setEditingTextElement}
                              updateStyle={updateStyle}
                              duplicateExtraField={duplicateExtraField}
                              removeExtraField={removeExtraField}
                              handleMouseDownResize={handleMouseDownResize}
                            />
                          ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <LabelGridModelElementSelector
                currentCategory={currentCategory}
                isPromoPreview={isPromoPreview}
                extraFields={extraFields}
                extraFieldsPromo={extraFieldsPromo}
                selectedElement={selectedElement}
                onSelectElement={(elementId) => setSelectedElement(elementId)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 flex flex-col gap-8 items-center">
            <LabelGridModelSettingsPanel state={settingsPanelState} handlers={settingsPanelHandlers} />

            {/* Botão de Edição de Design (Oculto em categorias de imagem) */}
            {currentCategory !== 'logos' && currentCategory !== 'posts' && (
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                <button
                  onClick={() => setIsDesignMode(true)}
                  className="relative px-12 py-6 bg-white dark:bg-slate-900 border-2 border-blue-500/20 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:scale-105 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    {' '}
                    <i className="bi bi-palette2 text-3xl" />{' '}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Aparência da Etiqueta
                    </p>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                      Editar Design Visual
                    </h4>
                  </div>
                  <i className="bi bi-chevron-right text-2xl text-blue-300 ml-4" />
                </button>
              </div>
            )}

            {/* Prévia da Folha */}
            <div className="flex flex-col items-center gap-4 w-full pb-12">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Prévia do modelo em folha inteira
              </p>
              <LabelGridSheetPreview
                layout={{
                  paperWidth: paperSize === 'Custom' ? customWidth : selectedPaper.w,
                  paperHeight: paperSize === 'Custom' ? customHeight : selectedPaper.h,
                  columns,
                  rows,
                  margins: { top: marginT, bottom: marginB, left: marginL, right: marginR },
                  gaps: { horizontal: gapH, vertical: gapV },
                  layoutType,
                  backgroundColor: bgColor,
                  imageScale,
                  previewImage: effectivePreviewImage,
                  customPreviewImage,
                }}
                onCustomPreviewImageChange={setCustomPreviewImage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelGridModelModal;
