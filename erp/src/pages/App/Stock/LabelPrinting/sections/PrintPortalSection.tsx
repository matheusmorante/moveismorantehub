import React from 'react';
import { PrintPortalSectionProps } from '../types/LabelPrintingSections.types';
import { createPortal } from 'react-dom';
import LabelGrid from '../components/LabelGrid';

export const PrintPortalSection: React.FC<PrintPortalSectionProps> = (props) => {
    const { 
        config, selectedCategory, logoItems, labelItems, savedArtConfigs, 
        printingMode, artVersion, selectedImage, cellImages 
    } = props;

    return createPortal(
                 <div className="print-only">
                      {(() => {
                         const totalCells = config.columns * config.rows;
                         const count = ((selectedCategory as string) === 'logos') 
                             ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                             : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                         const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                         const activeLayoutId = String(config.layoutId || 'preco_2x5_restored');
                         const activeArtConfig = savedArtConfigs[activeLayoutId] || savedArtConfigs['preco_2x5_restored'] || config.artConfig;

                         return Array.from({ length: totalPagesCount }).map((_, pageIdx) => (
                             <div key={pageIdx} style={{ pageBreakAfter: 'always' }}>
                                 <LabelGrid 
                                     config={{ ...config, printingMode, _artVersion: artVersion, artConfig: activeArtConfig }} 
                                     image={selectedImage} 
                                     cellImages={cellImages}
                                     labelItems={labelItems}
                                     logoItems={logoItems}
                                     currentPage={pageIdx}
                                 />
                             </div>
                         ));
                      })()}
                 </div>,
        document.body
    );
};
