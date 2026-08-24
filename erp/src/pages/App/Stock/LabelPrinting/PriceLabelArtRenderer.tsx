import React, { useRef, useEffect, useState } from 'react';

export interface PriceLabelArtData {
    title: string;
    showTitle?: boolean;
    titleFontSize: number;
    titleColor: string;
    titleFontFamily: string;
    titlePos: { x: number; y: number };
    titleRotation: number;

    deText: string;
    showDe?: boolean;
    deFontSize: number;
    deColor: string;
    deFontFamily: string;
    dePos?: { x: number; y: number };
    deRotation?: number;

    normalPrice: string;
    showNormalPrice?: boolean;
    normalPriceFontSize: number;
    normalPriceColor: string;
    normalPriceFontFamily: string;
    normalPricePos?: { x: number; y: number };
    normalPriceRotation?: number;

    porText: string;
    showPor?: boolean;
    porFontSize: number;
    porColor: string;
    porFontFamily: string;
    porPos?: { x: number; y: number };
    porRotation?: number;

    dePricePorGroupPos: { x: number; y: number };
    dePricePorGroupRotation: number;
    dePricePorGroupGap: number;

    currencySymbol: string;
    showCurrency?: boolean;
    currencyFontSize: number;
    currencyColor: string;
    currencyFontFamily: string;
    currencyPos: { x: number; y: number };
    currencyRotation: number;

    promoPrice: string; // Preço formatado ou dígito do produto
    showPromoPrice?: boolean;
    priceScale: number;
    priceColor: string;
    promoPriceFontFamily: string;
    promoPricePos: { x: number; y: number };
    promoPriceRotation: number;

    centsText: string;
    showCents?: boolean;
    centsFontSize: number;
    centsColor: string;
    centsFontFamily: string;
    centsPos: { x: number; y: number };
    centsRotation: number;

    installments?: string;
    showInstallments?: boolean;
    installmentsFontSize?: number;
    installmentsColor?: string;
    installmentsFontFamily?: string;
    installmentsPos?: { x: number; y: number };
    installmentsRotation?: number;

    bgColor: string;

    // Modos de visualização de design em camadas (editor)
    showPromoPriceThousands?: boolean;
    showPromoPriceHundreds?: boolean;
    showPromoPriceTens?: boolean;
    scaleThousands?: number;
    scaleHundreds?: number;
    scaleTens?: number;
    testMilharStr?: string;
    testCentenaStr?: string;
    testDezenaStr?: string;
    selectedMagnitude?: 'tens' | 'hundreds' | 'thousands';
}

export interface PriceLabelArtRendererProps {
    data: PriceLabelArtData;
    mode?: 'edit' | 'view';
    selectedElement?: any;
    selectedElements?: Set<any>;
    onSelectElement?: (element: any, e: React.MouseEvent) => void;
    startDragging?: (layer: any, e: React.MouseEvent | React.TouchEvent) => void;
    startResizing?: (layer: any, e: React.MouseEvent | React.TouchEvent) => void;
    startRotating?: (layer: any, e: React.MouseEvent | React.TouchEvent) => void;
    showSafetyMargin?: boolean;
    activeGuideX?: number | null;
    activeGuideY?: number | null;
    className?: string;
    style?: React.CSSProperties;
    containerRefOut?: React.RefObject<HTMLDivElement>;
}

export const BASE_ART_WIDTH = 840;
export const BASE_ART_HEIGHT = 480;

