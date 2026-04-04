import React, { useEffect, useRef, useState } from 'react';
import { LabelConfig } from './Index';
import logoMorante from '../../../../assets/logo.jpeg';
import bwipjs from 'bwip-js';

interface Props {
    config: LabelConfig;
    image: string | null;
    index: number;
    scale?: number;
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

const LabelItem: React.FC<Props> = ({ config, image, index, scale }) => {
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
        border: '0.1px solid #eee'
    };

    if (isRound) {
        const size = config.labelWidth ? `${config.labelWidth}mm` : '40mm';
        containerStyle = {
            ...containerStyle,
            width: size,
            height: size,
            borderRadius: '50%',
            flexDirection: 'column',
            padding: '4mm'
        };
    } else {
        containerStyle = {
            ...containerStyle,
            width: config.labelWidth ? `${config.labelWidth}mm` : '100%',
            height: config.labelHeight ? `${config.labelHeight}mm` : '100%',
            flexDirection: config.layout === 'horizontal' ? 'row' : 'column',
            padding: '1.5mm'
        };
    }

    if (isRound) {
        return (
            <div style={containerStyle}>
                {image && (
                    <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1, transform: `scale(${activeScale})` }} />
                )}
                {config.preset === 'store_logo' && !image && (
                    <img src={logoMorante} alt="Logo" style={{ width: '25mm', borderRadius: '50%', zIndex: 2 }} />
                )}
            </div>
        );
    }

    if (config.preset === 'price_only' || config.preset === 'promotional_price' || config.preset === 'custom' || config.preset === 'qr_product' || config.namePosX !== undefined) {
        const isLogosCategory = config.category === 'logos';
        const hasPromo = config.showPromoPrice && config.promoPrice;
        const priceToDisplay = hasPromo ? config.promoPrice : config.price;

        const getAlignment = (align?: string) => align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        const getVAlignment = (valign?: string) => valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';

        // Lógica de cálculo de fonte dinâmica (4 Faixas: 10, 100, 1000, 10000)
        const getDynamicPriceFontSize = () => {
            const baseSize = hasPromo ? (config.promoPriceFontSize || 24) : (config.priceFontSize || 24);
            const digits = priceToDisplay ? String(priceToDisplay).replace(/\D/g, '').length : 0;
            
            if (digits >= 7) return baseSize + (config.priceFontSizeTenThousands || 0); // 10k+
            if (digits >= 6) return baseSize + (config.priceFontSizeThousands || 0);    // 1k+
            if (digits >= 5) return baseSize + (config.priceFontSizeHundreds || 0);     // 100+
            if (digits >= 4) return baseSize + (config.priceFontSizeTens || 0);         // 10+
            
            return baseSize;
        };

        const dynamicFontSize = getDynamicPriceFontSize();

        return (
            <div style={{ ...containerStyle, position: 'relative', padding: '0', backgroundColor: config.bg_color || 'white', containerType: 'size' }}>
                {image && (
                    <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: (config.preset === 'store_logo' || isLogosCategory) ? 1 : 0.1, zIndex: 0, transform: `scale(${activeScale})` }} />
                )}

                <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                    {/* Nome do Produto */}
                    {config.showName && (
                        <div style={{
                            position: 'absolute',
                            left: `${(hasPromo ? config.promoNamePosX : config.namePosX) ?? 50}%`,
                            top: `${(hasPromo ? config.promoNamePosY : config.namePosY) ?? 25}%`,
                            width: `${(hasPromo ? config.promoNameWidth : config.nameWidth) ?? 80}%`,
                            height: `${(hasPromo ? config.promoNameHeight : config.nameHeight) ?? 20}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(hasPromo ? config.promoNameVAlign : config.nameVAlign),
                            justifyContent: getAlignment(hasPromo ? config.promoNameAlign : config.nameAlign),
                            backgroundColor: (hasPromo ? config.promoNameBgColor : config.nameBgColor) || 'transparent',
                            padding: (hasPromo ? config.promoNameBgColor : config.nameBgColor) && (hasPromo ? config.promoNameBgColor : config.nameBgColor) !== 'transparent' ? 'calc( (8 / 500) * 100cqh )' : '0'
                        }}>
                            <div style={{
                                fontSize: `calc( (${(hasPromo ? config.promoNameFontSize : config.nameFontSize) || 9} / 500) * 100cqh )`,
                                fontWeight: (hasPromo ? config.promoNameBold : config.nameBold) ? '950' : '500',
                                color: (hasPromo ? config.promoNameColor : config.nameColor) || '#1e293b',
                                textAlign: (hasPromo ? config.promoNameAlign : config.nameAlign) || 'center',
                                lineHeight: '1.1',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                width: '100%'
                            }}>
                                {config.text}
                            </div>
                        </div>
                    )}

                    {/* Preço Base (ou Antigo) */}
                    {config.showPrice && (
                        <div style={{
                            position: 'absolute',
                            left: `${(hasPromo ? config.oldPricePosX : config.pricePosX) ?? 50}%`,
                            top: `${(hasPromo ? config.oldPricePosY : config.pricePosY) ?? 60}%`,
                            width: `${(hasPromo ? config.oldPriceWidth : config.priceWidth) ?? 80}%`,
                            height: `${(hasPromo ? config.oldPriceHeight : config.priceHeight) ?? 30}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(hasPromo ? config.oldPriceVAlign : config.priceVAlign),
                            justifyContent: getAlignment(hasPromo ? config.oldPriceAlign : config.priceAlign),
                            backgroundColor: config.priceBgColor || 'transparent',
                            padding: config.priceBgColor && config.priceBgColor !== 'transparent' ? 'calc( (8 / 500) * 100cqh )' : '0'
                        }}>
                            <div style={{ 
                                position: 'relative',
                                fontSize: `calc( (${hasPromo ? (config.oldPriceFontSize || 7) : (config.priceFontSize || 11)} / 500) * 100cqh )`, 
                                fontWeight: (hasPromo ? config.oldPriceBold : config.priceBold) ? '950' : '500', 
                                color: (hasPromo ? (config.oldPriceColor || '#64748b') : (config.priceColor || '#1e293b')),
                                textAlign: (hasPromo ? config.oldPriceAlign : config.priceAlign) || 'center',
                                lineHeight: '1',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                            }}>
                                {config.priceFormat === 'split' ? (String(hasPromo ? config.price : config.price || '').replace('R$', '').split(',')[0].trim()) : (hasPromo ? config.price : config.price)}
                                {hasPromo && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '-5%',
                                        width: '110%',
                                        height: '2px',
                                        backgroundColor: config.oldPriceColor || '#ef4444',
                                        borderRadius: '1px'
                                    }} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preço Dividido (Símbolo e Centavos) */}
                    {config.priceFormat === 'split' && (
                        <>
                            <div style={{
                                position: 'absolute',
                                left: `${(hasPromo ? config.promoPriceSymbolPosX : config.priceSymbolPosX) ?? 35}%`,
                                top: `${(hasPromo ? config.promoPriceSymbolPosY : config.priceSymbolPosY) ?? 55}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: `calc( (${(hasPromo ? config.promoPriceSymbolFontSize : config.priceSymbolFontSize) || 8} / 500) * 100cqh )`,
                                fontWeight: (hasPromo ? config.promoPriceSymbolBold : config.priceSymbolBold) ? '950' : '500',
                                color: (hasPromo ? config.promoPriceSymbolColor : config.priceSymbolColor) || '#1e293b',
                                lineHeight: '1'
                            }}>R$</div>

                            <div style={{
                                position: 'absolute',
                                left: `${(hasPromo ? config.promoPriceDecimalsPosX : config.priceDecimalsPosX) ?? 65}%`,
                                top: `${(hasPromo ? config.promoPriceDecimalsPosY : config.priceDecimalsPosY) ?? 55}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: `calc( (${(hasPromo ? config.promoPriceDecimalsFontSize : config.priceDecimalsFontSize) || 8} / 500) * 100cqh )`,
                                fontWeight: (hasPromo ? config.promoPriceDecimalsBold : config.priceDecimalsBold) ? '950' : '500',
                                color: (hasPromo ? config.promoPriceDecimalsColor : config.priceDecimalsColor) || '#1e293b',
                                lineHeight: '1'
                            }}>,{String(hasPromo ? config.promoPrice : config.price || '').split(',')[1] || '00'}</div>
                        </>
                    )}

                    {/* Preço Promocional */}
                    {hasPromo && config.showPrice && (
                        <div style={{
                            position: 'absolute',
                            left: `${config.promoPosX ?? 50}%`,
                            top: `${config.promoPosY ?? 75}%`,
                            width: `${config.promoWidth ?? 80}%`,
                            height: `${config.promoHeight ?? 30}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(config.promoPriceVAlign),
                            justifyContent: getAlignment(config.promoPriceAlign),
                            backgroundColor: config.promoBgColor || 'transparent',
                            padding: config.promoBgColor && config.promoBgColor !== 'transparent' ? 'calc( (8 / 500) * 100cqh )' : '0'
                        }}>
                            <div style={{ 
                                fontSize: `calc( (${dynamicFontSize} / 500) * 100cqh )`,
                                fontWeight: config.promoPriceBold ? '950' : '500', 
                                color: config.promoPriceColor || '#2563eb',
                                lineHeight: '1',
                                whiteSpace: 'nowrap',
                                textAlign: config.promoPriceAlign || 'center'
                            }}>
                                {config.priceFormat === 'split' ? (String(config.promoPrice || '').replace('R$', '').split(',')[0].trim()) : priceToDisplay}
                            </div>
                        </div>
                    )}

                    {/* Barcode */}
                    {config.showBarcode && (
                        <div style={{
                            position: 'absolute',
                            left: `${(hasPromo ? config.promoBarcodePosX : config.barcodePosX) ?? 50}%`,
                            top: `${(hasPromo ? config.promoBarcodePosY : config.barcodePosY) ?? 85}%`,
                            width: '90%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <Barcode text={config.qrContent || config.sku || ''} height={10} />
                        </div>
                    )}

                    {/* Campos Extras */}
                    {(hasPromo ? config.extraFieldsPromo : config.extraFields || []).map((f: any) => (
                        <div key={f.id} style={{
                            position: 'absolute',
                            left: `${f.x ?? 50}%`,
                            top: `${f.y ?? 50}%`,
                            width: `${f.width ?? 40}%`,
                            transform: 'translate(-50%, -50%)',
                            fontSize: `calc( (${f.size || 10} / 500) * 100cqh )`,
                            fontWeight: f.bold ? '950' : '500',
                            color: f.color || '#1e293b',
                            textAlign: f.align || 'center',
                            lineHeight: '1',
                            whiteSpace: 'nowrap'
                        }}>
                            {f.text}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{config.text}</div>
                <div style={{ fontSize: '14px', fontWeight: '900' }}>{config.price}</div>
            </div>
        </div>
    );
};

export default LabelItem;
