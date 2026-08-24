import React, { useEffect, useRef, useState } from 'react';
import { LabelConfig } from './LabelConstants';
import bwipjs from 'bwip-js';

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Libre+Barcode+128&display=swap";

interface Props {
    config: LabelConfig;
    image: string | null;
    index: number;
    scale?: number;
    rotation?: number;
    hideBleedBorder?: boolean;
    hideContent?: boolean;
    hidePhysicalBorder?: boolean;
}

const Barcode: React.FC<{ text: string; height?: number }> = ({ text, height = 15 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (canvasRef.current && text) {
            try {
                const trimmedText = text.trim();
                const isNumeric = /^\d+$/.test(trimmedText);
                const isEanCompatible = isNumeric && (trimmedText.length === 12 || trimmedText.length === 13);
                const bcidType = isEanCompatible ? 'ean13' : 'code128';

                bwipjs.toCanvas(canvasRef.current, {
                    bcid: bcidType,
                    text: trimmedText,
                    scale: 3,
                    height: height,
                    includetext: true,
                    textxalign: 'center',
                    backgroundcolor: 'ffffff'
                });
                setError(false);
            } catch (e) {
                console.error('Barcode error:', e);
                setError(true);
            }
        }
    }, [text, height]);

    if (error) return <div className="text-[10px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-50 rounded italic">Formato Inválido</div>;
    return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
};

const PRICE_ART_GLOBAL_KEY = 'morante_global_price_label_art_template';
const getOppTemplateKey = (oppId: string) => `morante_price_label_art_template_${oppId}`;

const getPriceMagnitude = (priceStr: string): 'tens' | 'hundreds' | 'thousands' => {
    if (!priceStr) return 'hundreds';
    const clean = String(priceStr).replace(/R\$\s*/g, '').trim().replace(/[^0-9,\.]/g, '');
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) return 'hundreds';
    const integerVal = Math.floor(num);
    if (integerVal < 100) return 'tens';
    if (integerVal < 1000) return 'hundreds';
    return 'thousands';
};

const getIntegerPart = (priceStr: string): string => {
    if (!priceStr) return '0';
    const s = String(priceStr).replace(/R\$\s*/g, '').trim();
    const clean = s.replace(/[^0-9,\.]/g, '');
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) return s.split(',')[0].split('.')[0] || '0';
    return Math.floor(num).toLocaleString('pt-BR');
};

