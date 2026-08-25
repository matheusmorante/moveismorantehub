import React, { useEffect } from 'react';
import { LabelConfig } from './LabelConstants';
import LabelItem from './LabelItem';
import { calculateLabelPhysicalSize } from './LabelPhysicalGeometry';

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
    isBlank?: boolean;
    opportunityId?: string | null;
    opportunity_id?: string | null;
    showName?: boolean;
    showPromoPrice?: boolean;
    isLogoOnly?: boolean;
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
    isBlank?: boolean;
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

const getMagnitudeForPrice = (priceStr: any): 'tens' | 'hundreds' | 'thousands' => {
    if (!priceStr || typeof priceStr !== 'string') return 'hundreds';
    const parts = priceStr.split(',');
    if (!parts || parts.length === 0) return 'hundreds';
    const integerPart = parts[0].replace(/[^\d]/g, '');
    const length = integerPart.length;
    if (length <= 2) return 'tens';
    if (length === 3) return 'hundreds';
    return 'thousands';
};

const LabelGrid: React.FC<Props> = ({ 
    config, 
    image, 
    cellImages = {}, 
    onCellClick, 
    labelItems, 
    logoItems, 
    currentPage = 0, 
    previewMode = false
}) => {
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
                }
            }
            .print-only {
                display: none !important;
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
        zIndex: 1
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
                            className={`flex items-center justify-center transition-all duration-200 relative overflow-visible group ${
                                config.preset === 'custom' ? 'cursor-pointer hover:bg-blue-50/50' : ''
                            }`} 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                position: 'relative', 
                                overflow: 'visible'
                            }}
                        >
                            {item ? (
                                (() => {
                                    let itemConfig: any = {
                                        ...config,
                                        isBlank: item.isBlank,
                                        showName: item.showName !== false,
                                        text: item.isBlank ? '' : (item.showName === false ? '' : (item.name || (item.type === 'logo' ? '' : (config.text || '')))),
                                        price: item.isBlank ? '' : (item.price || (item.type === 'logo' ? '' : (config.price || ''))),
                                        promoPrice: item.isBlank ? '' : (item.promoPrice || (item.type === 'logo' ? '' : (config.promoPrice || ''))),
                                        showPromoPrice: item.isBlank
                                            ? false
                                            : (item.showPromoPrice ?? Boolean(item.promoPrice && item.promoPrice.trim() !== '')),
                                        sku: item.isBlank ? '' : (item.sku || (item.type === 'logo' ? '' : (config.sku || ''))),
                                        extraFields: item.isBlank ? [] : (item.extraFields || (item.type === 'logo' ? [] : (config.extraFields || []))),
                                        imageFit: item.imageFit || config.imageFit,
                                        opportunityId: item.opportunityId || item.opportunity_id || 'none',
                                        opportunity_id: item.opportunityId || item.opportunity_id || 'none',
                                        labelWidth: labelPhysicalSize.widthMm,
                                        labelHeight: labelPhysicalSize.heightMm,
                                    };

                                    if (config.category === 'precos' && !item.isBlank) {
                                        const oppId = item.opportunityId || item.opportunity_id;
                                        let savedTemplate: string | null = null;

                                        if (oppId) {
                                            const dbTemplate = config.artConfig?.opportunities?.[oppId];
                                            savedTemplate = dbTemplate
                                                ? JSON.stringify(dbTemplate)
                                                : localStorage.getItem(`morante_price_label_art_template_${oppId}`);
                                        }

                                        // Se não encontrou template de oportunidade específica, tenta carregar 'salvado', 'none' ou o global
                                        if (!savedTemplate) {
                                                                                        savedTemplate = oppId === 'none'
                                                                                                ? localStorage.getItem('morante_price_label_art_template_none') ||
                                                                                                    localStorage.getItem('morante_global_price_label_art_template') ||
                                                                                                    localStorage.getItem('price_label_art_global')
                                                                                                : localStorage.getItem('morante_price_label_art_template_salvado') ||
                                                                                                    localStorage.getItem('morante_price_label_art_template_none') ||
                                                                                                    localStorage.getItem('morante_global_price_label_art_template') ||
                                                                                                    localStorage.getItem('price_label_art_global');
                                        }

                                        if (savedTemplate) {
                                            try {
                                                const parsedTemplate = JSON.parse(savedTemplate);
                                                
                                                // Identifica a grandeza do produto atual
                                                const finalDisplayPrice = itemConfig.showPromoPrice ? itemConfig.promoPrice : itemConfig.price;
                                                const currentMag = getMagnitudeForPrice(finalDisplayPrice);
                                                
                                                // Localiza as configurações visuais específicas para essa grandeza
                                                // Fallback: usa a magnitude do template salvo ou qualquer magnitude disponível
                                                const allMagsGrid = parsedTemplate.magnitudeTemplates || {};
                                                let magnitudeDesign: any = allMagsGrid[currentMag]
                                                    || (parsedTemplate.selectedMagnitude && allMagsGrid[parsedTemplate.selectedMagnitude])
                                                    || allMagsGrid['thousands']
                                                    || allMagsGrid['hundreds']
                                                    || allMagsGrid['tens']
                                                    || {};
                                                
                                                const mergedDesign: any = {
                                                    ...parsedTemplate,
                                                    ...magnitudeDesign,
                                                };

                                                // Tradução explícita das propriedades salvas no editor visual para as propriedades consumidas pelo LabelItem
                                                const translatedDesign: any = {};

                                                if (mergedDesign.titlePos) {
                                                    translatedDesign.namePosX = mergedDesign.titlePos.x;
                                                    translatedDesign.namePosY = mergedDesign.titlePos.y;
                                                    translatedDesign.promoNamePosX = mergedDesign.titlePos.x;
                                                    translatedDesign.promoNamePosY = mergedDesign.titlePos.y;
                                                }

                                                if (mergedDesign.titleFontSize !== undefined) {
                                                    translatedDesign.nameFontSize = mergedDesign.titleFontSize;
                                                    translatedDesign.promoNameFontSize = mergedDesign.titleFontSize;
                                                }

                                                if (mergedDesign.titleColor) {
                                                    translatedDesign.nameColor = mergedDesign.titleColor;
                                                    translatedDesign.promoNameColor = mergedDesign.titleColor;
                                                }

                                                const pricePos = mergedDesign.promoPricePos || mergedDesign.normalPricePos;
                                                if (pricePos) {
                                                    translatedDesign.pricePosX = pricePos.x;
                                                    translatedDesign.pricePosY = pricePos.y;
                                                    translatedDesign.promoPosX = pricePos.x;
                                                    translatedDesign.promoPosY = pricePos.y;
                                                }

                                                if (mergedDesign.priceColor) {
                                                    translatedDesign.priceColor = mergedDesign.priceColor;
                                                    translatedDesign.promoPriceColor = mergedDesign.priceColor;
                                                }

                                                if (mergedDesign.bgColor) {
                                                    translatedDesign.bg_color = mergedDesign.bgColor;
                                                }

                                                if (mergedDesign.titleFontFamily) {
                                                    translatedDesign.nameFontFamily = mergedDesign.titleFontFamily;
                                                    translatedDesign.promoNameFontFamily = mergedDesign.titleFontFamily;
                                                    translatedDesign.fontFamily = mergedDesign.titleFontFamily;
                                                }

                                                if (mergedDesign.promoPriceFontFamily) {
                                                    translatedDesign.priceFontFamily = mergedDesign.promoPriceFontFamily;
                                                }

                                                if (mergedDesign.showTitle !== undefined) {
                                                    translatedDesign.showName = mergedDesign.showTitle;
                                                }

                                                // Mescla propriedades de design do template geral, grandeza específica e tradução de chaves
                                                itemConfig = {
                                                    ...itemConfig,
                                                    ...mergedDesign,
                                                    ...translatedDesign,
                                                    // Preserva os dados do produto atual e configurações físicas da folha
                                                    columns: config.columns,
                                                    rows: config.rows,
                                                    marginT: config.marginT,
                                                    marginR: config.marginR,
                                                    marginB: config.marginB,
                                                    marginL: config.marginL,
                                                    gapH: config.gapH,
                                                    gapV: config.gapV,
                                                    paperSize: config.paperSize,
                                                    paperWidth: config.paperWidth,
                                                    paperHeight: config.paperHeight,
                                                    isBlank: item.isBlank,
                                                    text: itemConfig.text,
                                                    price: itemConfig.price,
                                                    promoPrice: itemConfig.promoPrice,
                                                    showPromoPrice: itemConfig.showPromoPrice,
                                                    sku: itemConfig.sku,
                                                    extraFields: itemConfig.extraFields,
                                                };
                                            } catch (e) {
                                                console.error('Erro ao mesclar template de arte:', e);
                                            }
                                        }
                                    }

                                    return (
                                        <LabelItem 
                                            config={itemConfig} 
                                            image={item.isBlank ? null : (item.image || (item.type === 'logo' ? item.image : (cellImages[i] || (config.category === 'precos' ? null : image))))} 
                                            index={i} 
                                            scale={item.scale ?? config.imageScale}
                                            rotation={item.rotation || 0}
                                            hideBleedBorder={true} // Oculta a borda aqui para ela não ser cortada pela folha
                                        />
                                    );
                                })()
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


            </div>
        </div>
    );
};

export default LabelGrid;
