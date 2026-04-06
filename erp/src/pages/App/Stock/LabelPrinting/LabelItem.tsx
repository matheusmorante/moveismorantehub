import React, { useEffect, useRef, useState } from 'react';
import { LabelConfig } from './LabelConstants';

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Libre+Barcode+128&display=swap";
import logoMorante from '../../../../assets/logo.jpeg';
import bwipjs from 'bwip-js';

interface Props {
    config: LabelConfig;
    image: string | null;
    index: number;
    scale?: number;
    rotation?: number;
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

const LabelItem: React.FC<Props> = ({ config, image, index, scale, rotation }) => {
    const activeScale = scale ?? config.imageScale ?? 1;
    const isRound = config.type === 'round';
    
    let containerStyle: React.CSSProperties = {
        backgroundColor: 'white',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #e2e8f0', // Borda visível para preview
        fontFamily: config.fontFamily || 'Inter'
    };

    if (isRound) {
        containerStyle = {
            ...containerStyle,
            width: config.labelWidth ? `${config.labelWidth}mm` : '100%',
            height: 'auto',
            aspectRatio: '1/1',
            borderRadius: '50%',
            flexDirection: 'column',
            padding: '2mm',
            margin: '0 auto'
        };
    } else {
        containerStyle = {
            ...containerStyle,
            width: (config.labelWidth && config.labelWidth > 0) ? `${config.labelWidth}mm` : '100%',
            height: (config.labelHeight && config.labelHeight > 0) ? `${config.labelHeight}mm` : '100%',
            flexDirection: config.layout === 'horizontal' ? 'row' : 'column',
            padding: '0'
        };
    }

    if (config.printingMode === 'simple' && image) {
        return (
            <div className="label-item-container" style={{ ...containerStyle, position: 'relative', overflow: 'hidden', backgroundColor: config.bg_color || 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                    src={image} 
                    alt="Etiqueta Simples" 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: (config.imageFit as any) || 'contain', 
                        transformOrigin: 'center center',
                        transform: `scale(${activeScale}) rotate(${rotation || 0}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                />
            </div>
        );
    }

    if (isRound) {
        return (
            <div className="label-item-container" style={containerStyle}>
                {image && (
                    <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: (config.imageFit as any) || 'cover', position: 'absolute', inset: 0, zIndex: 1, transform: `scale(${activeScale})` }} />
                )}
                {config.preset === 'store_logo' && !image && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                         <i className="bi bi-circle text-[20px] text-slate-300" />
                    </div>
                )}
            </div>
        );
    }

    if (config.preset === 'price_only' || config.preset === 'promotional_price' || config.preset === 'custom' || config.preset === 'qr_product' || config.namePosX !== undefined) {
        const hasPromo = config.showPromoPrice && config.promoPrice;
        
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
                                    position: 'absolute',
                                    top: '50%',
                                    left: '-5%',
                                    right: '-5%',
                                    height: 'calc( (6 / 500) * 100cqh )',
                                    backgroundColor: '#ef4444',
                                    borderRadius: '9999px',
                                    opacity: 0.8,
                                    transform: 'translateY(-50%) rotate(-2deg)'
                                }} />
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="label-item-container" style={{ ...containerStyle, position: 'relative', padding: '0', backgroundColor: config.bg_color || 'white', containerType: 'size', transform: `rotate(${rotation || 0}deg)`, transformOrigin: 'center center' }}>
                <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
                {[
                    { 
                        id: 'name', 
                        pos: { 
                            x: hasPromo ? (config.promoNamePosX ?? 50) : (config.namePosX ?? 50), 
                            y: hasPromo ? (config.promoNamePosY ?? 25) : (config.namePosY ?? 30) 
                        }, 
                        width: hasPromo ? (config.promoNameWidth ?? 80) : (config.nameWidth ?? 80), 
                        height: hasPromo ? (config.promoNameHeight || 10) : (config.nameHeight || 10), 
                        font: hasPromo ? (config.promoNameFontSize || 9) : (config.nameFontSize || 10), 
                        color: hasPromo ? config.promoNameColor : config.nameColor, 
                        bold: hasPromo ? config.promoNameBold : config.nameBold, 
                        align: hasPromo ? config.promoNameAlign : config.nameAlign, 
                        valign: hasPromo ? config.promoNameVAlign : config.nameVAlign, 
                        text: config.text, 
                        bgColor: hasPromo ? config.promoNameBgColor : config.nameBgColor 
                    },
                    { 
                        id: 'mainPrice', 
                        pos: { 
                            x: hasPromo ? (config.promoPosX ?? 50) : (config.pricePosX ?? 50), 
                            y: hasPromo ? (config.promoPosY ?? 75) : (config.pricePosY ?? 60) 
                        }, 
                        width: hasPromo ? (config.promoWidth ?? 80) : (config.priceWidth ?? 80), 
                        height: hasPromo ? (config.promoHeight || 10) : (config.priceHeight || 10), 
                        font: hasPromo ? (config.promoPriceFontSize || 24) : dynamicFontSize, 
                        color: hasPromo ? config.promoPriceColor : config.priceColor, 
                        bold: hasPromo ? config.promoPriceBold : config.priceBold, 
                        align: hasPromo ? config.promoPriceAlign : config.priceAlign, 
                        valign: hasPromo ? config.promoPriceVAlign : config.priceVAlign, 
                        text: formatLabelPrice(hasPromo ? config.promoPrice : config.price, isSplit), 
                        bgColor: hasPromo ? config.promoBgColor : config.priceBgColor 
                    },
                    { 
                        id: 'oldPrice', 
                        pos: { 
                            x: config.oldPricePosX ?? 50, 
                            y: config.oldPricePosY ?? 60 
                        }, 
                        width: config.oldPriceWidth ?? 80, 
                        height: config.oldPriceHeight || 10, 
                        font: config.oldPriceFontSize || 7, 
                        color: config.oldPriceColor, 
                        bold: config.oldPriceBold, 
                        align: config.oldPriceAlign, 
                        valign: config.oldPriceVAlign, 
                        text: formatLabelPrice(config.price, false), 
                        hidden: !hasPromo,
                        bgColor: 'transparent'
                    },
                    { 
                        id: 'priceSymbol', 
                        pos: { 
                            x: hasPromo ? (config.promoPriceSymbolPosX || 30) : (config.priceSymbolPosX || 30), 
                            y: hasPromo ? (config.promoPriceSymbolPosY || 70) : (config.priceSymbolPosY || 55) 
                        }, 
                        width: 20, height: 10, 
                        font: hasPromo ? config.promoPriceSymbolFontSize : config.priceSymbolFontSize, 
                        color: hasPromo ? config.promoPriceSymbolColor : config.priceSymbolColor, 
                        bold: (hasPromo ? config.promoPriceSymbolBold : config.priceSymbolBold), 
                        text: 'R$', hidden: !isSplit 
                    },
                    { 
                        id: 'priceDecimals', 
                        pos: { 
                            x: hasPromo ? (config.promoPriceDecimalsPosX || 70) : (config.priceDecimalsPosX || 70), 
                            y: hasPromo ? (config.promoPriceDecimalsPosY || 70) : (config.priceDecimalsPosY || 55) 
                        }, 
                        width: 20, height: 10, 
                        font: hasPromo ? config.promoPriceDecimalsFontSize : config.priceDecimalsFontSize, 
                        color: hasPromo ? config.promoPriceDecimalsColor : config.priceDecimalsColor, 
                        bold: (hasPromo ? config.promoPriceDecimalsBold : config.priceDecimalsBold), 
                        text: ',00', hidden: !isSplit 
                    },
                    { id: 'barcode', pos: { x: (hasPromo ? config.promoBarcodePosX : config.barcodePosX) ?? 50, y: (hasPromo ? config.promoBarcodePosY : config.barcodePosY) ?? 85 }, isBarcode: true, hidden: !config.showBarcode },
                    ...(hasPromo ? (config.extraFieldsPromo || []) : (config.extraFields || [])).map((f: any) => ({
                        id: f.id,
                        pos: { x: f.x, y: f.y },
                        width: f.width || 40,
                        height: f.height || 10,
                        font: f.size,
                        color: f.color,
                        bold: f.bold,
                        align: f.align || 'center',
                        valign: f.valign || 'middle',
                        text: f.text,
                        bgColor: f.bgColor
                    }))
                ].map(renderModularElement)}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Vazio - Apenas formato/borda conforme solicitado pelo usuário */}
        </div>
    );
}

export default LabelItem;
