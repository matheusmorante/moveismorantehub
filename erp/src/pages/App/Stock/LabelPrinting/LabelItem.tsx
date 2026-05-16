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

const LabelItem: React.FC<Props> = ({ config, image, index, scale, rotation, hideBleedBorder, hideContent, hidePhysicalBorder }) => {
    const activeScale = scale ?? config.imageScale ?? 1;
    const isRound = config.type === 'round';
    
    // Formatação de Preço
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

    // 1. Estilo da Área Base - Ocupa o tamanho da célula
    const bleedStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: hideContent ? 'transparent' : (config.bg_color || 'white'),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        // Centralização é feita pelo pai (flex no LabelGrid), então não precisamos de margens negativas
        transform: `rotate(${rotation || 0}deg)`,
        transformOrigin: 'center center',
        zIndex: 5,
        overflow: 'visible' // Permite transbordo da imagem se escalonada
    };

    // 2. Estilo da Etiqueta Física (Physical Area) - Onde o conteúdo é alinhado
    const labelStyle: React.CSSProperties = {
        width: (config.labelWidth && config.labelWidth > 0) ? `${config.labelWidth}mm` : '100%',
        height: (config.labelHeight && config.labelHeight > 0) ? `${config.labelHeight}mm` : '100%',
        border: (hidePhysicalBorder) ? 'none' : '1px solid #e2e8f0', 
        position: 'relative',
        display: 'flex',
        flexDirection: config.layout === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        containerType: 'size',
        borderRadius: isRound ? '50%' : '0',
        backgroundColor: 'transparent',
        boxSizing: 'border-box'
    };

    const hasPromo = config.showPromoPrice && config.promoPrice;
    
    // Cálculo de fonte dinâmica
    const getDynamicPriceFontSize = () => {
        const baseSize = hasPromo ? (config.promoPriceFontSize || 24) : (config.priceFontSize || 24);
        const displayPrice = hasPromo ? config.promoPrice : config.price;
        const digits = displayPrice ? String(displayPrice).replace(/\D/g, '').length : 0;
        if (digits >= 7) return baseSize + (config.priceFontSizeTenThousands || 0);
        if (digits >= 6) return baseSize + (config.priceFontSizeThousands || 0);
        if (digits >= 5) return baseSize + (config.priceFontSizeHundreds || 0);
        if (digits >= 4) return baseSize + (config.priceFontSizeTens || 0);
        return baseSize;
    };

    const dynamicFontSize = getDynamicPriceFontSize();
    const isSplit = config.priceFormat === 'split';

    // Renderizador de elementos modulares
    const renderModularElement = (el: any) => {
        if (el.hidden) return null;
        const isBarcode = el.isBarcode;
        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${el.pos.x}%`,
            top: `${el.pos.y}%`,
            width: isBarcode ? '100%' : `${el.width}%`,
            height: isBarcode ? '15cqh' : 'max-content',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: getVAlignment(el.valign),
            justifyContent: getAlignment(el.align),
            backgroundColor: el.bgColor || 'transparent',
            padding: (el.bgColor && el.bgColor !== 'transparent') ? 'calc( (2 / 500) * 100cqh )' : '0',
            zIndex: isBarcode ? 5 : 10,
            overflow: 'visible'
        };

        const textStyle: React.CSSProperties = {
            fontSize: `calc( (${el.font || 10} / 500) * 100cqh )`,
            fontWeight: el.bold ? '950' : '500',
            color: el.color || '#1e293b',
            textAlign: el.align || 'center',
            lineHeight: '1.1',
            whiteSpace: (el.id === 'name') ? 'normal' : 'nowrap',
            width: '100%',
            fontFamily: config.fontFamily || 'Inter'
        };

        return (
            <div key={el.id} style={style}>
                {isBarcode ? (
                    <div style={{ width: '90%', display: 'flex', justifyContent: 'center' }}>
                        <Barcode text={config.qrContent || config.sku || ''} height={10} />
                    </div>
                ) : (
                    <div style={{ ...textStyle, position: 'relative' }}>
                        {el.text}
                        {el.id === 'oldPrice' && hasPromo && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '-5%', right: '-5%',
                                height: 'calc( (6 / 500) * 100cqh )',
                                backgroundColor: '#ef4444', borderRadius: '9999px',
                                opacity: 0.8, transform: 'translateY(-50%) rotate(-2deg)'
                            }} />
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Lista de elementos baseada na configuração
    const elements = [
        { 
            id: 'name', 
            pos: { 
                x: hasPromo ? (config.promoNamePosX ?? 50) : (config.namePosX ?? 50), 
                y: hasPromo ? (config.promoNamePosY ?? 30) : (config.namePosY ?? 30) 
            }, 
            width: hasPromo ? (config.promoNameWidth ?? 80) : (config.nameWidth ?? 80), 
            font: hasPromo ? (config.promoNameFontSize || 9) : (config.nameFontSize || 10), 
            color: hasPromo ? config.promoNameColor : config.nameColor, 
            bold: hasPromo ? config.promoNameBold : config.nameBold, 
            align: hasPromo ? config.promoNameAlign : config.nameAlign, 
            valign: hasPromo ? config.promoNameVAlign : config.nameVAlign, 
            text: config.text || '', 
            bgColor: hasPromo ? config.promoNameBgColor : config.nameBgColor,
            hidden: !config.text && !config.id?.includes('preview')
        },
        { 
            id: 'mainPrice', 
            pos: { 
                x: hasPromo ? (config.promoPosX ?? 50) : (config.pricePosX ?? 50), 
                y: hasPromo ? (config.promoPosY ?? 70) : (config.pricePosY ?? 70) 
            }, 
            width: hasPromo ? (config.promoWidth ?? 80) : (config.priceWidth ?? 80), 
            font: dynamicFontSize, 
            color: hasPromo ? config.promoPriceColor : config.priceColor, 
            bold: hasPromo ? config.promoPriceBold : config.priceBold, 
            align: hasPromo ? config.promoPriceAlign : config.priceAlign, 
            valign: hasPromo ? config.promoPriceVAlign : config.priceVAlign, 
            text: formatLabelPrice(hasPromo ? (config.promoPrice || '') : (config.price || ''), isSplit), 
            bgColor: hasPromo ? config.promoBgColor : config.priceBgColor,
            hidden: (!config.price && !config.promoPrice) && !config.id?.includes('preview')
        },
        { 
            id: 'oldPrice', 
            pos: { x: config.oldPricePosX ?? 50, y: config.oldPricePosY ?? 45 }, 
            width: config.oldPriceWidth ?? 50, 
            font: config.oldPriceFontSize || 8, 
            color: config.oldPriceColor || '#94a3b8', 
            bold: config.oldPriceBold, 
            align: config.oldPriceAlign || 'center', 
            valign: config.oldPriceVAlign || 'middle', 
            text: formatPrice(config.price || ''), 
            bgColor: 'transparent',
            hidden: !hasPromo || !config.price
        },
        // Split Price Elements
        { id: 'priceSymbol', pos: { x: hasPromo ? (config.promoPriceSymbolPosX ?? 20) : (config.priceSymbolPosX ?? 20), y: hasPromo ? (config.promoPriceSymbolPosY ?? 70) : (config.priceSymbolPosY ?? 70) }, font: hasPromo ? (config.promoPriceSymbolFontSize || 8) : (config.priceSymbolFontSize || 8), color: hasPromo ? (config.promoPriceSymbolColor || config.promoPriceColor) : (config.priceSymbolColor || config.priceColor), bold: hasPromo ? config.promoPriceSymbolBold : config.priceSymbolBold, text: 'R$', hidden: !isSplit, bgColor: 'transparent' },
        { id: 'priceDecimals', pos: { x: hasPromo ? (config.promoPriceDecimalsPosX ?? 80) : (config.priceDecimalsPosX ?? 80), y: hasPromo ? (config.promoPriceDecimalsPosY ?? 70) : (config.priceDecimalsPosY ?? 70) }, font: hasPromo ? (config.promoPriceDecimalsFontSize || 8) : (config.priceDecimalsFontSize || 8), color: hasPromo ? (config.promoPriceDecimalsColor || config.promoPriceColor) : (config.priceDecimalsColor || config.priceColor), bold: hasPromo ? config.promoPriceDecimalsBold : config.priceDecimalsBold, text: ',00', hidden: !isSplit, bgColor: 'transparent' },
        // Barcode
        { id: 'barcode', pos: { x: (hasPromo ? config.promoBarcodePosX : config.barcodePosX) ?? 50, y: (hasPromo ? config.promoBarcodePosY : config.barcodePosY) ?? 85 }, isBarcode: true, hidden: config.category === 'precos' },
        // Extra Fields
        ...(hasPromo ? (config.extraFieldsPromo || []) : (config.extraFields || [])).map(f => ({ ...f, pos: { x: f.x, y: f.y }, font: f.size, align: f.align || 'center', valign: 'middle', hidden: false }))
    ].filter(el => !el.hidden);

    const isLogoOnly = config.category === 'logos' || (config as any).printingMode === 'simple' || !!image;

    return (
        <div className="label-item-bleed-container" style={bleedStyle}>
            <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
            
            {/* Imagem de Fundo (Bleed Area) */}
            {image && (
                <img 
                    src={image} 
                    alt="" 
                    style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        width: '100%', 
                        height: '100%', 
                        objectFit: (config.imageFit as any) || 'cover', 
                        zIndex: 1, 
                        transform: `translate(-50%, -50%) scale(${activeScale})`,
                        transition: 'transform 0.2s ease-out',
                        opacity: 1 
                    }} 
                />
            )}

            {/* Etiqueta Física (Corte) */}
            <div className="label-item-container" style={labelStyle}>
                {!isLogoOnly && !hideContent && elements.map(renderModularElement)}
            </div>
            
            {/* Estilos para ocultar bordas no PRINT */}
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
