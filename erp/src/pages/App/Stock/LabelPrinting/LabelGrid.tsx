import React from 'react';
import { LabelConfig } from './Index';
import LabelItem from './LabelItem';

export interface LabelItemConfig {
    name: string;
    price: string;
    promoPrice?: string;
    sku?: string;
    quantity: number;
}

export interface LogoItemConfig {
    image: string;
    quantity: number;
    scale?: number;
    name?: string;
}

interface Props {
    config: LabelConfig;
    image: string | null;
    cellImages?: Record<number, string>;
    onCellClick?: (index: number) => void;
    labelItems?: LabelItemConfig[];
    logoItems?: LogoItemConfig[];
    currentPage?: number;
}

const LabelGrid: React.FC<Props> = ({ config, image, cellImages = {}, onCellClick, labelItems, logoItems, currentPage = 0 }) => {
    const totalCells = config.columns * config.rows;
    
    // Flatten the items into a single array of items to render
    let itemsToRender: any[] = [];
    
    if (labelItems && labelItems.length > 0) {
        labelItems.forEach((item, itemIdx) => {
            const qty = item.quantity || 0;
            for (let i = 0; i < qty; i++) {
                itemsToRender.push({ type: 'product', ...item, originalIdx: itemIdx });
            }
        });
    } else if (logoItems && logoItems.length > 0) {
        logoItems.forEach((item, itemIdx) => {
            const qty = item.quantity || 0;
            for (let i = 0; i < qty; i++) {
                itemsToRender.push({ type: 'logo', ...item, originalIdx: itemIdx });
            }
        });
    } else {
        // Default behavior: render a full grid with the global config
        itemsToRender = Array.from({ length: totalCells }).map((_, i) => ({ type: 'default', index: i }));
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
        overflow: 'hidden',
        position: 'relative'
    };

    return (
        <div style={sheetStyle} className="label-sheet">
            {finalItems.map((item, i) => (
                <div 
                    key={`${i}-${currentPage}`} 
                    onClick={() => onCellClick?.(i)}
                    className={`flex items-center justify-center overflow-hidden transition-all ${config.preset === 'custom' ? 'cursor-pointer hover:bg-blue-50/50 group' : ''}`} 
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                    <LabelItem 
                        config={{
                            ...config,
                            text: item.type === 'product' ? item.name : config.text,
                            price: item.type === 'product' ? item.price : config.price,
                            promoPrice: item.type === 'product' ? item.promoPrice : config.promoPrice,
                            sku: item.type === 'product' ? item.sku : config.sku,
                            // Forçar preto para identificação
                            productNameColor: config.category === 'identificacao' ? '#000000' : config.productNameColor,
                            promoPriceColor: config.category === 'identificacao' ? '#000000' : config.promoPriceColor,
                            oldPriceColor: config.category === 'identificacao' ? '#000000' : config.oldPriceColor,
                        }} 
                        image={item.type === 'logo' ? item.image : (cellImages[i] || image)} 
                        index={i} 
                        scale={item.scale}
                    />
                    {config.preset === 'custom' && !cellImages[i] && !image && item.type === 'default' && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="bi bi-plus-circle text-blue-500 text-xl" />
                        </div>
                    )}
                </div>
            ))}
            
            {/* Mantém células vazias para completar o grid se necessário (estético no preview) */}
            {finalItems.length < totalCells && Array.from({ length: totalCells - finalItems.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-slate-50 dark:border-slate-800" />
            ))}
            
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
                    .print-only * {
                        visibility: visible !important;
                    }
                    .label-sheet {
                        box-shadow: none !important;
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
