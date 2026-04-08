import React from 'react';
import { LabelConfig } from './LabelConstants';
import LabelItem from './LabelItem';

export interface LabelItemConfig {
    name: string;
    price: string;
    promoPrice?: string;
    sku?: string;
    quantity: number;
    image?: string;
    scale?: number;
    rotation?: number;
    imageFit?: 'contain' | 'cover' | 'fill';
    extraFields?: any[];
}

export interface LogoItemConfig {
    image: string;
    quantity: number;
    scale?: number;
    rotation?: number;
    name?: string;
    imageFit?: 'contain' | 'cover' | 'fill';
    price?: string;
    promoPrice?: string;
    sku?: string;
    extraFields?: any[];
}

interface Props {
    config: LabelConfig;
    image: string | null;
    cellImages?: Record<number, string>;
    onCellClick?: (index: number) => void;
    labelItems?: LabelItemConfig[];
    logoItems?: LogoItemConfig[];
    currentPage?: number;
    previewMode?: boolean;
}

const LabelGrid: React.FC<Props> = ({ config, image, cellImages = {}, onCellClick, labelItems, logoItems, currentPage = 0, previewMode = false }) => {
    const totalCells = config.columns * config.rows;
    
    const isLogos = config.category === 'logos';
    const sourceItems = isLogos ? (logoItems || []) : (labelItems || []);
    
    // Flatten the items into a single array of items to render
    let itemsToRender: any[] = [];
    
    if (sourceItems.length > 0) {
        sourceItems.forEach((item, itemIdx) => {
            const qty = Number(item.quantity || 0);
            for (let i = 0; i < qty; i++) {
                itemsToRender.push({ 
                    type: isLogos ? 'logo' : 'product', 
                    ...item, 
                    originalIdx: itemIdx 
                });
            }
        });
    }

    // Garantir que a grade fique vazia se não houver itens selecionados
    if (itemsToRender.length === 0) {
        itemsToRender = [];
    }

    // Slice items for the current page
    const startIdx = currentPage * totalCells;
    const finalItems = itemsToRender.slice(startIdx, startIdx + totalCells);

    // Sizing logic based on paper
    const getPaperSize = () => {
        if (config.paperSize === 'A3') return { w: '297mm', h: '420mm' };
        if (config.paperSize === 'A5') return { w: '148mm', h: '210mm' };
        if (config.paperSize === 'Letter') return { w: '216mm', h: '279mm' };
        if (config.paperSize === 'Custom' && config.paperWidth && config.paperHeight) {
            return { w: `${config.paperWidth}mm`, h: `${config.paperHeight}mm` };
        }
        return { w: '210mm', h: '297mm' }; // Default A4
    };

    const dimensions = getPaperSize();

    // Style for the sheet
    const sheetStyle: React.CSSProperties = {
        width: dimensions.w,
        height: dimensions.h,
        backgroundColor: 'white',
        margin: '0 auto',
        padding: `${config.marginT}mm ${config.marginR}mm ${config.marginB}mm ${config.marginL}mm`, 
        display: 'grid',
        gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
        rowGap: `${config.gapV}mm`,
        columnGap: `${config.gapH}mm`,
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden', // Mantém o recorte da imagem e conteúdo na folha
        position: 'relative',
        zIndex: 1
    };

    // Layer for overflowing bleed borders
    const bleedOverlayStyle: React.CSSProperties = {
        ...sheetStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'transparent',
        overflow: 'visible',
        zIndex: 10,
        pointerEvents: 'none'
    };

    return (
        <div 
            className="label-sheet-container"
            style={{ 
                width: '100%', 
                overflow: 'auto', 
                display: 'flex', 
                justifyContent: 'center',
                padding: previewMode ? '10px' : 0,
                backgroundColor: previewMode ? '#f8fafc' : 'transparent'
            }}
        >
            <div 
                style={{
                    ...sheetStyle,
                    transform: previewMode ? 'scale(0.85)' : 'none',
                    transformOrigin: 'top center',
                    boxShadow: previewMode ? '0 20px 50px -12px rgb(0 0 0 / 0.15)' : 'none',
                    margin: previewMode ? '0 auto 40px' : '0 auto'
                }} 
                className="label-sheet"
            >
                {/* Camada 1: Conteúdo Recortado pela Folha (Imagens, Textos) */}
                {Array.from({ length: totalCells }).map((_, i) => {
                    const item = finalItems[i];
                    return (
                        <div 
                            key={`content-${i}-${currentPage}`} 
                            onClick={() => onCellClick?.(i)}
                            className={`flex items-center justify-center overflow-hidden transition-all ${config.preset === 'custom' ? 'cursor-pointer hover:bg-blue-50/50 group' : ''}`} 
                            style={{ width: '100%', height: '100%', position: 'relative' }}
                        >
                            {item ? (
                                <LabelItem 
                                    config={{
                                        ...config,
                                        text: item.name || (item.type === 'logo' ? '' : (config.text || '')),
                                        price: item.price || (item.type === 'logo' ? '' : (config.price || '')),
                                        promoPrice: item.promoPrice || (item.type === 'logo' ? '' : (config.promoPrice || '')),
                                        sku: item.sku || (item.type === 'logo' ? '' : (config.sku || '')),
                                        extraFields: item.extraFields || (item.type === 'logo' ? [] : (config.extraFields || [])),
                                        imageFit: item.imageFit || config.imageFit,
                                    }} 
                                    image={item.image || (item.type === 'logo' ? item.image : (cellImages[i] || image))} 
                                    index={i} 
                                    scale={item.scale || config.imageScale}
                                    rotation={item.rotation || 0}
                                    hideBleedBorder={true} // Oculta a borda aqui para ela não ser cortada pela folha
                                />
                            ) : (
                                config.preset === 'custom' && !cellImages[i] && !image && (!item || item.type === 'default') && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i className="bi bi-plus-circle text-blue-500 text-xl" />
                                    </div>
                                )
                            )}
                        </div>
                    );
                })}

                {/* Camada 2: Bordas de Sangria (Vazam a folha para visualização) */}
                <div style={bleedOverlayStyle}>
                    {Array.from({ length: totalCells }).map((_, i) => {
                        const item = finalItems[i];
                        return (
                            <div 
                                key={`bleed-${i}-${currentPage}`} 
                                className="flex items-center justify-center overflow-visible" 
                                style={{ width: '100%', height: '100%', position: 'relative' }}
                            >
                                {(item || config.preset === 'custom') ? (
                                    <LabelItem 
                                        config={{ ...config }} 
                                        image={null}
                                        index={i}
                                        hideContent={true} // Esconde textos e imagens nesta camada
                                        hidePhysicalBorder={true} // Esconde a borda de corte
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: ${dimensions.w} ${dimensions.h};
                        margin: 0;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        visibility: hidden !important;
                    }
                    .print-only {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${dimensions.w} !important;
                        height: ${dimensions.h} !important;
                        background: white !important;
                        z-index: 99999 !important;
                    }
                    .print-only *, .label-sheet, .label-item-container {
                        visibility: visible !important;
                    }
                    .label-sheet {
                        box-shadow: none !important;
                        border: none !important;
                        overflow: hidden !important;
                    }
                    .label-item-container {
                         border: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                .print-only {
                    display: none;
                }
            `}} />
        </div>
    );
};

export default LabelGrid;
