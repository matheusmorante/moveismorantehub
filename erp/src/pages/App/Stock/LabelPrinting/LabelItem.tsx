import React from 'react';
import { LabelConfig } from './Index';
import logoMorante from '../../../../assets/logo.jpeg';

interface Props {
    config: LabelConfig;
    image: string | null;
    index: number;
}

const LabelItem: React.FC<Props> = ({ config, image }) => {
    const isRound = config.type === 'round';
    const isSquare = config.preset === 'qr_product' || config.preset === 'price_only';
    
    // Check if QR is the only active element (ignoring background image)
    const isOnlyQR = config.showQR && 
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

    // Special handling for SKU + NAME in Left Vertical Block and HUGE QR on the Right
    if (config.preset === 'qr_product') {
        return (
            <div style={{
                ...containerStyle,
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: '1mm',
                alignItems: 'stretch',
                gap: 0
            }}>
                {/* Left Section: SKU + NAME (Stacked) */}
                <div style={{
                    width: '30%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRight: '0.1px solid #f1f5f9',
                    paddingRight: '1mm',
                    gap: '1mm'
                }}>
                    <div style={{
                        fontSize: '7.5px',
                        fontWeight: '900',
                        color: '#64748b',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        lineBreak: 'anywhere'
                    }}>
                        {config.sku}
                    </div>
                    <div style={{
                        fontSize: '9px',
                        fontWeight: '950',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        lineHeight: '1.1',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {config.text}
                    </div>
                </div>

                {/* Right Section: Massive QR Code */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                    paddingLeft: '1mm'
                }}>
                    {config.qrContent ? (
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(config.qrContent)}`} 
                            alt="QR Code" 
                            style={{ 
                                height: '98%', 
                                width: 'auto', 
                                maxWidth: '100%',
                                imageRendering: 'pixelated' 
                            }}
                        />
                    ) : (
                        <i className="bi bi-qr-code text-slate-200 text-6xl"></i>
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

                    {/* Bottom: Espaço base ou QR */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: config.showQR ? 'auto' : '1mm' }}>
                        {config.showQR && (
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.qrContent)}`} 
                                alt="QR Code" 
                                style={{ width: '10mm', height: '10mm', imageRendering: 'pixelated', padding: '0.5mm', backgroundColor: 'white', borderRadius: '1mm', border: '1px solid #e2e8f0' }}
                            />
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

                {/* Bottom Section: Preço + QR */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: isOnlyQR ? 'center' : 'flex-end', 
                    justifyContent: isOnlyQR ? 'center' : 'space-between',
                    flex: isOnlyQR ? 1 : 'none',
                    marginTop: 'auto',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: isOnlyQR ? 0 : 1 }}>
                        {!isOnlyQR && config.showPrice && (
                            <div style={{ 
                                fontSize: isSquare ? '16px' : '20px', 
                                fontWeight: '950', 
                                color: '#1d4ed8', // Darker blue for contrast
                                letterSpacing: '-0.04em',
                                lineHeight: '1'
                            }}>
                                {config.price}
                            </div>
                        )}
                    </div>

                    {config.showQR && (
                        <div style={{ 
                            width: isOnlyQR ? (isSquare ? '36mm' : '26mm') : (isSquare ? '15mm' : '11mm'), 
                            height: isOnlyQR ? (isSquare ? '36mm' : '26mm') : (isSquare ? '15mm' : '11mm'), 
                            background: 'white', 
                            padding: isOnlyQR ? '2mm' : '1mm', 
                            border: '1px solid #e2e8f0',
                            borderRadius: isOnlyQR ? '3mm' : '1.5mm',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: isOnlyQR ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : '0 2px 4px 0 rgb(0 0 0 / 0.05)',
                            marginLeft: isOnlyQR ? 0 : '1mm'
                        }}>
                            {config.qrContent ? (
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=${isOnlyQR ? '350x350' : '150x150'}&data=${encodeURIComponent(config.qrContent)}`} 
                                    alt="QR Code" 
                                    style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                                />
                            ) : (
                                <i className="bi bi-qr-code text-slate-200 text-3xl"></i>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LabelItem;
