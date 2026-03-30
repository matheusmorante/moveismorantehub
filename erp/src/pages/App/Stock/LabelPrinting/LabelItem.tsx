import React, { useEffect, useRef, useState } from 'react';
import { LabelConfig } from './Index';
import logoMorante from '../../../../assets/logo.jpeg';
import bwipjs from 'bwip-js';

interface Props {
    config: LabelConfig;
    image: string | null;
    index: number;
}

const Barcode: React.FC<{ text: string; height?: number }> = ({ text, height = 15 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (canvasRef.current && text) {
            try {
                bwipjs.toCanvas(canvasRef.current, {
                    bcid: 'code128',       // Barcode type
                    text: text,            // Text to encode
                    scale: 3,              // 3x scaling factor
                    height: height,        // Bar height
                    includetext: true,     // Show human-readable text
                    textxalign: 'center',  // Center the text
                    backgroundcolor: 'ffffff'
                });
                setError(false);
            } catch (e) {
                console.error('Barcode error:', e);
                setError(true);
            }
        }
    }, [text, height]);

    if (error) return <div className="text-[8px] text-red-500">Erro no Código</div>;
    return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
};

const LabelItem: React.FC<Props> = ({ config, image }) => {
    const isRound = config.type === 'round';
    const isSquare = config.preset === 'qr_product' || config.preset === 'price_only';
    
    // Check if Barcode is the only active element (ignoring background image)
    const isOnlyBarcode = config.showBarcode && 
        !config.showName && 
        !config.showPrice && 
        !config.showSKU && 
        !config.showStoreLogo && 
        !config.showStoreName;
    
    // Contêiner base (Redondo vs Retangular vs Quadrado)
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
        containerStyle = {
            ...containerStyle,
            width: '42mm',
            height: '42mm',
            borderRadius: '50%',
            flexDirection: 'column',
            padding: '5mm'
        };
    } else {
        // Retangular / Quadrado (Fluido com o grid)
        containerStyle = {
            ...containerStyle,
            width: '100%',
            height: '100%',
            flexDirection: config.layout === 'horizontal' ? 'row' : 'column',
            padding: '1.5mm',
            gap: '1mm'
        };
    }

    // Renderização para Modelos Redondos (MDF ou LOGO)
    if (isRound) {
        return (
            <div style={containerStyle}>
                {image && (
                    <img 
                        src={image} 
                        alt="Background" 
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            inset: 0,
                            zIndex: 1,
                            transform: `scale(${config.imageScale || 1})`,
                            transition: 'transform 0.2s ease-out'
                        }} 
                    />
                )}
                
                {config.preset === 'store_logo' && !image && (
                    <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <img 
                            src={logoMorante} 
                            alt="Store Logo" 
                            style={{ 
                                width: '25mm', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                transform: `scale(${config.imageScale || 1})`,
                                transition: 'transform 0.2s ease-out'
                            }} 
                        />
                    </div>
                )}
            </div>
        );
    }

    // IDENTIFICAÇÃO DE PRODUTO (SKU/NOME TOP + CÓD. BARRAS BOTTOM)
    if (config.preset === 'qr_product') {
        return (
            <div style={{
                ...containerStyle,
                flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '2mm',
                gap: '1.5mm',
                alignItems: 'stretch'
            }}>
                {/* Top Section: SKU + NAME in a single row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '2mm',
                    borderBottom: '0.1px solid #f1f5f9',
                    paddingBottom: '1mm'
                }}>
                    {config.showSKU && (
                        <div style={{
                            fontSize: '8px',
                            fontWeight: '900',
                            color: '#1e293b',
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            padding: '0.2mm 1mm',
                            borderRadius: '0.5mm',
                            whiteSpace: 'nowrap'
                        }}>
                            {config.sku}
                        </div>
                    )}
                    {config.showName && (
                        <div style={{
                            fontSize: '10px',
                            fontWeight: '950',
                            color: '#0f172a',
                            textTransform: 'uppercase',
                            lineHeight: '1',
                            flex: 1,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis'
                        }}>
                            {config.text}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Wide Barcode Area */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                    width: '100%',
                    overflow: 'hidden'
                }}>
                    {config.qrContent ? (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Barcode text={config.qrContent} height={22} />
                        </div>
                    ) : (
                        <i className="bi bi-barcode text-slate-200 text-6xl"></i>
                    )}
                </div>
            </div>
        );
    }

    // Special handling for Price Only Label (Etiqueta de Preço)
    if (config.preset === 'price_only') {
        return (
            <div style={{
                ...containerStyle,
                flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '2mm',
                gap: 0
            }}>
                {/* Imagem de Fundo/Marca d'água */}
                {image && (
                    <img 
                        src={image} 
                        alt="" 
                        style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', 
                            opacity: 0.1, 
                            zIndex: 0,
                            transform: `scale(${config.imageScale || 1})`,
                            transition: 'transform 0.2s ease-out'
                        }} 
                    />
                )}
                
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%', 
                    width: '100%',
                    justifyContent: 'space-between', 
                    zIndex: 2,
                }}>
                    {/* Top: Título do Produto (Esquerda) */}
                    <div style={{ width: '100%', textAlign: 'left', minHeight: '6mm' }}>
                        {config.showName && (
                            <div style={{ 
                                fontSize: '10px', 
                                fontWeight: '900', 
                                color: '#0f172a', 
                                textTransform: 'uppercase', 
                                lineHeight: '1.05', 
                                letterSpacing: '-0.02em',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {config.text}
                            </div>
                        )}
                    </div>
                    
                    {/* Middle: Preço Centralizado Gigante */}
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: '100%',
                        padding: '1mm 0'
                    }}>
                        {config.showPrice && (
                            <div style={{ 
                                fontSize: '28px',
                                fontWeight: '950', 
                                color: '#1d4ed8', 
                                letterSpacing: '-0.05em',
                                lineHeight: '1',
                                textAlign: 'center',
                                width: '100%',
                                whiteSpace: 'nowrap'
                            }}>
                                {config.price}
                            </div>
                        )}
                    </div>

                    {/* Bottom: Barcode Space */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: config.showBarcode ? 'auto' : '1mm', width: '100%' }}>
                        {config.showBarcode && (
                           <div style={{ width: '100%', maxWidth: '30mm', padding: '0.5mm', backgroundColor: 'white', borderRadius: '0.5mm', border: '0.5px solid #e2e8f0' }}>
                               <Barcode text={config.qrContent} height={8} />
                           </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Renderização para Modelos Quadrados ou Retangulares (Default)
    return (
        <div style={containerStyle}>
            {/* Marca d'água ou fundo se houver imagem customizada */}
            {image && (
                <img 
                    src={image} 
                    alt="" 
                    style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        opacity: 0.1, 
                        zIndex: 0,
                        transform: `scale(${config.imageScale || 1})`,
                        transition: 'transform 0.2s ease-out'
                    }} 
                />
            )}

            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                width: '100%',
                justifyContent: 'space-between', 
                zIndex: 2,
            }}>
                {/* Top Section: Logo + SKU */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {config.showStoreLogo && (
                         <img 
                            src={logoMorante} 
                            alt="Logo" 
                            style={{ 
                                height: '7mm', 
                                width: '7mm', 
                                borderRadius: '50%', 
                                objectFit: 'cover', 
                                border: '1px solid #f1f5f9',
                                transform: `scale(${config.imageScale || 1})`,
                                transition: 'transform 0.2s ease-out'
                            }} 
                        />
                    )}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '60%' }}>
                        {config.showSKU && (
                            <div style={{ 
                                fontSize: '8px', 
                                color: '#1e293b', 
                                fontWeight: '900', 
                                fontFamily: 'monospace',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #f1f5f9',
                                padding: '0.2mm 1.5mm',
                                borderRadius: '0.8mm',
                                marginTop: '0.5mm'
                            }}>
                                {config.sku}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Middle Section: Descrição */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5mm 0' }}>
                    {config.showName && (
                        <div style={{ 
                            fontSize: config.text.length > 30 ? (isSquare ? '8px' : '9px') : (isSquare ? '9.5px' : '10.5px'), 
                            fontWeight: '900', 
                            color: '#0f172a', 
                            textTransform: 'uppercase', 
                            lineHeight: '1', 
                            textAlign: 'center',
                            maxHeight: '3em',
                            overflow: 'hidden',
                            letterSpacing: '-0.02em',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {config.text}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Preço + Barcode */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: isOnlyBarcode ? 'center' : 'flex-end', 
                    justifyContent: isOnlyBarcode ? 'center' : 'space-between',
                    flex: isOnlyBarcode ? 1 : 'none',
                    marginTop: 'auto',
                    width: '100%',
                    gap: isOnlyBarcode ? '2mm' : '1mm'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: isOnlyBarcode ? 0 : 1 }}>
                        {!isOnlyBarcode && config.showPrice && (
                            <div style={{ 
                                fontSize: isSquare ? '16px' : '20px', 
                                fontWeight: '950', 
                                color: '#1d4ed8', 
                                letterSpacing: '-0.04em',
                                lineHeight: '1'
                            }}>
                                {config.price}
                            </div>
                        )}
                    </div>
                    {config.showBarcode && (
                        <div style={{ 
                            width: isOnlyBarcode ? '90%' : (isSquare ? '100%' : '20mm'), 
                            background: 'white', 
                            padding: isOnlyBarcode ? '2mm' : '0.5mm', 
                            border: '0.5px solid #e2e8f0',
                            borderRadius: '1mm',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: isOnlyBarcode ? 0 : '1mm',
                            overflow: 'hidden'
                        }}>
                            {config.qrContent ? (
                                <Barcode text={config.qrContent} height={isOnlyBarcode ? 25 : 12} />
                            ) : (
                                <i className="bi bi-barcode text-slate-200 text-3xl"></i>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LabelItem;
