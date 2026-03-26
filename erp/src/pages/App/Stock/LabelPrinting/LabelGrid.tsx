import React from 'react';
import { LabelConfig } from './Index';
import LabelItem from './LabelItem';

interface Props {
    config: LabelConfig;
    image: string | null;
    cellImages?: Record<number, string>;
    onCellClick?: (index: number) => void;
}

const LabelGrid: React.FC<Props> = ({ config, image, cellImages = {}, onCellClick }) => {
    const isRound = config.type === 'round';
    
    // Total items based on layout
    // Round: 4 columns x 6 rows = 24
    // Rect: 3 columns x 7 rows = 21 (as requested "3x7")
    const count = isRound ? 24 : 21;
    const columns = isRound ? 4 : 3;
    
    // Style for the A4 sheet
    const sheetStyle: React.CSSProperties = {
        width: '216mm',
        height: '279mm',
        backgroundColor: 'white',
        margin: '0 auto',
        padding: `${config.marginT}mm ${config.marginR}mm ${config.marginB}mm ${config.marginL}mm`, 
        display: 'grid',
        gridTemplateColumns: isRound ? `repeat(${columns}, 42mm)` : `repeat(${columns}, 1fr)`,
        gridTemplateRows: isRound ? `repeat(6, 42mm)` : `repeat(7, 1fr)`,
        rowGap: `${config.gapV}mm`,
        columnGap: `${config.gapH}mm`,
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    return (
        <div style={sheetStyle} className="label-sheet">
            {Array.from({ length: count }).map((_, i) => (
                <div 
                    key={i} 
                    onClick={() => onCellClick?.(i)}
                    className={`flex items-center justify-center overflow-hidden transition-all ${config.preset === 'custom' ? 'cursor-pointer hover:bg-blue-50/50 group' : ''}`} 
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                    <LabelItem 
                        config={config} 
                        image={cellImages[i] || image} 
                        index={i} 
                    />
                    {config.preset === 'custom' && !cellImages[i] && !image && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="bi bi-plus-circle text-blue-500 text-xl" />
                        </div>
                    )}
                </div>
            ))}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: 216mm 279mm;
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
                        width: 216mm !important;
                        height: 279mm !important;
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
