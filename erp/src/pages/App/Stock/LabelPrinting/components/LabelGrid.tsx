import React, { useEffect } from 'react';
import type { LabelConfig } from '../utils/LabelConstants';
import LabelItem from './LabelItem';
import { calculateLabelPhysicalSize } from '../utils/LabelPhysicalGeometry';
import {
  expandLabelItems,
  getLabelGridPageItems,
  getLabelPaperDimensions,
} from '../utils/labelGridLayout';
import type { LabelItemConfig, LogoItemConfig } from '../types/LabelGridItem.types';
export type { LabelItemConfig, LogoItemConfig } from '../types/LabelGridItem.types';

interface Props {
  config: LabelConfig;
  image: string | null;
  cellImages?: Record<number, string | null>;
  onCellClick?: (index: number) => void;
  labelItems?: LabelItemConfig[];
  logoItems?: LogoItemConfig[];
  currentPage?: number;
  previewMode?: boolean;
}

const LabelGrid: React.FC<Props> = ({
  config,
  image,
  cellImages = {},
  onCellClick,
  labelItems,
  logoItems,
  currentPage = 0,
  previewMode = false,
}) => {
  const totalCells = config.columns * config.rows;

  const isLogos = config.category === 'logos';
  const sourceItems = isLogos ? logoItems || [] : labelItems || [];
  const itemsToRender = expandLabelItems(sourceItems, isLogos ? 'logo' : 'product');
  const finalItems = getLabelGridPageItems(itemsToRender, totalCells, currentPage);
  const dimensions = getLabelPaperDimensions(config);
  const labelPhysicalSize = calculateLabelPhysicalSize(config);

  // Injeta os estilos de impressao dinamicamente no document.head para evitar conflito com display: none no #root
  useEffect(() => {
    const styleId = 'label-printing-global-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
            @media print {
                @page {
                    size: ${dimensions.w} ${dimensions.h};
                    margin: 0;
                }
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                }
                /* Oculta tudo que esta no body exceto o portal de impressao */
                body > *:not(.print-only) {
                    display: none !important;
                }
                .print-only {
                    display: block !important;
                    position: static !important;
                    visibility: visible !important;
                    left: auto !important;
                    top: auto !important;
                    width: ${dimensions.w} !important;
                    height: auto !important;
                    background: white !important;
                }
                .label-sheet {
                    box-shadow: none !important;
                    border: none !important;
                    overflow: hidden !important;
                }
                .label-item-container {
                     border: none !important;
                     overflow: visible !important;
                }
                .label-item-bleed-container {
                     overflow: visible !important;
                }
            }
            @media screen {
                .print-only {
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                    width: ${dimensions.w} !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
            }
        `;

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [dimensions.w, dimensions.h]);

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
    zIndex: 1,
  };

  return (
    <div
      className="label-sheet-container"
      style={{
        width: '100%',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: 0,
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          ...sheetStyle,
          transform: previewMode ? 'scale(0.85)' : 'none',
          transformOrigin: 'top center',
          boxShadow: previewMode ? '0 20px 50px -12px rgb(0 0 0 / 0.15)' : 'none',
          margin: previewMode ? '0 auto 40px' : '0 auto',
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
              className={`flex items-center justify-center transition-all duration-200 relative overflow-visible group ${
                config.preset === 'custom' ? 'cursor-pointer hover:bg-blue-50/50' : ''
              }`}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'visible',
                border: previewMode ? '1px solid #cbd5e1' : 'none',
                borderRadius: previewMode ? '4px' : 0,
                boxSizing: 'border-box',
              }}
            >
              {item
                ? (() => {
                    let itemConfig: any = {
                      ...config,
                      printingMode: item.printingMode || config.printingMode,
                      isBlank: item.isBlank,
                      showName: item.showName !== false,
                      text: item.isBlank
                        ? ''
                        : item.showName === false
                          ? ''
                          : item.name || (item.type === 'logo' ? '' : config.text || ''),
                      price: item.isBlank
                        ? ''
                        : item.price || (item.type === 'logo' ? '' : config.price || ''),
                      promoPrice: item.isBlank
                        ? ''
                        : item.promoPrice || (item.type === 'logo' ? '' : config.promoPrice || ''),
                      showPromoPrice: item.isBlank
                        ? false
                        : (item.showPromoPrice ??
                          Boolean(item.promoPrice && item.promoPrice.trim() !== '')),
                      sku: item.isBlank
                        ? ''
                        : item.sku || (item.type === 'logo' ? '' : config.sku || ''),
                      extraFields: item.isBlank
                        ? []
                        : item.extraFields ||
                          (item.type === 'logo' ? [] : config.extraFields || []),
                      imageFit: item.imageFit || config.imageFit,
                      opportunityId: item.opportunityId || item.opportunity_id || 'none',
                      opportunity_id: item.opportunityId || item.opportunity_id || 'none',
                      labelWidth: labelPhysicalSize.widthMm,
                      labelHeight: labelPhysicalSize.heightMm,
                    };

                    if (config.category === 'precos' && !item.isBlank) {
                      itemConfig = {
                        ...itemConfig,
                        artConfig: config.artConfig,
                      };
                    }

                    return (
                      <LabelItem
                        config={itemConfig}
                        image={
                          item.isBlank
                            ? null
                            : item.image ||
                              (item.type === 'logo' ? item.image : cellImages[i] || image) ||
                              null
                        }
                        index={i}
                        scale={item.scale ?? config.imageScale}
                        rotation={item.rotation || 0}
                        hideBleedBorder={!previewMode}
                        uuid={item.uuid}
                        previewMode={previewMode}
                      />
                    );
                  })()
                : config.preset === 'custom' &&
                  !cellImages[i] &&
                  !image &&
                  !item && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="bi bi-plus-circle text-blue-500 text-xl" />
                    </div>
                  )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LabelGrid;