export const PriceLabelArtRenderer: React.FC<PriceLabelArtRendererProps> = ({
    data,
    mode = 'view',
    selectedElement = null,
    selectedElements = new Set(),
    onSelectElement,
    startDragging,
    startResizing,
    startRotating,
    showSafetyMargin = false,
    activeGuideX = null,
    activeGuideY = null,
    className = '',
    style = {},
    containerRefOut
}) => {
    const isEdit = mode === 'edit';
    const localContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = containerRefOut || localContainerRef;

    const [scale, setScale] = useState<number>(1);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateScale = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const s = Math.min(rect.width / BASE_ART_WIDTH, rect.height / BASE_ART_HEIGHT);
                setScale(s > 0 ? s : 1);
            }
        };
        updateScale();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateScale);
            observer.observe(el);
            return () => observer.disconnect();
        }
    }, [containerRef]);

    const {
        title, showTitle = true, titleFontSize, titleColor, titleFontFamily, titlePos, titleRotation,
        deText, showDe = true, deFontSize, deColor, deFontFamily, deRotation = 0,
        normalPrice, showNormalPrice = true, normalPriceFontSize, normalPriceColor, normalPriceFontFamily, normalPriceRotation = 0,
        porText, showPor = true, porFontSize, porColor, porFontFamily, porRotation = 0,
        dePricePorGroupPos, dePricePorGroupRotation, dePricePorGroupGap,
        currencySymbol, showCurrency = true, currencyFontSize, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice = true, priceScale, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation,
        centsText, showCents = true, centsFontSize, centsColor, centsFontFamily, centsPos, centsRotation,
        installments, showInstallments = false, installmentsFontSize = 14, installmentsColor = '#000000', installmentsFontFamily = 'Inter, system-ui, sans-serif', installmentsPos = { x: 0, y: 0 }, installmentsRotation = 0,
        bgColor,
        showPromoPriceThousands, showPromoPriceHundreds, showPromoPriceTens,
        scaleThousands = 80, scaleHundreds = 100, scaleTens = 120,
        testMilharStr, testCentenaStr, testDezenaStr,
        selectedMagnitude = 'hundreds'
    } = data;

    const content = (
        <div
            style={{
                width: `${BASE_ART_WIDTH}px`,
                height: `${BASE_ART_HEIGHT}px`,
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center',
                overflow: 'visible',
                pointerEvents: isEdit ? 'auto' : 'none'
            }}
        >
            {/* GUIA DE MARGEM DE SEGURANÇA DA IMPRESSÃO (EDITOR) */}
            {isEdit && showSafetyMargin && (
                <div 
                    data-hide-export="true"
                    className="absolute inset-3 sm:inset-4 border border-dashed border-red-500/60 pointer-events-none rounded-2xl z-20"
                />
            )}

            {/* LINHAS GUIA MAGNÉTICAS DE ALINHAMENTO (EDITOR) */}
            {isEdit && activeGuideX !== null && (
                <div
                    data-hide-export="true"
                    style={{ left: `calc(50% + ${activeGuideX}px)` }}
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
                />
            )}
            {isEdit && activeGuideY !== null && (
                <div
                    data-hide-export="true"
                    style={{ top: `calc(50% + ${activeGuideY}px)` }}
                    className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
                />
            )}

            {/* 1. CABEÇALHO DA ETIQUETA: NOME DO PRODUTO */}
            {showTitle && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('title', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('title', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('title', e) : undefined}
                    style={{ 
                        color: titleColor, 
                        fontSize: `${titleFontSize}px`,
                        fontFamily: titleFontFamily,
                        top: '20px',
                        left: '50%',
                        transform: `translate(calc(-50% + ${titlePos.x}px), ${titlePos.y}px) rotate(${titleRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: selectedElements.has('title') ? 30 : 10
                    }}
                    className={`absolute w-max max-w-[92%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                        isEdit && selectedElements.has('title') 
                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                            : 'border border-transparent'
                    }`}
                >
                    {isEdit && selectedElement === 'title' && (
                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            NOME DO PRODUTO
                        </div>
                    )}

                    <span>{title || 'TÍTULO DO PRODUTO'}</span>
                    
                    {isEdit && selectedElement === 'title' && (
                        <>
                            {startResizing && (
                                <div
                                    onMouseDown={(e) => startResizing('title', e)}
                                    onTouchStart={(e) => startResizing('title', e)}
                                    title="Arraste para redimensionar"
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                />
                            )}
                            {startRotating && (
                                <div
                                    onMouseDown={(e) => startRotating('title', e)}
                                    onTouchStart={(e) => startRotating('title', e)}
                                    title="Arraste para rotacionar elemento"
                                    className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                >
                                    <i className="bi bi-arrow-clockwise text-[11px]" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 2, 3 e 4. CONTAINER AGRUPADO FLEX: DE + PREÇO ORIGINAL + POR */}
            {(showDe || showNormalPrice || showPor) && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('dePricePorGroup', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('dePricePorGroup', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('dePricePorGroup', e) : undefined}
                    style={{ 
                        gap: `${dePricePorGroupGap}px`,
                        transform: `translate(calc(-50% + ${dePricePorGroupPos.x}px), calc(-50% + ${dePricePorGroupPos.y}px)) rotate(${dePricePorGroupRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: (selectedElements.has('dePricePorGroup') || selectedElements.has('deText') || selectedElements.has('normalPrice') || selectedElements.has('porText')) ? 30 : 10
                    }}
                    className={`absolute top-1/2 left-1/2 flex flex-row items-baseline justify-center w-max p-2 rounded-xl border select-none transition-all ${
                        isEdit && selectedElements.has('dePricePorGroup') 
                            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10 shadow-md' 
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    {isEdit && selectedElement === 'dePricePorGroup' && (
                        <div className="absolute -top-6 left-0 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            GRUPO PREÇO ANTERIOR (FLEX)
                        </div>
                    )}

                    {/* ELEMENTO 1: TEXTO "DE" */}
                    {showDe && (
                        <div
                            onClick={isEdit && onSelectElement ? (e) => onSelectElement('deText', e) : undefined}
                            style={{ 
                                color: deColor, 
                                fontSize: `${deFontSize}px`,
                                fontFamily: deFontFamily,
                                transform: deRotation ? `rotate(${deRotation}deg)` : undefined,
                                cursor: isEdit ? 'pointer' : 'default'
                            }}
                            className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 select-none transition-all whitespace-nowrap ${
                                isEdit && selectedElements.has('deText') 
                                    ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm' 
                                    : 'border border-transparent hover:border-slate-300'
                            }`}
                        >
                            {isEdit && selectedElement === 'deText' && (
                                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                    TEXTO "DE"
                                </div>
                            )}
                            <span>{deText}</span>
                            {isEdit && selectedElement === 'deText' && (
                                <>
                                    {startResizing && (
                                        <div
                                            onMouseDown={(e) => startResizing('deText', e)}
                                            onTouchStart={(e) => startResizing('deText', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                    {startRotating && (
                                        <div
                                            onMouseDown={(e) => startRotating('deText', e)}
                                            onTouchStart={(e) => startRotating('deText', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ELEMENTO 2: PREÇO ORIGINAL (NORMAL) RISCADO */}
                    {showNormalPrice && (
                        <div
                            onClick={isEdit && onSelectElement ? (e) => onSelectElement('normalPrice', e) : undefined}
                            style={{
                                color: normalPriceColor,
                                fontSize: `${normalPriceFontSize}px`,
                                fontFamily: normalPriceFontFamily,
                                transform: normalPriceRotation ? `rotate(${normalPriceRotation}deg)` : undefined,
                                cursor: isEdit ? 'pointer' : 'default'
                            }}
                            className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 whitespace-nowrap select-none transition-all ${
                                isEdit && selectedElements.has('normalPrice') 
                                    ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm' 
                                    : 'border border-transparent hover:border-slate-300'
                            }`}
                        >
                            {isEdit && selectedElement === 'normalPrice' && (
                                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                    PREÇO ORIGINAL
                                </div>
                            )}

                            <span>R$ {normalPrice}</span>
                            <span className="absolute left-0.5 right-0.5 top-1/2 -translate-y-1/2 h-[3px] bg-red-600 rounded-none shadow-xs pointer-events-none" />
                            
                            {isEdit && selectedElement === 'normalPrice' && (
                                <>
                                    {startResizing && (
                                        <div
                                            onMouseDown={(e) => startResizing('normalPrice', e)}
                                            onTouchStart={(e) => startResizing('normalPrice', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                    {startRotating && (
                                        <div
                                            onMouseDown={(e) => startRotating('normalPrice', e)}
                                            onTouchStart={(e) => startRotating('normalPrice', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ELEMENTO 3: TEXTO "POR:" */}
                    {showPor && (
                        <div
                            onClick={isEdit && onSelectElement ? (e) => onSelectElement('porText', e) : undefined}
                            style={{ 
                                color: porColor, 
                                fontSize: `${porFontSize}px`,
                                fontFamily: porFontFamily,
                                transform: porRotation ? `rotate(${porRotation}deg)` : undefined,
                                cursor: isEdit ? 'pointer' : 'default'
                            }}
                            className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 select-none transition-all whitespace-nowrap ${
                                isEdit && selectedElements.has('porText') 
                                    ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm' 
                                    : 'border border-transparent hover:border-slate-300'
                            }`}
                        >
                            {isEdit && selectedElement === 'porText' && (
                                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                    TEXTO "POR"
                                </div>
                            )}

                            <span>{porText}</span>
                            {isEdit && selectedElement === 'porText' && (
                                <>
                                    {startResizing && (
                                        <div
                                            onMouseDown={(e) => startResizing('porText', e)}
                                            onTouchStart={(e) => startResizing('porText', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                    {startRotating && (
                                        <div
                                            onMouseDown={(e) => startRotating('porText', e)}
                                            onTouchStart={(e) => startRotating('porText', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ROTAÇÃO DO GRUPO INTEIRO */}
                    {isEdit && selectedElement === 'dePricePorGroup' && startRotating && (
                        <div
                            onMouseDown={(e) => startRotating('dePricePorGroup', e)}
                            onTouchStart={(e) => startRotating('dePricePorGroup', e)}
                            title="Arraste para rotacionar o grupo inteiro"
                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                        >
                            <i className="bi bi-arrow-clockwise text-[11px]" />
                        </div>
                    )}
                </div>
            )}

            {/* 5. SÍMBOLO DA MOEDA "R$" */}
            {showCurrency && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('currencySymbol', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('currencySymbol', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('currencySymbol', e) : undefined}
                    style={{ 
                        color: currencyColor,
                        fontSize: `${currencyFontSize}px`,
                        fontFamily: currencyFontFamily,
                        transform: `translate(${currencyPos.x}px, calc(-50% + ${currencyPos.y}px)) rotate(${currencyRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: selectedElements.has('currencySymbol') ? 30 : 10
                    }}
                    className={`absolute top-1/2 left-4 sm:left-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                        isEdit && selectedElements.has('currencySymbol') 
                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                            : 'border border-transparent'
                    }`}
                >
                    {isEdit && selectedElement === 'currencySymbol' && (
                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            SÍMBOLO MOEDA
                        </div>
                    )}

                    <span>{currencySymbol}</span>
                    {isEdit && selectedElement === 'currencySymbol' && (
                        <>
                            {startResizing && (
                                <div
                                    onMouseDown={(e) => startResizing('currencySymbol', e)}
                                    onTouchStart={(e) => startResizing('currencySymbol', e)}
                                    title="Arraste para redimensionar"
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                />
                            )}
                            {startRotating && (
                                <div
                                    onMouseDown={(e) => startRotating('currencySymbol', e)}
                                    onTouchStart={(e) => startRotating('currencySymbol', e)}
                                    title="Arraste para rotacionar"
                                    className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                >
                                    <i className="bi bi-arrow-clockwise text-[11px]" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 6. PREÇO PRINCIPAL */}
            {showPromoPrice && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('promoPrice', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('promoPrice', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('promoPrice', e) : undefined}
                    style={{ 
                        color: priceColor,
                        fontFamily: promoPriceFontFamily,
                        transform: `translate(calc(-50% + ${promoPricePos.x}px), calc(-50% + ${promoPricePos.y}px)) rotate(${promoPriceRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: selectedElements.has('promoPrice') ? 30 : 10
                    }}
                    className={`absolute top-1/2 left-1/2 w-max grid place-items-center px-1 py-1 select-none transition-transform duration-75 whitespace-nowrap ${
                        isEdit && selectedElements.has('promoPrice') 
                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                            : 'border border-transparent'
                    }`}
                >
                    {isEdit && selectedElement === 'promoPrice' && (
                        <div className="absolute -top-6 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            PREÇO PRINCIPAL
                        </div>
                    )}

                    {isEdit ? (
                        <>
                            {/* Visualização de Design Sobreposta (Editor) */}
                            {showPromoPriceThousands && (
                                <span 
                                    style={{ fontSize: `${scaleThousands}px`, gridArea: '1 / 1' }} 
                                    className="font-black tracking-tighter drop-shadow-md leading-none select-none z-10 opacity-90"
                                >
                                    {testMilharStr || '1.399'}
                                </span>
                            )}
                            {showPromoPriceHundreds && (
                                <span 
                                    style={{ fontSize: `${scaleHundreds}px`, gridArea: '1 / 1' }} 
                                    className="font-black tracking-tighter drop-shadow-md leading-none select-none z-20 opacity-95"
                                >
                                    {testCentenaStr || '399'}
                                </span>
                            )}
                            {showPromoPriceTens && (
                                <span 
                                    style={{ fontSize: `${scaleTens}px`, gridArea: '1 / 1' }} 
                                    className="font-black tracking-tighter drop-shadow-md leading-none select-none z-30"
                                >
                                    {testDezenaStr || '39'}
                                </span>
                            )}
                        </>
                    ) : (
                        /* Visualização Real do Produto (Impressão) */
                        <span 
                            style={{ fontSize: `${priceScale}px`, gridArea: '1 / 1' }} 
                            className="font-black tracking-tighter drop-shadow-md leading-none select-none z-30"
                        >
                            {promoPrice}
                        </span>
                    )}

                    {isEdit && selectedElement === 'promoPrice' && (
                        <>
                            {startResizing && (
                                <div
                                    onMouseDown={(e) => startResizing('promoPrice', e)}
                                    onTouchStart={(e) => startResizing('promoPrice', e)}
                                    title="Arraste para redimensionar escala do preço"
                                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-none cursor-se-resize z-40 shadow-xs hover:scale-125"
                                />
                            )}
                            {startRotating && (
                                <div
                                    onMouseDown={(e) => startRotating('promoPrice', e)}
                                    onTouchStart={(e) => startRotating('promoPrice', e)}
                                    title="Arraste para rotacionar"
                                    className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                >
                                    <i className="bi bi-arrow-clockwise text-[11px]" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 7. CENTAVOS ",00" */}
            {showCents && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('cents', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('cents', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('cents', e) : undefined}
                    style={{ 
                        color: centsColor, 
                        fontSize: `${centsFontSize}px`,
                        fontFamily: centsFontFamily,
                        transform: `translate(${centsPos.x}px, calc(-50% + ${centsPos.y}px)) rotate(${centsRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: selectedElements.has('cents') ? 30 : 10
                    }}
                    className={`absolute top-1/2 right-4 sm:right-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                        isEdit && selectedElements.has('cents') 
                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                            : 'border border-transparent'
                    }`}
                >
                    {isEdit && selectedElement === 'cents' && (
                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            CENTAVOS ({selectedMagnitude.toUpperCase()})
                        </div>
                    )}

                    <span>{centsText}</span>
                    {isEdit && selectedElement === 'cents' && (
                        <>
                            {startResizing && (
                                <div
                                    onMouseDown={(e) => startResizing('cents', e)}
                                    onTouchStart={(e) => startResizing('cents', e)}
                                    title="Arraste para redimensionar"
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                />
                            )}
                            {startRotating && (
                                <div
                                    onMouseDown={(e) => startRotating('cents', e)}
                                    onTouchStart={(e) => startRotating('cents', e)}
                                    title="Arraste para rotacionar"
                                    className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                >
                                    <i className="bi bi-arrow-clockwise text-[11px]" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 8. PARCELAMENTO */}
            {showInstallments && installments && (
                <div
                    onMouseDown={isEdit && startDragging ? (e) => startDragging('installments', e) : undefined}
                    onTouchStart={isEdit && startDragging ? (e) => startDragging('installments', e) : undefined}
                    onClick={isEdit && onSelectElement ? (e) => onSelectElement('installments', e) : undefined}
                    style={{
                        color: installmentsColor,
                        fontSize: `${installmentsFontSize}px`,
                        fontFamily: installmentsFontFamily,
                        transform: `translate(calc(-50% + ${installmentsPos.x}px), ${installmentsPos.y}px) rotate(${installmentsRotation}deg)`,
                        cursor: isEdit ? 'move' : 'default',
                        zIndex: selectedElements.has('installments') ? 30 : 10
                    }}
                    className={`absolute bottom-3 sm:bottom-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-tight px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                        isEdit && selectedElements.has('installments') 
                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                            : 'border border-transparent'
                    }`}
                >
                    {isEdit && selectedElement === 'installments' && (
                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                            PARCELAMENTO
                        </div>
                    )}

                    <span>{installments}</span>
                    {isEdit && selectedElement === 'installments' && (
                        <>
                            {startResizing && (
                                <div
                                    onMouseDown={(e) => startResizing('installments', e)}
                                    onTouchStart={(e) => startResizing('installments', e)}
                                    title="Arraste para redimensionar"
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                />
                            )}
                            {startRotating && (
                                <div
                                    onMouseDown={(e) => startRotating('installments', e)}
                                    onTouchStart={(e) => startRotating('installments', e)}
                                    title="Arraste para rotacionar"
                                    className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                >
                                    <i className="bi bi-arrow-clockwise text-[11px]" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );

    if (isEdit) {
        return (
            <div 
                ref={containerRef}
                style={{ backgroundColor: bgColor, ...style }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectElement) onSelectElement('background', e);
                }}
                className={`w-full aspect-[1.75/1] rounded-3xl shadow-2xl relative select-none transition-all duration-200 cursor-pointer overflow-visible ${
                    selectedElement === 'background' ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
                } ${className}`}
            >
                {content}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            style={{ 
                backgroundColor: bgColor, 
                position: 'absolute', 
                inset: 0, 
                overflow: 'hidden',
                ...style 
            }}
            className={className}
        >
            {content}
        </div>
    );
};