const fmtBRL = (val: string): string => {
    if (!val) return '0,00';
    if (String(val).includes('R$')) return String(val).replace('R$', '').trim();
    const clean = String(val).replace(/[^0-9,\.]/g, '');
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? clean : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getCentsStr = (priceStr: string, tplCentsText: string): string => {
    if (tplCentsText && tplCentsText !== ',00') return tplCentsText;
    if (!priceStr) return ',00';
    const s = String(priceStr).replace(/[^0-9,\.]/g, '');
    const parts = s.split(',');
    if (parts.length < 2) return ',00';
    return `,${parts[1].padEnd(2, '0').slice(0, 2)}`;
};

import { PriceLabelArtRenderer, PriceLabelArtData } from './PriceLabelArtRenderer';

export const PriceLabelArtItem: React.FC<{ config: any }> = ({ config }) => {
    const oppId = config.opportunityId || config.opportunity_id || (config.opportunity?.id || config.opportunity?.slug || config.opportunity) || 'salvado';

    let template: any = {};
    let oppColors: Record<string, string> = {};
    try {
        const rawMap = localStorage.getItem('morante_hub_opp_colors_map');
        const map = rawMap ? JSON.parse(rawMap) : {};

        // Tenta carregar o template específico da oportunidade
        const rawUuid = oppId ? localStorage.getItem(getOppTemplateKey(oppId)) : null;
        const parsedUuid = rawUuid ? JSON.parse(rawUuid) : null;

        // Só usa o template UUID se ele foi intencionalmente salvo para essa oportunidade
        // (selectedOppId no snapshot bate com o oppId do produto)
        const useUuidTemplate = parsedUuid && parsedUuid.selectedOppId === oppId;

        // Template base: none > salvado > global
        const rawBase =
            localStorage.getItem(getOppTemplateKey('none')) ||
            localStorage.getItem(getOppTemplateKey('salvado')) ||
            localStorage.getItem(PRICE_ART_GLOBAL_KEY);

        if (useUuidTemplate) {
            template = parsedUuid;
        } else if (rawBase) {
            template = JSON.parse(rawBase);
        }

        oppColors = (oppId && map[oppId]) || map['salvado'] || map['none'] || {};
    } catch (e) {}

    const displayPrice = (config.showPromoPrice && config.promoPrice) ? config.promoPrice : (config.price || '0');
    const mag = getPriceMagnitude(displayPrice);

    // Tenta obter o design da magnitude exata do produto
    // Se não tiver, usa a magnitude que foi salva (selectedMagnitude) ou qualquer outra disponível
    const allMags = template.magnitudeTemplates || {};
    const magDesign = allMags[mag]
        || (template.selectedMagnitude && allMags[template.selectedMagnitude])
        || allMags['thousands']
        || allMags['hundreds']
        || allMags['tens']
        || {};

    // t = base do template (raiz) + dados específicos da magnitude
    const t = { ...template, ...magDesign };
    const defaultFallbackBg = (oppId === 'salvado') ? '#ff7900' : '#ffffff';
    const bgColor = oppColors['background'] || t.bgColor || (oppId === 'none' ? '#ffffff' : config.bg_color) || defaultFallbackBg;
    const titleColor = oppColors['title'] || t.titleColor || '#000000';
    const deColor = oppColors['deText'] || t.deColor || '#000000';
    const normalPriceColor = oppColors['normalPrice'] || t.normalPriceColor || '#000000';
    const porColor = oppColors['porText'] || t.porColor || '#000000';
    const currencyColor = oppColors['currencySymbol'] || t.currencyColor || '#000000';
    const priceColor = oppColors['promoPrice'] || t.priceColor || '#000000';
    const centsColor = oppColors['cents'] || t.centsColor || '#000000';
    const installmentsColor = oppColors['installments'] || t.installmentsColor || '#000000';

    const pick = (a: any, b: any, c: any, globalVal: any, fb: number) => {
        let val: any = undefined;
        if (mag === 'tens') val = a ?? b ?? c ?? globalVal;
        else if (mag === 'hundreds') val = b ?? a ?? c ?? globalVal;
        else if (mag === 'thousands') val = c ?? b ?? a ?? globalVal;
        if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
        return fb;
    };
    const titleFontSize = pick(t.titleFontSizeTens, t.titleFontSizeHundreds, t.titleFontSizeThousands, t.titleFontSize, 26);
    const deFontSize = pick(t.deFontSizeTens, t.deFontSizeHundreds, t.deFontSizeThousands, t.deFontSize, 34);
    const normalPriceFontSize = pick(t.normalPriceFontSizeTens, t.normalPriceFontSizeHundreds, t.normalPriceFontSizeThousands, t.normalPriceFontSize, 34);
    const porFontSize = pick(t.porFontSizeTens, t.porFontSizeHundreds, t.porFontSizeThousands, t.porFontSize, 34);
    const currencyFontSize = pick(t.currencyFontSizeTens, t.currencyFontSizeHundreds, t.currencyFontSizeThousands, t.currencyFontSize, 70);
    const centsFontSize = pick(t.centsFontSizeTens, t.centsFontSizeHundreds, t.centsFontSizeThousands, t.centsFontSize, 70);
    const installmentsFontSize = pick(t.installmentsFontSizeTens, t.installmentsFontSizeHundreds, t.installmentsFontSizeThousands, t.installmentsFontSize, 18);
    const priceScale = mag === 'tens' ? (t.scaleTens ?? 240) : mag === 'hundreds' ? (t.scaleHundreds ?? 210) : (t.scaleThousands ?? 170);

    const titlePos = t.titlePos || { x: 0, y: 0 };
    const titleRot = t.titleRotation ?? 0;
    const groupPos = t.dePricePorGroupPos || { x: -160, y: -90 };
    const groupRot = t.dePricePorGroupRotation ?? 0;
    const groupGap = t.dePricePorGroupGap ?? 10;
    const currPos = t.currencyPos || { x: 0, y: 0 };
    const currRot = t.currencyRotation ?? 0;
    const pricePos = t.promoPricePos || { x: 0, y: 55 };
    const priceRot = t.promoPriceRotation ?? 0;
    const centsPos = t.centsPos || { x: 0, y: 0 };
    const centsRot = t.centsRotation ?? 0;
    const instPos = t.installmentsPos || { x: 0, y: 0 };
    const instRot = t.installmentsRotation ?? 0;

    const showTitle = t.showTitle ?? true;
    const showDe = t.showDe ?? true;
    const showNormalPrice = t.showNormalPrice ?? true;
    const showPor = t.showPor ?? true;
    const showCurrency = t.showCurrency ?? true;
    const showPromoPrice = t.showPromoPrice ?? true;
    const showCents = t.showCents ?? true;
    const showInstallments = t.showInstallments ?? false;

    const titleText = config.text || config.name || t.title || 'NOME DO PRODUTO';
    const rawNormal = config.price || t.normalPrice || '0';
    const rawPromo = (config.showPromoPrice && config.promoPrice) ? config.promoPrice : (config.price || t.promoPrice || '0');
    const intDigits = getIntegerPart(rawPromo);
    const centsDisplay = getCentsStr(rawPromo, t.centsText || ',00');

    const artData: PriceLabelArtData = {
        title: titleText,
        showTitle,
        titleFontSize,
        titleColor,
        titleFontFamily: t.titleFontFamily || 'Inter, system-ui, sans-serif',
        titlePos,
        titleRotation: titleRot,

        deText: t.deText || 'De',
        showDe,
        deFontSize,
        deColor,
        deFontFamily: t.deFontFamily || 'Inter, system-ui, sans-serif',
        deRotation: t.deRotation ?? 0,

        normalPrice: fmtBRL(rawNormal),
        showNormalPrice,
        normalPriceFontSize,
        normalPriceColor,
        normalPriceFontFamily: t.normalPriceFontFamily || 'Inter, system-ui, sans-serif',
        normalPriceRotation: t.normalPriceRotation ?? 0,

        porText: t.porText || 'Por:',
        showPor,
        porFontSize,
        porColor,
        porFontFamily: t.porFontFamily || 'Inter, system-ui, sans-serif',
        porRotation: t.porRotation ?? 0,

        dePricePorGroupPos: groupPos,
        dePricePorGroupRotation: groupRot,
        dePricePorGroupGap: groupGap,

        currencySymbol: t.currencySymbol || 'R$',
        showCurrency,
        currencyFontSize,
        currencyColor,
        currencyFontFamily: t.currencyFontFamily || 'Inter, system-ui, sans-serif',
        currencyPos: currPos,
        currencyRotation: currRot,

        promoPrice: intDigits,
        showPromoPrice,
        priceScale,
        priceColor,
        promoPriceFontFamily: t.promoPriceFontFamily || 'Inter, system-ui, sans-serif',
        promoPricePos: pricePos,
        promoPriceRotation: priceRot,

        centsText: centsDisplay,
        showCents,
        centsFontSize,
        centsColor,
        centsFontFamily: t.centsFontFamily || 'Inter, system-ui, sans-serif',
        centsPos,
        centsRotation: centsRot,

        installments: t.installments || 'Em até 10x sem juros',
        showInstallments,
        installmentsFontSize,
        installmentsColor,
        installmentsFontFamily: t.installmentsFontFamily || 'Inter, system-ui, sans-serif',
        installmentsPos: instPos,
        installmentsRotation: instRot,

        bgColor
    };

    return <PriceLabelArtRenderer data={artData} mode="view" />;
};

const LabelItem: React.FC<Props> = ({ config, image, index, scale, rotation, hideBleedBorder, hideContent, hidePhysicalBorder }) => {
    const activeScale = scale ?? config.imageScale ?? 1;
    const isRound = config.type === 'round';
    const formatPrice = (price?: string | number) => {
        if (!price) return '';
        const p = String(price);
        if (p.includes('R$')) return p;
        const clean = p.replace(/\D/g, '');
        const val = parseInt(clean) / 100;
        return isNaN(val) ? '' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const formatLabelPrice = (priceStr: string, isEffectivelySplit: boolean) => {
        if (!priceStr) return '';
        const unified = formatPrice(priceStr);
        if (!isEffectivelySplit) return unified;
        return unified.replace('R$', '').replace(',00', '').trim();
    };
    const getAlignment = (align?: string) => align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
    const getVAlignment = (valign?: string) => valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';

    const isPriceLabel = config.category === 'precos';

    const bleedStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: hideContent ? 'transparent' : (isPriceLabel ? 'transparent' : (config.bg_color || 'white')),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transform: `rotate(${rotation || 0}deg)`,
        transformOrigin: 'center center',
        zIndex: 5,
        overflow: 'hidden'
    };

    const labelStyle: React.CSSProperties = {
        width: (config.labelWidth && config.labelWidth > 0) ? `${config.labelWidth}mm` : '100%',
        height: (config.labelHeight && config.labelHeight > 0) ? `${config.labelHeight}mm` : '100%',
        border: (hidePhysicalBorder) ? 'none' : (isPriceLabel ? 'none' : '1px solid #e2e8f0'),
        position: 'relative',
        display: 'flex',
        flexDirection: config.layout === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: isRound ? '50%' : undefined,
        backgroundColor: hideContent ? 'transparent' : (isPriceLabel ? 'transparent' : (config.bg_color || 'white')),
    };

    const hasPromo = !!(config.promoPrice && config.promoPrice !== config.price);
    const isSplit = config.priceFormat === 'split';
    const priceStr = hasPromo ? (config.promoPrice || '') : (config.price || '');
    const priceDigits = priceStr.replace(/\D/g, '').length;
    let dynamicFontSize = config.nameFontSize || 10;
    if (priceDigits > 5) dynamicFontSize = Math.max(6, (config.nameFontSize || 10) - (priceDigits - 5) * 1.5);
    const safeExtraFields = Array.isArray((config as any).extraFields) ? (config as any).extraFields : [];

    const elements = [
        { id: 'productName', pos: { x: hasPromo ? (config.promoNamePosX ?? 50) : (config.namePosX ?? 50), y: hasPromo ? (config.promoNamePosY ?? 15) : (config.namePosY ?? 15) }, width: hasPromo ? (config.promoNameWidth ?? 80) : (config.nameWidth ?? 80), font: hasPromo ? (config.promoNameFontSize || 9) : (config.nameFontSize || 10), color: hasPromo ? config.promoNameColor : config.nameColor, bold: hasPromo ? config.promoNameBold : config.nameBold, align: hasPromo ? config.promoNameAlign : config.nameAlign, valign: hasPromo ? config.promoNameVAlign : config.nameVAlign, text: config.text || '', bgColor: hasPromo ? config.promoNameBgColor : config.nameBgColor, hidden: !config.text && !config.id?.includes('preview') },
        { id: 'mainPrice', pos: { x: hasPromo ? (config.promoPosX ?? 50) : (config.pricePosX ?? 50), y: hasPromo ? (config.promoPosY ?? 70) : (config.pricePosY ?? 70) }, width: hasPromo ? (config.promoWidth ?? 80) : (config.priceWidth ?? 80), font: dynamicFontSize, color: hasPromo ? config.promoPriceColor : config.priceColor, bold: hasPromo ? config.promoPriceBold : config.priceBold, align: hasPromo ? config.promoPriceAlign : config.priceAlign, valign: hasPromo ? config.promoPriceVAlign : config.priceVAlign, text: formatLabelPrice(hasPromo ? (config.promoPrice || '') : (config.price || ''), isSplit), bgColor: hasPromo ? config.promoBgColor : config.priceBgColor, hidden: (!config.price && !config.promoPrice) && !config.id?.includes('preview') },
        { id: 'oldPrice', pos: { x: config.oldPricePosX ?? 50, y: config.oldPricePosY ?? 45 }, width: config.oldPriceWidth ?? 50, font: config.oldPriceFontSize || 8, color: config.oldPriceColor || '#94a3b8', bold: config.oldPriceBold, align: config.oldPriceAlign || 'center', valign: config.oldPriceVAlign || 'middle', text: formatPrice(config.price || ''), bgColor: 'transparent', hidden: !hasPromo || !config.price },
        { id: 'priceSymbol', pos: { x: hasPromo ? (config.promoPriceSymbolPosX ?? 20) : (config.priceSymbolPosX ?? 20), y: hasPromo ? (config.promoPriceSymbolPosY ?? 70) : (config.priceSymbolPosY ?? 70) }, font: hasPromo ? (config.promoPriceSymbolFontSize || 8) : (config.priceSymbolFontSize || 8), color: hasPromo ? (config.promoPriceSymbolColor || config.promoPriceColor) : (config.priceSymbolColor || config.priceColor), bold: hasPromo ? config.promoPriceSymbolBold : config.priceSymbolBold, text: 'R$', hidden: !isSplit, bgColor: 'transparent' },
        { id: 'priceDecimals', pos: { x: hasPromo ? (config.promoPriceDecimalsPosX ?? 80) : (config.priceDecimalsPosX ?? 80), y: hasPromo ? (config.promoPriceDecimalsPosY ?? 70) : (config.priceDecimalsPosY ?? 70) }, font: hasPromo ? (config.promoPriceDecimalsFontSize || 8) : (config.priceDecimalsFontSize || 8), color: hasPromo ? (config.promoPriceDecimalsColor || config.promoPriceColor) : (config.priceDecimalsColor || config.priceColor), bold: hasPromo ? config.promoPriceDecimalsBold : config.priceDecimalsBold, text: ',00', hidden: !isSplit, bgColor: 'transparent' },
        { id: 'barcode', pos: { x: (hasPromo ? config.promoBarcodePosX : config.barcodePosX) ?? 50, y: (hasPromo ? config.promoBarcodePosY : config.barcodePosY) ?? 85 }, isBarcode: true, hidden: config.category === 'precos' },
        ...safeExtraFields.map((f: any) => ({ ...f, pos: { x: f.x, y: f.y }, font: f.size, align: f.align || 'center', valign: 'middle', hidden: false }))
    ].filter(el => !el.hidden);

    const isLogoOnly = config.category !== 'precos' && (config.category === 'logos' || (config as any).printingMode === 'simple' || !!image);
    const isBlank = (config as any).isBlank;

    const renderModularElement = (el: any) => {
        if (el.isBarcode) {
            const barcodeText = config.barcode || config.sku || config.code || '';
            if (!barcodeText) return null;
            return (
                <div key={el.id} style={{ position: 'absolute', left: `${el.pos?.x ?? 50}%`, top: `${el.pos?.y ?? 85}%`, transform: 'translate(-50%, -50%)', width: '80%', zIndex: 5 }}>
                    <Barcode text={barcodeText} />
                </div>
            );
        }
        return (
            <div key={el.id} style={{ position: 'absolute', left: `${el.pos?.x ?? 50}%`, top: `${el.pos?.y ?? 50}%`, transform: 'translate(-50%, -50%)', width: `${el.width ?? 80}%`, fontSize: `${el.font ?? 10}px`, color: el.color || '#000000', fontWeight: el.bold ? 'bold' : 'normal', textAlign: (el.align as any) || 'center', backgroundColor: el.bgColor || 'transparent', display: 'flex', alignItems: getVAlignment(el.valign), justifyContent: getAlignment(el.align), lineHeight: 1.2, zIndex: 5, padding: '1px 2px', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textDecoration: el.id === 'oldPrice' ? 'line-through' : 'none' }}>{el.text}</div>
        );
    };

    return (
        <div className="label-item-bleed-container" style={{ ...bleedStyle, border: hideBleedBorder ? 'none' : undefined }}>
            <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
            {image && !isBlank && config.category !== 'precos' && (
                <img src={image} alt="" style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', objectFit: (config.imageFit as any) || 'cover', zIndex: 1, transform: `translate(-50%, -50%) scale(${activeScale})`, transition: 'transform 0.2s ease-out', opacity: 1 }} />
            )}
            <div className="label-item-container" style={labelStyle}>
                {config.category === 'precos' && !isBlank && !hideContent ? (
                    <PriceLabelArtItem config={config} />
                ) : (
                    !isLogoOnly && !hideContent && !isBlank && elements.map(renderModularElement)
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .label-item-bleed-container, .label-item-container {
                        border: none !important;
                        outline: none !important;
                    }
                }
            `}} />
        </div>
    );
};

export default LabelItem;
