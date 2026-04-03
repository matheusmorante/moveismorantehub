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

    if (config.preset === 'qr_product') {
        return (
            <div style={{ ...containerStyle, flexDirection: 'column', justifyContent: 'space-between', padding: '2mm' }}>
                <div style={{ borderBottom: '0.1px solid #f1f5f9', paddingBottom: '1mm', width: '100%', display: 'flex', gap: '2mm', alignItems: 'center' }}>
                    {config.showSKU && <span style={{ fontSize: '7px', fontWeight: 'bold', background: '#f1f5f9', padding: '0.2mm 1mm' }}>{config.sku}</span>}
                    <span style={{ fontSize: `${config.nameFontSize || 7}px`, fontWeight: '900', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{config.text}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <Barcode text={config.qrContent || config.sku} height={20} />
                </div>
            </div>
        );
    }

    if (config.preset === 'price_only' || config.preset === 'promotional_price' || config.preset === 'custom') {
        const hasPromo = config.showPromoPrice && config.promoPrice;
        const priceToDisplay = hasPromo ? config.promoPrice : config.price;

        const getAlignment = (align?: string) => align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        const getVAlignment = (valign?: string) => valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';

        // Lógica de cálculo de fonte dinâmica (Centena vs Milhar)
        const getDynamicPriceFontSize = () => {
            const baseSize = hasPromo ? (config.promoPriceFontSize || 24) : (config.priceFontSize || 24);
            const priceStr = priceToDisplay ? String(priceToDisplay).replace(/\D/g, '') : '';
            const digits = priceStr.length;
            
            if (digits >= 6) { // Milhar (ex: 1.000,00 -> 100000 tem 6 dígitos)
                return baseSize + (config.priceFontSizeThousands || 0);
            } else if (digits >= 5) { // Centena (ex: 100,00 -> 10000 tem 5 dígitos)
                return baseSize + (config.priceFontSizeHundreds || 0);
            }
            return baseSize;
        };

        const dynamicFontSize = getDynamicPriceFontSize();

        return (
            <div style={{ ...containerStyle, position: 'relative', padding: '1mm', backgroundColor: config.bg_color || 'white' }}>
                {image && (
                    <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, zIndex: 0, transform: `scale(${activeScale})` }} />
                )}

                <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                    {/* Nome com Área de Segurança */}
                    {config.showName && (
                        <div style={{
                            position: 'absolute',
                            left: `${config.namePosX ?? 50}%`,
                            top: `${config.namePosY ?? 25}%`,
                            width: `${config.nameWidth ?? 80}%`,
                            height: `${config.nameHeight ?? 20}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(config.nameVAlign),
                            justifyContent: getAlignment(config.nameAlign),
                            backgroundColor: config.nameBgColor || 'transparent',
                            padding: config.nameBgColor && config.nameBgColor !== 'transparent' ? '4px' : '0'
                        }}>
                            <div style={{
                                fontSize: `${config.nameFontSize || 9}px`,
                                fontWeight: config.nameBold ? '950' : '500',
                                color: config.nameColor || '#1e293b',
                                textAlign: config.nameAlign || 'center',
                                lineHeight: '1.1',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                width: '100%'
                            }}>
                                {config.text}
                            </div>
                        </div>
                    )}

                    {/* Preço (Normal ou Antigo Riscado) */}
                    {config.showPrice && (
                        <div style={{
                            position: 'absolute',
                            left: `${config.pricePosX ?? 50}%`,
                            top: `${config.pricePosY ?? 60}%`,
                            width: `${config.priceWidth ?? 80}%`,
                            height: `${config.priceHeight ?? 30}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(hasPromo ? config.oldPriceVAlign : config.priceVAlign),
                            justifyContent: getAlignment(hasPromo ? config.oldPriceAlign : config.priceAlign),
                            backgroundColor: config.priceBgColor || 'transparent',
                            padding: config.priceBgColor && config.priceBgColor !== 'transparent' ? '4px' : '0'
                        }}>
                            <div style={{ 
                                position: 'relative',
                                fontSize: `${hasPromo ? (config.oldPriceFontSize || 7) : (config.priceFontSize || 11)}px`, 
                                fontWeight: (hasPromo ? config.oldPriceBold : config.priceBold) ? '950' : '500', 
                                color: (hasPromo ? (config.oldPriceColor || '#64748b') : (config.priceColor || '#1e293b')),
                                textAlign: (hasPromo ? config.oldPriceAlign : config.priceAlign) || 'center',
                                lineHeight: '1',
                                display: 'inline-block'
                            }}>
                                {config.price}
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

                    {/* Novo Preço Promocional */}
                    {hasPromo && config.showPrice && (
                        <div style={{
                            position: 'absolute',
                            left: `${config.promoPosX ?? 50}%`,
                            top: `${config.promoPosY ?? 75}%`,
                            width: `${config.promoWidth ?? 80}%`,
                            height: `${config.promoHeight ?? 40}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: getVAlignment(config.promoPriceVAlign),
                            justifyContent: getAlignment(config.promoPriceAlign),
                            backgroundColor: config.promoBgColor || 'transparent',
                            padding: config.promoBgColor && config.promoBgColor !== 'transparent' ? '4px' : '0'
                        }}>
                            <div style={{ 
                                fontSize: `${dynamicFontSize}px`, 
                                fontWeight: config.promoPriceBold ? '950' : '500', 
                                color: config.promoPriceColor || '#2563eb',
                                lineHeight: '1',
                                whiteSpace: 'nowrap',
                                textAlign: config.promoPriceAlign || 'center'
                            }}>
                                {priceToDisplay}
                            </div>
                        </div>
                    )}

                    {/* Barcode / SKU */}
                    {config.showBarcode && (
                        <div style={{
                            position: 'absolute',
                            left: `${config.barcodePosX ?? 50}%`,
                            top: `${config.barcodePosY ?? 85}%`,
                            width: '90%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <Barcode text={config.qrContent || config.sku} height={10} />
                        </div>
                    )}
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
