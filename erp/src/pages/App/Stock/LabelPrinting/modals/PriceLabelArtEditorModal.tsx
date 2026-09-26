import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { copyLabelImageToClipboard, downloadLabelImage } from '../services/priceLabelExportService';
import { toast } from 'react-toastify';
import { LabelConfig } from '../utils/LabelConstants';
import { PriceLabelArtRenderer } from '../components/PriceLabelArtRenderer';
import { calculateLabelPhysicalSize } from '../utils/LabelPhysicalGeometry';
import { getFixedLabelTextSize } from '../utils/fixedLabelTextSize';
import { usePriceLabelState } from '../hooks/usePriceLabelState';
import { PriceLabelLayersModal } from '../components/modals/PriceLabelLayersModal';
import { PriceLabelOpportunityModal } from '../components/modals/PriceLabelOpportunityModal';
import { PriceLabelDataFillModal } from '../components/modals/PriceLabelDataFillModal';
import { PriceLabelTestValuesModal } from '../components/modals/PriceLabelTestValuesModal';
import { fetchPriceLabelArtConfig, fetchOpportunities } from '../services/priceLabelPersistenceService';

import {
  Opportunity,
  PriceLabelArtEditorModalProps,
  PriceLabelLayerKey,
  FONT_OPTIONS,
} from '../types/PriceLabelArtEditorTypes';

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = ({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    onArtConfigLoaded,
    initialProduct
}) => {
    const isStandaloneTemplate = window.location.pathname === '/templates/price-label';
    const rawArtworkSize = calculateLabelPhysicalSize(config);
    const artworkSizeMm = (rawArtworkSize && rawArtworkSize.widthMm >= rawArtworkSize.heightMm)
        ? rawArtworkSize
        : { widthMm: 100, heightMm: 56 };
    const {
      getDefaultBg, showSafetyMargin, setShowSafetyMargin, oppColorsMap,
      setOppColorsMap, title, setTitle, showTitle,
      setShowTitle, titleFontSizeTens, setTitleFontSizeTens, titleFontSizeHundreds,
      setTitleFontSizeHundreds, titleFontSizeThousands, setTitleFontSizeThousands, titleColor,
      setTitleColor, titleFontFamily, setTitleFontFamily, titlePos,
      setTitlePos, titleRotation, setTitleRotation, titleWidth,
      setTitleWidth, deText, setDeText, showDe,
      setShowDe, deFontSizeTens, setDeFontSizeTens, deFontSizeHundreds,
      setDeFontSizeHundreds, deFontSizeThousands, setDeFontSizeThousands, deColor,
      setDeColor, deFontFamily, setDeFontFamily, dePos,
      setDePos, deRotation, setDeRotation, normalPrice,
      setNormalPrice, showNormalPrice, setShowNormalPrice, normalPriceFontSizeTens,
      setNormalPriceFontSizeTens, normalPriceFontSizeHundreds, setNormalPriceFontSizeHundreds, normalPriceFontSizeThousands,
      setNormalPriceFontSizeThousands, normalPriceColor, setNormalPriceColor, normalPriceFontFamily,
      setNormalPriceFontFamily, normalPricePos, setNormalPricePos, normalPriceRotation,
      setNormalPriceRotation, porText, setPorText, showPor,
      setShowPor, porFontSizeTens, setPorFontSizeTens, porFontSizeHundreds,
      setPorFontSizeHundreds, porFontSizeThousands, setPorFontSizeThousands, porColor,
      setPorColor, porFontFamily, setPorFontFamily, porPos,
      setPorPos, porRotation, setPorRotation, currencySymbol,
      setCurrencySymbol, showCurrency, setShowCurrency, currencyFontSizeTens,
      setCurrencyFontSizeTens, currencyFontSizeHundreds, setCurrencyFontSizeHundreds, currencyFontSizeThousands,
      setCurrencyFontSizeThousands, currencyColor, setCurrencyColor, currencyFontFamily,
      setCurrencyFontFamily, currencyPos, setCurrencyPos, currencyRotation,
      setCurrencyRotation, promoPrice, setPromoPrice, showPromoPrice,
      setShowPromoPrice, showPromoPriceTens, setShowPromoPriceTens, showPromoPriceHundreds,
      setShowPromoPriceHundreds, showPromoPriceThousands, setShowPromoPriceThousands, showSizeDropdown,
      setShowSizeDropdown, priceColor, setPriceColor, promoPriceFontFamily,
      setPromoPriceFontFamily, promoPricePos, setPromoPricePos, promoPriceRotation,
      setPromoPriceRotation, scaleTens, setScaleTens, scaleHundreds,
      setScaleHundreds, scaleThousands, setScaleThousands, scaleTenThousands,
      setScaleTenThousands, centsText, setCentsText, showCents,
      setShowCents, centsFontSizeTens, setCentsFontSizeTens, centsFontSizeHundreds,
      setCentsFontSizeHundreds, centsFontSizeThousands, setCentsFontSizeThousands, centsColor,
      setCentsColor, centsFontFamily, setCentsFontFamily, centsPos,
      setCentsPos, centsRotation, setCentsRotation, selectedMagnitude,
      setSelectedMagnitude, activeGuideX, setActiveGuideX, activeGuideY,
      setActiveGuideY, dbOpportunities, setDbOpportunities, selectedOppId,
      setSelectedOppId, showInstallments, setShowInstallments, installments,
      setInstallments, installmentsFontSizeTens, setInstallmentsFontSizeTens, installmentsFontSizeHundreds,
      setInstallmentsFontSizeHundreds, installmentsFontSizeThousands, setInstallmentsFontSizeThousands, installmentsColor,
      setInstallmentsColor, installmentsFontFamily, setInstallmentsFontFamily, installmentsPos,
      setInstallmentsPos, installmentsRotation, setInstallmentsRotation, dePricePorGroupPos,
      setDePricePorGroupPos, dePricePorGroupRotation, setDePricePorGroupRotation, dePricePorGroupGap,
      setDePricePorGroupGap, defaultBgColor, bgColor, setBgColor,
      selectedElement, setSelectedElement, selectedElements, setSelectedElements,
      isArtConfigLoading, setIsArtConfigLoading, autoSaveStatus, setAutoSaveStatus,
      lastQueuedSnapshotRef, latestRequestedSnapshotRef, saveQueueRef, isFileMenuOpen,
      setIsFileMenuOpen, isCenterMenuOpen, setIsCenterMenuOpen, isOppSelectModalOpen,
      setIsOppSelectModalOpen, isLayersModalOpen, setIsLayersModalOpen, showColorPickerDropdown,
      setShowColorPickerDropdown, pendingGradientColorRef,
      applySnapshot,
      getSnapshot,
      getMagnitudeSnapshot,
      magnitudeTemplates,
      setMagnitudeTemplates,
      handleUndo,
      handleRedo,
      canUndo,
      canRedo,
      undoStackRef,
      redoStackRef,
      isApplyingHistoryRef,
    } = usePriceLabelState(initialProduct, config, isOpen);
    const [colorHistory, setColorHistory] = useState<string[]>([
        '#000000', '#1e3a8a', '#dc2626', '#ea580c', '#ffffff', '#2563eb', '#16a34a', '#ff7900', '#7c3aed'
    ]);    const handleCenterElement = (elementKey: string | null) => {
        if (!elementKey || elementKey === 'background') return;
        switch (elementKey) {
            case 'title':
                setTitlePos({ x: 0, y: 0 });
                break;
            case 'dePricePorGroup':
                setDePricePorGroupPos({ x: 0, y: 0 });
                break;
            case 'deText':
                setDePos({ x: 0, y: 0 });
                break;
            case 'normalPrice':
                setNormalPricePos({ x: 0, y: 0 });
                break;
            case 'porText':
                setPorPos({ x: 0, y: 0 });
                break;
            case 'currencySymbol':
                setCurrencyPos({ x: 0, y: 0 });
                break;
            case 'promoPrice':
                setPromoPricePos({ x: 0, y: 0 });
                break;
            case 'cents':
                setCentsPos({ x: 0, y: 0 });
                break;
            case 'installments':
                setInstallmentsPos({ x: 0, y: 0 });
                break;
            default:
                break;
        }
        setSelectedElement(elementKey as any);
        setSelectedElements(new Set([elementKey as any]));
        const labelName = priceLabelLayers.find(l => l.key === elementKey)?.label || elementKey;
        toast.success(`Componente "${labelName}" centralizado na etiqueta!`);
    };

    const closeColorPicker = () => {
        const color = pendingGradientColorRef.current;
        if (color) {
            setColorHistory(prev => [color, ...prev.filter(item => item.toLowerCase() !== color.toLowerCase())].slice(0, 10));
            pendingGradientColorRef.current = null;
        }
        setShowColorPickerDropdown(false);
    };    // ESTADO DO MODAL DE TESTE DE VALORES (SLIDERS DE 0 A 9 POR DÍGITO)
    const [isTestValuesModalOpen, setIsTestValuesModalOpen] = useState(false);
    const testValuesBackupRef = useRef<{ promoPrice: string; normalPrice: string } | null>(null);

    // Sliders de Teste para o Preço Principal (Dezena, Centena, Milhar)
    const [testDezenaD1, setTestDezenaD1] = useState(3);
    const [testDezenaD2, setTestDezenaD2] = useState(9);

    const [testCentenaD1, setTestCentenaD1] = useState(3);
    const [testCentenaD2, setTestCentenaD2] = useState(9);
    const [testCentenaD3, setTestCentenaD3] = useState(9);

    const [testMilharD1, setTestMilharD1] = useState(1);
    const [testMilharD2, setTestMilharD2] = useState(3);
    const [testMilharD3, setTestMilharD3] = useState(9);
    const [testMilharD4, setTestMilharD4] = useState(9);

    // Sliders de Teste para o Preço Antigo (normalPrice)
    const [testNormalD1, setTestNormalD1] = useState(4);
    const [testNormalD2, setTestNormalD2] = useState(9);
    const [testNormalD3, setTestNormalD3] = useState(9);

    const openTestValuesModal = () => {
        testValuesBackupRef.current = {
            promoPrice,
            normalPrice
        };
        setIsTestValuesModalOpen(true);
    };

    const closeTestValuesModal = () => {
        if (testValuesBackupRef.current) {
            setPromoPrice(testValuesBackupRef.current.promoPrice);
            setNormalPrice(testValuesBackupRef.current.normalPrice);
        }
        setIsTestValuesModalOpen(false);
    };



    const isInitializedRef = useRef(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const prevSelectedRef = useRef<PriceLabelLayerKey>(null);
    
    // Drag de Posição
    const dragRef = useRef<{
        isDragging: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        startY: number;
        initialPos: { x: number; y: number };
        initialPositions: Partial<Record<string, { x: number; y: number }>>;
    }>({
        isDragging: false,
        layer: null,
        startX: 0,
        startY: 0,
        initialPos: { x: 0, y: 0 },
        initialPositions: {}
    });

    // Resize do Elemento
    const resizeRef = useRef<{
        isResizing: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        startY: number;
        initialVal: number;
        initialTens?: number;
        initialHundreds?: number;
        initialThousands?: number;
        initialTenThousands?: number;
    }>({
        isResizing: false,
        layer: null,
        startX: 0,
        startY: 0,
        initialVal: 0
    });

    // Rotação do Elemento
    const rotateRef = useRef<{
        isRotating: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        initialRot: number;
    }>({
        isRotating: false,
        layer: null,
        startX: 0,
        initialRot: 0
    });

    // BLOQUEIO DE SCROLL DO BODY QUANDO MODAL ESTÁ ABERTO
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);




    // APLICA O SNAPSHOT DE UMA ORDEM DE GRANDEZA ESPECÍFICA

    // Carrega um único layout global. A oportunidade altera somente as cores.
    useEffect(() => {
        if (!isOpen) {
            isInitializedRef.current = false;
            setIsArtConfigLoading(true);
            return;
        }
        let cancelled = false;
        let revealTimer: ReturnType<typeof setTimeout> | undefined;
        setIsArtConfigLoading(true);

        const loadArtConfigFromSupabase = async () => {
            const layoutId = String(config?.layoutId || 'preco_2x5_restored');
            const { data } = await supabase
                .from('label_art_configs')
                .select('art_config')
                .eq('layout_id', layoutId)
                .maybeSingle();

            const dbArtConfig = data?.art_config || config?.artConfig;
            if (cancelled) return;

            if (dbArtConfig) {
                onArtConfigLoaded?.(dbArtConfig);
                if (dbArtConfig.oppColorsMap && typeof dbArtConfig.oppColorsMap === 'object') {
                    setOppColorsMap(dbArtConfig.oppColorsMap);
                }

                const snapshotToApply = dbArtConfig.opportunities?.['none']
                    || dbArtConfig.opportunities?.['default']
                    || dbArtConfig.opportunities?.['salvado']
                    || dbArtConfig.globalSnapshot
                    || Object.values(dbArtConfig.opportunities || {})[0];

                if (snapshotToApply) {
                    const { selectedOppId: _savedContext, ...globalLayout } = snapshotToApply as Record<string, any>;
                    applySnapshot(globalLayout, isInitializedRef.current);
                } else {
                    const initialBg = selectedOppId === 'none' ? '#ffffff' : (selectedOppId === 'salvado' ? '#ff7900' : '#ffffff');
                    setBgColor(initialBg);
                }
            } else {
                const initialBg = selectedOppId === 'none' ? '#ffffff' : (selectedOppId === 'salvado' ? '#ff7900' : '#ffffff');
                setBgColor(initialBg);
            }

            setTimeout(() => {
                if (!cancelled) isInitializedRef.current = true;
            }, 100);
            revealTimer = setTimeout(() => {
                if (!cancelled) setIsArtConfigLoading(false);
            }, 0);
        };

        loadArtConfigFromSupabase();
        return () => {
            cancelled = true;
            if (revealTimer) clearTimeout(revealTimer);
        };
    }, [isOpen, config?.layoutId]);

    // Carrega oportunidades cadastradas no Supabase
    useEffect(() => {
        if (!isOpen) return;

        async function fetchOpps() {
            try {
                const data = await fetchOpportunities();
                if (data && data.length > 0) {
                    setDbOpportunities(data);
                    if (initialProduct?.opportunities) {
                        const opp = initialProduct.opportunities;
                        const oppKey = opp.id || opp.slug || 'salvado';
                        setSelectedOppId(oppKey);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar oportunidades:", err);
            }
        }
        fetchOpps();
    }, [isOpen, initialProduct]);

    // LISTA DE OPÇÕES DO SELETOR DE ETIQUETA
    const allOppOptions = useMemo(() => {
        const baseOptions = [{ id: 'none', name: 'SEM OPORTUNIDADE' }];

        if (dbOpportunities && dbOpportunities.length > 0) {
            const oppsMapped = dbOpportunities.map(opp => ({
                id: opp.id || opp.slug || opp.name,
                name: opp.name.toUpperCase()
            }));
            return [...baseOptions, ...oppsMapped];
        }
        return [...baseOptions, { id: 'salvado', name: 'QUEIMA DOS SALVADOS' }];
    }, [dbOpportunities]);

    // SINCRONIZA AS CORES DOS ELEMENTOS COM A VISÃO DO TIPO DE ETIQUETA SELECIONADO
    useEffect(() => {
        if (!selectedOppId) return;

        const baseColors = oppColorsMap.none || oppColorsMap.default || {};
        const currentOppColors = { ...baseColors, ...(oppColorsMap[selectedOppId] || {}) };

        setTitleColor(currentOppColors['title'] || '#000000');
        setDeColor(currentOppColors['deText'] || '#000000');
        setNormalPriceColor(currentOppColors['normalPrice'] || '#000000');
        setPorColor(currentOppColors['porText'] || '#000000');
        setCurrencyColor(currentOppColors['currencySymbol'] || '#000000');
        setPriceColor(currentOppColors['promoPrice'] || '#1e3a8a');
        setCentsColor(currentOppColors['cents'] || '#000000');
        setInstallmentsColor(currentOppColors['installments'] || '#000000');
        const savedBackground = currentOppColors['background'];
        setBgColor(savedBackground && savedBackground !== 'transparent' ? savedBackground : defaultBgColor);
    }, [selectedOppId, oppColorsMap, defaultBgColor]);

    const buildAutoSaveConfig = (currentSnapshot: Record<string, any>) => {
        const {
            fabricTemplateJson: _legacyFabricTemplate,
            fabricDataUrl: _legacyFabricImage,
            ...currentArtConfig
        } = (config.artConfig || {}) as Record<string, any>;

        const fullArtConfig = {
            ...currentArtConfig,
            globalSnapshot: currentSnapshot,
            oppColorsMap: {
                ...(currentArtConfig.oppColorsMap || {}),
                ...oppColorsMap,
            },
            opportunities: {
                ...Object.fromEntries(
                    Object.keys(currentArtConfig.opportunities || {}).map(oppId => [oppId, currentSnapshot])
                ),
                default: currentSnapshot,
                none: currentSnapshot,
                [selectedOppId]: currentSnapshot,
            },
        };

        return {
            artConfig: fullArtConfig,
            text: title,
            price: normalPrice,
            promoPrice,
            showPromoPrice,
            bg_color: oppColorsMap.none?.background || '#ffffff',
            priceColor,
            promoPriceColor: priceColor,
            priceFormat: 'split' as const,
            showName: showTitle,
            priceFontSizeTens: scaleTens,
            priceFontSizeHundreds: scaleHundreds,
            priceFontSizeThousands: scaleThousands,
            priceFontSizeTenThousands: scaleTenThousands,
            namePosX: titlePos.x,
            namePosY: titlePos.y,
            nameWidth: titleWidth,
            pricePosX: promoPricePos.x,
            pricePosY: promoPricePos.y,
            dePricePorGroupPos,
            dePricePorGroupRotation,
            dePricePorGroupGap,
        };
    };

    const queueAutoSave = (snapshot: Record<string, any>, serialized: string) => {
        const previousSnapshot = lastQueuedSnapshotRef.current;
        lastQueuedSnapshotRef.current = serialized;
        latestRequestedSnapshotRef.current = serialized;
        setAutoSaveStatus('saving');

        const operation = saveQueueRef.current
            .catch(() => undefined)
            .then(() => onSaveConfig(buildAutoSaveConfig(snapshot)))
            .then(() => {
                if (latestRequestedSnapshotRef.current === serialized) setAutoSaveStatus('saved');
            })
            .catch(error => {
                if (lastQueuedSnapshotRef.current === serialized) lastQueuedSnapshotRef.current = previousSnapshot;
                setAutoSaveStatus('error');
                console.error('Erro no salvamento automático da etiqueta:', error);
                throw error;
            });

        saveQueueRef.current = operation;
        return operation;
    };

    useEffect(() => {
        if (!isOpen) {
            lastQueuedSnapshotRef.current = '';
            latestRequestedSnapshotRef.current = '';
            setAutoSaveStatus('saved');
            return;
        }
        if (isArtConfigLoading) return;

        const snapshot = getSnapshot();
        const serialized = JSON.stringify(snapshot);
        if (!lastQueuedSnapshotRef.current) {
            lastQueuedSnapshotRef.current = serialized;
            latestRequestedSnapshotRef.current = serialized;
            return;
        }
        if (serialized === lastQueuedSnapshotRef.current) return;

        const timer = setTimeout(() => {
            queueAutoSave(snapshot, serialized).catch(() => undefined);
        }, 500);
        return () => clearTimeout(timer);
    }, [isOpen, isArtConfigLoading, getSnapshot]);

    const handleBackToErp = async () => {
        const snapshot = getSnapshot();
        const serialized = JSON.stringify(snapshot);
        try {
            if (serialized !== lastQueuedSnapshotRef.current || autoSaveStatus === 'saving') {
                if (serialized !== lastQueuedSnapshotRef.current) queueAutoSave(snapshot, serialized);
                await saveQueueRef.current;
            }
            onClose();
        } catch {
            toast.error('A alteração ainda não foi salva. Tente voltar novamente.');
        }
    };

    // TECLAS DO TECLADO PARA MOVER ELEMENTO & ATALHOS DESFAZER/REFAZER
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const isInput = targetTag === 'input' || targetTag === 'textarea';

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (isInput) return;
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                if (isInput) return;
                e.preventDefault();
                handleRedo();
                return;
            }

            if (!selectedElement || selectedElement === 'background') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (isInput) return;

                e.preventDefault();
                const step = e.shiftKey ? 5 : 1;
                const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
                const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;

                if (selectedElement === 'title') setTitlePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'dePricePorGroup') setDePricePorGroupPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'deText') setDePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'normalPrice') setNormalPricePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'porText') setPorPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'currencySymbol') setCurrencyPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'promoPrice') setPromoPricePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'cents') setCentsPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'installments') setInstallmentsPos(p => ({ x: p.x + dx, y: p.y + dy }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedElement, handleUndo, handleRedo]);

    // SELEÇÃO INTELIGENTE DE ELEMENTOS (ALTERNÂNCIA DE CAMADAS SOBREPOSTAS AO RE-CLICAR E SHIFT MULTISELEÇÃO)
    const handleElementClick = useCallback((layerKey: PriceLabelLayerKey, e: React.MouseEvent) => {
        e.stopPropagation();

        const visibleLayers: { key: PriceLabelLayerKey; label: string }[] = [
            { key: 'title', label: 'Nome do Produto' },
            { key: 'dePricePorGroup', label: 'Grupo De / Preço / Por (Flex)' },
            { key: 'deText', label: 'Texto "De"' },
            { key: 'normalPrice', label: 'Preço Original' },
            { key: 'porText', label: 'Texto "Por"' },
            { key: 'currencySymbol', label: 'Símbolo R$' },
            { key: 'promoPrice', label: 'Preço Principal' },
            { key: 'cents', label: 'Centavos' },
            { key: 'installments', label: 'Parcelamento' }
        ];

        if (e.shiftKey) {
            // Clicar com Shift em qualquer um dos itens do grupo (De, Preço Original, Por) seleciona o AGRUPAMENTO (dePricePorGroup)
            if (['deText', 'normalPrice', 'porText', 'dePricePorGroup'].includes(layerKey as string)) {
                setSelectedElement('dePricePorGroup');
                setSelectedElements(new Set<PriceLabelLayerKey>(['dePricePorGroup']));
                return;
            }

            setSelectedElements(prev => {
                const next = new Set(prev);
                if (next.has(layerKey)) {
                    next.delete(layerKey);
                } else {
                    next.add(layerKey);
                }
                
                // Atualiza o selectedElement principal
                if (next.size > 0) {
                    const arr = Array.from(next);
                    setSelectedElement(arr[arr.length - 1]);
                } else {
                    setSelectedElement(null);
                }
                return next;
            });
        } else {
            setSelectedElements(new Set<PriceLabelLayerKey>([layerKey]));

            if (prevSelectedRef.current === layerKey) {
                const activeList = visibleLayers.filter(l => {
                    if (l.key === 'title') return showTitle;
                    if (l.key === 'deText') return showDe;
                    if (l.key === 'normalPrice') return showNormalPrice;
                    if (l.key === 'porText') return showPor;
                    if (l.key === 'currencySymbol') return showCurrency;
                    if (l.key === 'promoPrice') return showPromoPrice;
                    if (l.key === 'cents') return showCents;
                    if (l.key === 'installments') return showInstallments;
                    return false;
                });

                const curIdx = activeList.findIndex(l => l.key === layerKey);
                if (curIdx !== -1 && activeList.length > 1) {
                    const nextLayer = activeList[(curIdx + 1) % activeList.length];
                    setSelectedElement(nextLayer.key);
                    setSelectedElements(new Set([nextLayer.key]));
                    return;
                }
            }

            setSelectedElement(layerKey);
        }
    }, [selectedElement, selectedElements, showTitle, showDe, showNormalPrice, showPor, showCurrency, showPromoPrice, showCents, showInstallments]);

    // ARRASTATOR DE ELEMENTOS NO CANVAS COM ÍMÃ E LINHAS GUIA MAGNÉTICAS (SUPORTE A MULTISELEÇÃO E MOVIMENTAÇÃO CONJUNTA)
    const startDragging = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        if (!layer) return;
        e.stopPropagation();
        
        prevSelectedRef.current = selectedElement;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Determina o grupo ativo de elementos para movimentação
        let activeElements = new Set(selectedElements);
        if (!activeElements.has(layer)) {
            activeElements = new Set([layer]);
            setSelectedElements(activeElements);
            setSelectedElement(layer);
        }

        // Armazena a posição inicial de todas as camadas selecionadas
        const initialPositions = {} as Record<string, { x: number; y: number }>;
        activeElements.forEach((key) => {
            if (key) {
                let pos = { x: 0, y: 0 };
                if (key === 'title') pos = { ...titlePos };
                else if (key === 'dePricePorGroup') pos = { ...dePricePorGroupPos };
                else if (key === 'deText') pos = { ...dePos };
                else if (key === 'normalPrice') pos = { ...normalPricePos };
                else if (key === 'porText') pos = { ...porPos };
                else if (key === 'currencySymbol') pos = { ...currencyPos };
                else if (key === 'promoPrice') pos = { ...promoPricePos };
                else if (key === 'cents') pos = { ...centsPos };
                else if (key === 'installments') pos = { ...installmentsPos };
                initialPositions[key] = pos;
            }
        });

        dragRef.current = {
            isDragging: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialPos: initialPositions[layer] || { x: 0, y: 0 },
            initialPositions
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!dragRef.current.isDragging || !dragRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
            
            const el = previewRef.current;
            const s = el ? Math.min(el.clientWidth / 840, el.clientHeight / 480) : 1;
            const currentScale = s > 0 ? s : 1;
            const dx = Math.round((curX - dragRef.current.startX) / currentScale);
            const dy = Math.round((curY - dragRef.current.startY) / currentScale);

            // Elemento principal arrastado (que ditará as correções e o ímã)
            const primaryKey = dragRef.current.layer;
            const primaryStartPos = dragRef.current.initialPositions?.[primaryKey];
            if (!primaryStartPos) return;

            let nextPrimaryX = primaryStartPos.x + dx;
            let nextPrimaryY = primaryStartPos.y + dy;

            // Alinhamento Magnético no Elemento Principal
            const SNAP_THRESHOLD = 6;
            const targets: { x: number; y: number }[] = [
                { x: 0, y: 0 } // Centro da etiqueta
            ];

            if (showTitle && primaryKey !== 'title') targets.push(titlePos);
            if (showDe && primaryKey !== 'deText') targets.push(dePos);
            if (showNormalPrice && primaryKey !== 'normalPrice') targets.push(normalPricePos);
            if (showPor && primaryKey !== 'porText') targets.push(porPos);
            if (showCurrency && primaryKey !== 'currencySymbol') targets.push(currencyPos);
            if (showPromoPrice && primaryKey !== 'promoPrice') targets.push(promoPricePos);
            if (showCents && primaryKey !== 'cents') targets.push(centsPos);
            if (showInstallments && primaryKey !== 'installments') targets.push(installmentsPos);

            let guideX: number | null = null;
            let guideY: number | null = null;

            for (const t of targets) {
                if (Math.abs(nextPrimaryX - t.x) <= SNAP_THRESHOLD) {
                    nextPrimaryX = t.x;
                    guideX = t.x;
                }
                if (Math.abs(nextPrimaryY - t.y) <= SNAP_THRESHOLD) {
                    nextPrimaryY = t.y;
                    guideY = t.y;
                }
            }

            setActiveGuideX(guideX);
            setActiveGuideY(guideY);

            // Deslocamento efetivo final pós alinhamento magnético
            const finalDx = nextPrimaryX - primaryStartPos.x;
            const finalDy = nextPrimaryY - primaryStartPos.y;

            // Move todas as camadas selecionadas juntas com a mesma variação
            activeElements.forEach((key) => {
                if (!key) return;
                const startPos = dragRef.current.initialPositions?.[key];
                if (!startPos) return;

                const finalPos = {
                    x: startPos.x + finalDx,
                    y: startPos.y + finalDy
                };

                if (key === 'title') setTitlePos(finalPos);
                else if (key === 'dePricePorGroup') setDePricePorGroupPos(finalPos);
                else if (key === 'deText') setDePos(finalPos);
                else if (key === 'normalPrice') setNormalPricePos(finalPos);
                else if (key === 'porText') setPorPos(finalPos);
                else if (key === 'currencySymbol') setCurrencyPos(finalPos);
                else if (key === 'promoPrice') setPromoPricePos(finalPos);
                else if (key === 'cents') setCentsPos(finalPos);
                else if (key === 'installments') setInstallmentsPos(finalPos);
            });
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
            setActiveGuideX(null);
            setActiveGuideY(null);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [
        selectedElement, selectedElements, titlePos, dePricePorGroupPos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos,
        showTitle, showDe, showNormalPrice, showPor, showCurrency, showPromoPrice, showCents, showInstallments
    ]);

    const formatDisplayPrice = (val: string) => {
        if (!val) return '0';
        const clean = val.replace(/[^\d,.]/g, '');
        return clean || '0';
    };

    const getIntegerPart = (val: string) => {
        const clean = formatDisplayPrice(val);
        const parts = clean.split(',');
        return parts[0] || '0';
    };

    // VALOR EXIBIDO DO PREÇO PRINCIPAL
    const _displayPriceNumber = useMemo(() => {
        return getIntegerPart(promoPrice || normalPrice || '1.999');
    }, [promoPrice, normalPrice]);

    // Somente o número principal varia por ordem de grandeza. Os demais textos são fixos.
    const activeTitleFontSize = titleFontSizeHundreds;
    const activeDeFontSize = deFontSizeHundreds;
    const activeNormalPriceFontSize = normalPriceFontSizeHundreds;
    const activePorFontSize = porFontSizeHundreds;
    const activeInstallmentsFontSize = installmentsFontSizeHundreds;
    const activeCurrencyFontSize = currencyFontSizeHundreds;
    const activeCentsFontSize = centsFontSizeHundreds;

    const activeScale = 
        selectedMagnitude === 'tens' ? scaleTens :
        selectedMagnitude === 'hundreds' ? scaleHundreds :
        selectedMagnitude === 'thousands' ? scaleThousands : scaleTenThousands;

    // REDIMENSIONAR ELEMENTO ARRASTANDO O CANTO INFERIOR DIREITO
    const startResizing = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);
        setSelectedElements(new Set(layer ? [layer] : []));

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let initial = 14;
        if (layer === 'title') initial = activeTitleFontSize;
        else if (layer === 'deText') initial = activeDeFontSize;
        else if (layer === 'normalPrice') initial = activeNormalPriceFontSize;
        else if (layer === 'porText') initial = activePorFontSize;
        else if (layer === 'currencySymbol') initial = activeCurrencyFontSize;
        else if (layer === 'cents') initial = activeCentsFontSize;
        else if (layer === 'installments') initial = activeInstallmentsFontSize;
        else if (layer === 'promoPrice') initial = activeScale;

        resizeRef.current = {
            isResizing: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialVal: initial,
            initialTens: scaleTens,
            initialHundreds: scaleHundreds,
            initialThousands: scaleThousands,
            initialTenThousands: scaleTenThousands
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!resizeRef.current.isResizing || !resizeRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

            const delta = (curX - resizeRef.current.startX) + (curY - resizeRef.current.startY);
            const l = resizeRef.current.layer;

            if (l === 'promoPrice') {
                const deltaPx = Math.round(delta * 0.18);
                setScaleTens(Math.max(10, (resizeRef.current.initialTens ?? scaleTens) + deltaPx));
                setScaleHundreds(Math.max(10, (resizeRef.current.initialHundreds ?? scaleHundreds) + deltaPx));
                setScaleThousands(Math.max(10, (resizeRef.current.initialThousands ?? scaleThousands) + deltaPx));
                setScaleTenThousands(Math.max(10, (resizeRef.current.initialTenThousands ?? scaleTenThousands) + deltaPx));
            } else if (l === 'currencySymbol') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                setCurrencyFontSizeTens(newSize);
                setCurrencyFontSizeHundreds(newSize);
                setCurrencyFontSizeThousands(newSize);
            } else if (l === 'cents') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                setCentsFontSizeTens(newSize);
                setCentsFontSizeHundreds(newSize);
                setCentsFontSizeThousands(newSize);
            } else {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                if (l === 'title') {
                    setTitleFontSizeTens(newSize);
                    setTitleFontSizeHundreds(newSize);
                    setTitleFontSizeThousands(newSize);
                } else if (l === 'deText') {
                    setDeFontSizeTens(newSize);
                    setDeFontSizeHundreds(newSize);
                    setDeFontSizeThousands(newSize);
                } else if (l === 'normalPrice') {
                    setNormalPriceFontSizeTens(newSize);
                    setNormalPriceFontSizeHundreds(newSize);
                    setNormalPriceFontSizeThousands(newSize);
                } else if (l === 'porText') {
                    setPorFontSizeTens(newSize);
                    setPorFontSizeHundreds(newSize);
                    setPorFontSizeThousands(newSize);
                } else if (l === 'installments') {
                    setInstallmentsFontSizeTens(newSize);
                    setInstallmentsFontSizeHundreds(newSize);
                    setInstallmentsFontSizeThousands(newSize);
                }
            }
        };

        const handleMouseUp = () => {
            resizeRef.current.isResizing = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [activeTitleFontSize, activeDeFontSize, activeNormalPriceFontSize, activePorFontSize, activeCurrencyFontSize, activeCentsFontSize, activeInstallmentsFontSize, activeScale, selectedMagnitude]);

    // ROTACIONAR ELEMENTO ARRASTANDO A SETA CURVADA
    const startRotating = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);
        setSelectedElements(new Set(layer ? [layer] : []));

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

        let initialRot = 0;
        if (layer === 'title') initialRot = titleRotation;
        else if (layer === 'dePricePorGroup') initialRot = dePricePorGroupRotation;
        else if (layer === 'deText') initialRot = deRotation;
        else if (layer === 'normalPrice') initialRot = normalPriceRotation;
        else if (layer === 'porText') initialRot = porRotation;
        else if (layer === 'currencySymbol') initialRot = currencyRotation;
        else if (layer === 'promoPrice') initialRot = promoPriceRotation;
        else if (layer === 'cents') initialRot = centsRotation;
        else if (layer === 'installments') initialRot = installmentsRotation;

        rotateRef.current = {
            isRotating: true,
            layer,
            startX: clientX,
            initialRot
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!rotateRef.current.isRotating || !rotateRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;

            const dx = curX - rotateRef.current.startX;
            const newRot = Math.round((rotateRef.current.initialRot + dx * 0.8) % 360);

            const l = rotateRef.current.layer;
            if (l === 'title') setTitleRotation(newRot);
            else if (l === 'dePricePorGroup') setDePricePorGroupRotation(newRot);
            else if (l === 'deText') setDeRotation(newRot);
            else if (l === 'normalPrice') setNormalPriceRotation(newRot);
            else if (l === 'porText') setPorRotation(newRot);
            else if (l === 'currencySymbol') setCurrencyRotation(newRot);
            else if (l === 'promoPrice') setPromoPriceRotation(newRot);
            else if (l === 'cents') setCentsRotation(newRot);
            else if (l === 'installments') setInstallmentsRotation(newRot);
        };

        const handleMouseUp = () => {
            rotateRef.current.isRotating = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [titleRotation, deRotation, normalPriceRotation, porRotation, currencyRotation, promoPriceRotation, centsRotation, installmentsRotation]);

    // A visão muda somente o contexto e as cores específicas da oportunidade.
    const handleSelectOpportunityContext = (newOppId: string) => {
        setSelectedOppId(newOppId);
    };

    const handleSelectOpportunityView = (newOppId: string) => {
        handleSelectOpportunityContext(newOppId);
    };

    // APLICAÇÃO DE COR
    const handleColorSelect = (newColor: string, addToHistory = true) => {
        if (selectedElement === 'title') setTitleColor(newColor);
        else if (selectedElement === 'deText') setDeColor(newColor);
        else if (selectedElement === 'normalPrice') setNormalPriceColor(newColor);
        else if (selectedElement === 'porText') setPorColor(newColor);
        else if (selectedElement === 'currencySymbol') setCurrencyColor(newColor);
        else if (selectedElement === 'promoPrice') setPriceColor(newColor);
        else if (selectedElement === 'cents') setCentsColor(newColor);
        else if (selectedElement === 'installments') setInstallmentsColor(newColor);
        else if (selectedElement === 'background') setBgColor(newColor);

        // Persiste a cor no mapa por tipo de etiqueta ativo
        if (selectedElement && selectedOppId) {
            setOppColorsMap(prev => ({
                ...prev,
                [selectedOppId]: {
                    ...(prev[selectedOppId] || {}),
                    [selectedElement]: newColor
                }
            }));
        }

        if (addToHistory) {
            setColorHistory(prev => {
                const filtered = prev.filter(c => c.toLowerCase() !== newColor.toLowerCase());
                return [newColor, ...filtered].slice(0, 10);
            });
        }
    };

    // ALTERAR FONTE DA CAMADA ATIVA
    const handleFontChange = (fontVal: string) => {
        if (selectedElement === 'title') setTitleFontFamily(fontVal);
        else if (selectedElement === 'deText') setDeFontFamily(fontVal);
        else if (selectedElement === 'normalPrice') setNormalPriceFontFamily(fontVal);
        else if (selectedElement === 'porText') setPorFontFamily(fontVal);
        else if (selectedElement === 'currencySymbol') setCurrencyFontFamily(fontVal);
        else if (selectedElement === 'promoPrice') setPromoPriceFontFamily(fontVal);
        else if (selectedElement === 'cents') setCentsFontFamily(fontVal);
        else if (selectedElement === 'installments') setInstallmentsFontFamily(fontVal);
    };

    // EDICAO DE FONTE E TAMANHO EM LOTE PARA MULTISELECAO
    const handleBatchFontSize = (v: number) => {
        selectedElements.forEach(key => {
            if (key === 'title') { setTitleFontSizeTens(v); setTitleFontSizeHundreds(v); setTitleFontSizeThousands(v); }
            else if (key === 'deText') { setDeFontSizeTens(v); setDeFontSizeHundreds(v); setDeFontSizeThousands(v); }
            else if (key === 'normalPrice') { setNormalPriceFontSizeTens(v); setNormalPriceFontSizeHundreds(v); setNormalPriceFontSizeThousands(v); }
            else if (key === 'porText') { setPorFontSizeTens(v); setPorFontSizeHundreds(v); setPorFontSizeThousands(v); }
            else if (key === 'installments') { setInstallmentsFontSizeTens(v); setInstallmentsFontSizeHundreds(v); setInstallmentsFontSizeThousands(v); }
            else if (key === 'currencySymbol') {
                setCurrencyFontSizeTens(v); setCurrencyFontSizeHundreds(v); setCurrencyFontSizeThousands(v);
            } else if (key === 'cents') {
                setCentsFontSizeTens(v); setCentsFontSizeHundreds(v); setCentsFontSizeThousands(v);
            } else if (key === 'promoPrice') {
                if (selectedMagnitude === 'tens') setScaleTens(v);
                else if (selectedMagnitude === 'hundreds') setScaleHundreds(v);
                else setScaleThousands(v);
            }
        });
    };

    const handleBatchFontFamily = (fontVal: string) => {
        selectedElements.forEach(key => {
            if (key === 'title') setTitleFontFamily(fontVal);
            else if (key === 'deText') setDeFontFamily(fontVal);
            else if (key === 'normalPrice') setNormalPriceFontFamily(fontVal);
            else if (key === 'porText') setPorFontFamily(fontVal);
            else if (key === 'currencySymbol') setCurrencyFontFamily(fontVal);
            else if (key === 'cents') setCentsFontFamily(fontVal);
            else if (key === 'promoPrice') setPromoPriceFontFamily(fontVal);
            else if (key === 'installments') setInstallmentsFontFamily(fontVal);
        });
    };

    const activeFontFamily = 
        selectedElement === 'title' ? titleFontFamily :
        selectedElement === 'deText' ? deFontFamily :
        selectedElement === 'normalPrice' ? normalPriceFontFamily :
        selectedElement === 'porText' ? porFontFamily :
        selectedElement === 'currencySymbol' ? currencyFontFamily :
        selectedElement === 'promoPrice' ? promoPriceFontFamily :
        selectedElement === 'cents' ? centsFontFamily :
        selectedElement === 'installments' ? installmentsFontFamily :
        'Inter, system-ui, sans-serif';

    const activeColor = 
        selectedElement === 'title' ? titleColor :
        selectedElement === 'deText' ? deColor :
        selectedElement === 'normalPrice' ? normalPriceColor :
        selectedElement === 'porText' ? porColor :
        selectedElement === 'currencySymbol' ? currencyColor :
        selectedElement === 'promoPrice' ? priceColor :
        selectedElement === 'cents' ? centsColor :
        selectedElement === 'installments' ? installmentsColor :
        (bgColor && bgColor !== 'transparent' ? bgColor : oppColorsMap[selectedOppId]?.background || defaultBgColor);

    if (!isOpen) return null;

    const priceLabelLayers: { 
        key: NonNullable<PriceLabelLayerKey>; 
        label: string; 
        icon: string; 
        isVisible: boolean; 
        toggleVisibility: () => void; 
        pos: { x: number; y: number };
        resetPos: () => void;
        desc: string 
    }[] = [
        { 
            key: 'title', 
            label: 'NOME DO PRODUTO', 
            icon: 'bi-fonts', 
            isVisible: showTitle, 
            toggleVisibility: () => setShowTitle(!showTitle), 
            pos: titlePos,
            resetPos: () => { setTitlePos({ x: 0, y: 0 }); setTitleRotation(0); },
            desc: 'Cabeçalho superior' 
        },
        { 
            key: 'deText', 
            label: 'TEXTO "DE"', 
            icon: 'bi-type', 
            isVisible: showDe, 
            toggleVisibility: () => setShowDe(!showDe), 
            pos: dePos,
            resetPos: () => { setDePos({ x: 0, y: 0 }); setDeRotation(0); },
            desc: 'Prefixo do preço original' 
        },
        { 
            key: 'normalPrice', 
            label: 'PREÇO ORIGINAL (DE:)', 
            icon: 'bi-type-strikethrough', 
            isVisible: showNormalPrice, 
            toggleVisibility: () => setShowNormalPrice(!showNormalPrice), 
            pos: normalPricePos,
            resetPos: () => { setNormalPricePos({ x: 0, y: 0 }); setNormalPriceRotation(0); },
            desc: 'Valor riscado horizontalmente' 
        },
        { 
            key: 'porText', 
            label: 'TEXTO "POR:"', 
            icon: 'bi-type', 
            isVisible: showPor, 
            toggleVisibility: () => setShowPor(!showPor), 
            pos: porPos,
            resetPos: () => { setPorPos({ x: 0, y: 0 }); setPorRotation(0); },
            desc: 'Sufixo do preço original' 
        },
        { 
            key: 'currencySymbol', 
            label: 'SÍMBOLO MOEDA (R$)', 
            icon: 'bi-currency-dollar', 
            isVisible: showCurrency, 
            toggleVisibility: () => setShowCurrency(!showCurrency), 
            pos: currencyPos,
            resetPos: () => { setCurrencyPos({ x: 0, y: 0 }); setCurrencyRotation(0); },
            desc: 'Símbolo R$ à esquerda' 
        },
        { 
            key: 'promoPrice', 
            label: 'PREÇO PRINCIPAL (POR:)', 
            icon: 'bi-tag-fill', 
            isVisible: showPromoPrice, 
            toggleVisibility: () => setShowPromoPrice(!showPromoPrice), 
            pos: promoPricePos,
            resetPos: () => { setPromoPricePos({ x: 0, y: 0 }); setPromoPriceRotation(0); },
            desc: 'Valor em destaque grande' 
        },
        { 
            key: 'cents', 
            label: 'CENTAVOS (,00)', 
            icon: 'bi-superscript', 
            isVisible: showCents, 
            toggleVisibility: () => setShowCents(!showCents), 
            pos: centsPos,
            resetPos: () => { setCentsPos({ x: 0, y: 0 }); setCentsRotation(0); },
            desc: 'Dígitos centavos à direita' 
        },
        { 
            key: 'installments', 
            label: 'PARCELAMENTO', 
            icon: 'bi-credit-card-2-front-fill', 
            isVisible: showInstallments, 
            toggleVisibility: () => setShowInstallments(!showInstallments), 
            pos: installmentsPos,
            resetPos: () => { setInstallmentsPos({ x: 0, y: 0 }); setInstallmentsRotation(0); },
            desc: 'Condições de pagamento' 
        },
        { 
            key: 'background', 
            label: 'FUNDO DA ETIQUETA', 
            icon: 'bi-palette-fill', 
            isVisible: true, 
            toggleVisibility: () => {}, 
            pos: { x: 0, y: 0 },
            resetPos: () => {},
            desc: 'Cor de fundo da etiqueta' 
        },
    ];

    const handleCopyImage = () => copyLabelImageToClipboard(previewRef.current);

    const handleDownloadPng = () => {
        downloadLabelImage(previewRef.current, 'etiqueta_preco_' + selectedOppId + '_' + Date.now() + '.png');
    };

    return (
        <div className={`fixed inset-0 z-50 flex flex-col animate-fade-in overflow-hidden w-screen h-screen ${isStandaloneTemplate ? 'bg-white dark:bg-slate-950' : 'bg-slate-900/90 backdrop-blur-md'}`}>
            {/* 1. MODAL HEADER FULLWIDTH */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-30">
                <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
                        <i className="bi bi-palette-fill text-sm" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                            TEMPLATE DA ETIQUETA DE PREÇO
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        title="Desfazer alterações (Ctrl+Z)"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="bi bi-arrow-counterclockwise text-sm"></i>
                        <span className="hidden sm:inline">Desfazer</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        title="Refazer alterações (Ctrl+Y)"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="bi bi-arrow-clockwise text-sm"></i>
                        <span className="hidden sm:inline">Refazer</span>
                    </button>

                    <button type="button" onClick={handleBackToErp} className="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 text-slate-500 hover:text-red-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ml-1 text-xs font-black">
                        <i className="bi bi-arrow-left text-xs" />
                        <span>Voltar ao ERP</span>
                    </button>
                </div>
            </div>

            {/* 2. BARRA DE MENU PRINCIPAL (SUPERIOR) */}
            <div className="flex items-center justify-start gap-3 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-1.5 shrink-0 overflow-visible relative z-[1000]">
                
                {/* LADO ESQUERDO: ARQUIVO (DROPDOWN), CAMADAS, MARGEM DE SEGURANÇA & SELEÇÃO DE TIPO DE ETIQUETA */}
                <div className="flex items-center gap-3 shrink-0 flex-nowrap">
                    
                    {/* ARQUIVO DROPDOWN (SEM CONTAINER BRANCO, APENAS TEXTO + SETA, zIndex: 99999) */}
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            className="px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1"
                        >
                            <span>Arquivo</span>
                            <i className="bi bi-chevron-down text-[9px] text-slate-400" />
                        </button>

                        {isFileMenuOpen && (
                            <div 
                                style={{ zIndex: 99999 }}
                                className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[1100] animate-fade-in"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        handleDownloadPng();
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                                >
                                    <i className="bi bi-file-earmark-arrow-down-fill text-emerald-600 text-sm" />
                                    <span>Baixar PNG</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        handleCopyImage();
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                                >
                                    <i className="bi bi-clipboard-check-fill text-blue-600 text-sm" />
                                    <span>Copiar Imagem</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        setSelectedElement('title');
                                        setSelectedElements(new Set(['title']));
                                        const newTitle = window.prompt("Nome / Título da Arte:", title);
                                        if (newTitle !== null && newTitle.trim()) {
                                            setTitle(newTitle.trim().toUpperCase());
                                            toast.success("Título da arte atualizado!");
                                        }
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                                >
                                    <i className="bi bi-pencil-square text-purple-600 text-sm" />
                                    <span>Nomear Arte</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CAMADAS BUTTON (APENAS ÍCONE) */}
                    <button
                        type="button"
                        onClick={() => setIsLayersModalOpen(true)}
                        title="Gerenciar Camadas"
                        className="p-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-300/50 dark:hover:bg-slate-800 shrink-0"
                    >
                        <i className="bi bi-layers-fill text-blue-600 text-sm" />
                    </button>

                    {/* MARGEM DE SEGURANÇA BUTTON (APENAS ÍCONE) */}
                    <button
                        type="button"
                        onClick={() => setShowSafetyMargin(!showSafetyMargin)}
                        title="Exibir ou ocultar a borda da margem de segurança da impressão"
                        className={`p-1.5 text-xs font-black transition cursor-pointer rounded-lg shrink-0 flex items-center justify-center ${
                            showSafetyMargin 
                                ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50' 
                                : 'text-slate-600 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <i className="bi bi-bounding-box-circles text-sm" />
                    </button>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* SELETOR DE CONTEXTO: TIPO DE ETIQUETA (VISÃO DE CONTEXTO) */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                        <i className="bi bi-tag-fill text-blue-600 dark:text-blue-400 text-xs shrink-0" />
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider shrink-0">
                            Visão:
                        </span>
                        <select
                            value={selectedOppId}
                            onChange={(e) => handleSelectOpportunityContext(e.target.value)}
                            className="bg-transparent text-slate-800 dark:text-white text-xs font-black uppercase outline-none cursor-pointer pr-1"
                            title="Alternar visão de contexto do tipo de etiqueta"
                        >
                            {allOppOptions.map(opp => (
                                <option key={opp.id} value={opp.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold">
                                    {opp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* BOTÃO PRODUTO MODELO */}
                    <button
                        type="button"
                        onClick={() => setIsDataFillModalOpen(true)}
                        title="Escolher produto modelo ou preencher dados da etiqueta"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-emerald-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
                    >
                        <i className="bi bi-box-seam-fill text-emerald-600 dark:text-emerald-400 text-sm" />
                        <span>Produto Modelo</span>
                    </button>

                    {/* BOTÃO TESTE DE VALORES */}
                    <button
                        type="button"
                        onClick={openTestValuesModal}
                        title="Simular e testar numerações nos preços da etiqueta com sliders (0 a 9)"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
                    >
                        <i className="bi bi-sliders text-purple-600 dark:text-purple-400 text-sm" />
                        <span>Teste de Valores</span>
                    </button>

                </div>

            </div>

            {/* 3. BARRA DE FERRAMENTAS DO ELEMENTO SELECIONADO */}
            <div className="flex items-center justify-start gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2 shrink-0 overflow-visible relative z-30 min-h-[44px]">
                
                {/* BOTÃO DESMARCAR (SÓ ÍCONE) */}
                <button
                    type="button"
                    onClick={() => {
                        setSelectedElement(null);
                        setSelectedElements(new Set());
                    }}
                    disabled={!selectedElement && selectedElements.size === 0}
                    title="Desmarcar Seleção"
                    className={`w-8 h-8 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
                        selectedElement || selectedElements.size > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <i className="bi bi-cursor-fill text-xs" />
                </button>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 shrink-0 mx-0.5" />

                {/* SELEÇÃO ATIVA: FERRAMENTAS DA CAMADA ATIVA */}
                {selectedElements.size > 1 ? (
                    <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
                        {/* Identificador de Seleção em Lote */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Seleção:</span>
                            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
                                <i className="bi bi-layers-half text-xs" />
                                <span>{selectedElements.size} Elementos</span>
                            </div>
                        </div>

                        {/* SELETOR DE FONTE EM LOTE */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Fonte (Lote):</span>
                            <select
                                value=""
                                onChange={e => handleBatchFontFamily(e.target.value)}
                                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
                            >
                                <option value="" disabled>Alterar tipografia...</option>
                                {FONT_OPTIONS.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* TAMANHO DA FONTE EM LOTE */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Tamanho (Lote):</span>
                            <div className="flex items-center gap-1 h-8">
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    placeholder="Ex: 24"
                                    onChange={e => handleBatchFontSize(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                />
                                <span className="text-[10px] font-bold text-slate-400">px</span>
                            </div>
                        </div>
                    </div>
                ) : selectedElement ? (
                    <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
                        
                        {/* Identificador do Elemento Ativo */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Elemento:</span>
                            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
                                <i className={`bi ${priceLabelLayers.find(l => l.key === selectedElement)?.icon}`} />
                                <span>{priceLabelLayers.find(l => l.key === selectedElement)?.label}</span>
                            </div>
                        </div>

                        {/* SELETOR DE FONTE / TIPOGRAFIA */}
                        {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Fonte:</span>
                                <select
                                    value={activeFontFamily}
                                    onChange={e => handleFontChange(e.target.value)}
                                    className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}



                        {/* CONTROLE DE ESPAÇAMENTO (GAP) DO GRUPO FLEX DE/POR */}
                        {selectedElement === 'dePricePorGroup' && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none">Espaçamento do Grupo:</span>
                                <div className="flex items-center gap-1 h-8">
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        value={dePricePorGroupGap}
                                        onChange={e => setDePricePorGroupGap(Number(e.target.value))}
                                        className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">px</span>
                                </div>
                            </div>
                        )}

                        {/* SELETOR DE TAMANHO FLUTUANTE (TEXTO LIMPO SEM BORDA OU BG) */}
                        {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
                            <div className="relative shrink-0 flex items-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSizeDropdown(!showSizeDropdown);
                                    }}
                                    className="px-2 py-1 text-xs font-black text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                                >
                                    <span>Tamanho</span>
                                    <i className={`bi bi-chevron-down text-[10px] transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showSizeDropdown && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[100]" 
                                            onClick={() => setShowSizeDropdown(false)} 
                                        />
                                        <div 
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[200] animate-fade-in flex flex-col gap-3"
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                                    Tamanho da Fonte (px)
                                                </span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowSizeDropdown(false)}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                >
                                                    <i className="bi bi-x-lg text-xs" />
                                                </button>
                                            </div>

                                            {selectedElement === 'promoPrice' ? (
                                                <>
                                                    {/* 1. DEZENA */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Dezena:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleTens}
                                                                    onChange={e => setScaleTens(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceTens(!showPromoPriceTens)}
                                                                title={showPromoPriceTens ? "Ocultar Dezena" : "Exibir Dezena"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceTens
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceTens ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* 2. CENTENA */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Centena:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleHundreds}
                                                                    onChange={e => setScaleHundreds(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceHundreds(!showPromoPriceHundreds)}
                                                                title={showPromoPriceHundreds ? "Ocultar Centena" : "Exibir Centena"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceHundreds
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceHundreds ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* 3. MILHAR */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Milhar:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleThousands}
                                                                    onChange={e => setScaleThousands(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceThousands(!showPromoPriceThousands)}
                                                                title={showPromoPriceThousands ? "Ocultar Milhar" : "Exibir Milhar"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceThousands
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceThousands ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                /* TAMANHO ÚNICO PARA TODOS OS OUTROS ELEMENTOS */
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tamanho da Fonte:</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="1000"
                                                            value={
                                                                selectedElement === 'title' ? titleFontSizeTens :
                                                                selectedElement === 'deText' ? deFontSizeTens :
                                                                selectedElement === 'normalPrice' ? normalPriceFontSizeTens :
                                                                selectedElement === 'porText' ? porFontSizeTens :
                                                                selectedElement === 'currencySymbol' ? currencyFontSizeTens :
                                                                selectedElement === 'cents' ? centsFontSizeTens :
                                                                installmentsFontSizeTens
                                                            }
                                                            onChange={e => {
                                                                const v = Number(e.target.value);
                                                                if (selectedElement === 'title') { setTitleFontSizeTens(v); setTitleFontSizeHundreds(v); setTitleFontSizeThousands(v); }
                                                                else if (selectedElement === 'deText') { setDeFontSizeTens(v); setDeFontSizeHundreds(v); setDeFontSizeThousands(v); }
                                                                else if (selectedElement === 'normalPrice') { setNormalPriceFontSizeTens(v); setNormalPriceFontSizeHundreds(v); setNormalPriceFontSizeThousands(v); }
                                                                else if (selectedElement === 'porText') { setPorFontSizeTens(v); setPorFontSizeHundreds(v); setPorFontSizeThousands(v); }
                                                                else if (selectedElement === 'currencySymbol') { setCurrencyFontSizeTens(v); setCurrencyFontSizeHundreds(v); setCurrencyFontSizeThousands(v); }
                                                                else if (selectedElement === 'cents') { setCentsFontSizeTens(v); setCentsFontSizeHundreds(v); setCentsFontSizeThousands(v); }
                                                                else if (selectedElement === 'installments') { setInstallmentsFontSizeTens(v); setInstallmentsFontSizeHundreds(v); setInstallmentsFontSizeThousands(v); }
                                                            }}
                                                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-20 text-center h-8"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400">px</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* SELETOR DE COR COMPACTO COM POPUP FLUTUANTE */}
                        {selectedElement !== 'dePricePorGroup' && (
                            <div className="relative shrink-0 flex items-center">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPickerDropdown(!showColorPickerDropdown);
                                }}
                                className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer overflow-hidden p-0.5 bg-white dark:bg-slate-900 active:scale-95 transition-all"
                                title="Alterar Cor"
                            >
                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: activeColor }} />
                            </button>

                            {showColorPickerDropdown && (
                                <>
                                    {/* Overlay desfocado cobrindo a tela */}
                                    <div 
                                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9999]" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeColorPicker();
                                        }} 
                                    />
                                    
                                    {/* Modal flutuante de cor por Tipo de Etiqueta */}
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 z-[10000] animate-fade-in flex flex-col max-h-[85vh]"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                                    <i className="bi bi-palette-fill text-base" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                        Cores por Tipo de Etiqueta
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-bold">
                                                        Configure a cor e veja as cores recentes para cada modalidade
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                        onClick={closeColorPicker} 
                                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                <i className="bi bi-x-lg text-xs" />
                                            </button>
                                        </div>

                                        {/* Lista de Tópicos por Tipo de Etiqueta */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                                            {allOppOptions.map(opp => {
                                                const isCurrentActiveOpp = selectedOppId === opp.id;
                                                const oppColor = (() => {
                                                    if (selectedElement && oppColorsMap[opp.id]?.[selectedElement]) {
                                                        return oppColorsMap[opp.id][selectedElement];
                                                    }
                                                    if (selectedElement === 'background') return getDefaultBg(opp.id);
                                                    if (selectedElement === 'promoPrice') return '#1e3a8a';
                                                    if (selectedElement === 'title' || selectedElement === 'deText' || selectedElement === 'normalPrice' || selectedElement === 'porText' || selectedElement === 'currencySymbol' || selectedElement === 'cents' || selectedElement === 'installments') {
                                                        return '#000000';
                                                    }
                                                    return '#000000';
                                                })();

                                                const handleOppColorChange = (color: string) => {
                                                    if (!selectedElement) return;
                                                    setOppColorsMap(prev => ({
                                                        ...prev,
                                                        [opp.id]: {
                                                            ...(prev[opp.id] || {}),
                                                            [selectedElement]: color
                                                        }
                                                    }));
                                                    if (isCurrentActiveOpp) {
                                                        handleColorSelect(color, false);
                                                    }
                                                    pendingGradientColorRef.current = color;
                                                };

                                                return (
                                                    <div 
                                                        key={opp.id}
                                                        className={`p-4 rounded-2xl border transition-all ${
                                                            isCurrentActiveOpp 
                                                                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                                        }`}
                                                    >
                                                        {/* Nome do Tipo de Etiqueta */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${isCurrentActiveOpp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                                                                    {opp.name}
                                                                </span>
                                                            </div>
                                                            {isCurrentActiveOpp && (
                                                                <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                                                    VISÃO ATUAL
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Seletor de Cor + Hex */}
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <label className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md cursor-pointer overflow-hidden bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5 shrink-0 hover:scale-105 active:scale-95 transition-all">
                                                                <input
                                                                    type="color"
                                                                    value={oppColor}
                                                                    onChange={e => handleOppColorChange(e.target.value)}
                                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                                />
                                                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: oppColor }} />
                                                            </label>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Cor da Fonte</span>
                                                                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{oppColor}</span>
                                                            </div>
                                                        </div>

                                                        {/* Cores Recentes Usadas */}
                                                        {colorHistory.length > 0 && (
                                                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                                                                    Cores Recentes:
                                                                </span>
                                                                <div className="flex items-center gap-1.5 flex-wrap select-none">
                                                                    {colorHistory.map((color, cIdx) => (
                                                                        <button
                                                                            key={`${opp.id}-${color}-${cIdx}`}
                                                                            type="button"
                                                                            onClick={() => handleOppColorChange(color)}
                                                                            className={`w-7 h-7 rounded-lg border shadow-2xs hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                                                                color.toLowerCase() === oppColor.toLowerCase() 
                                                                                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
                                                                                    : 'border-slate-300/40 dark:border-slate-700/60'
                                                                            }`}
                                                                            style={{ backgroundColor: color }}
                                                                            title={color}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        )}

                        {/* VISIBILIDADE TOGGLE (SÓ ÍCONE DE OLHO) */}
                        {(() => {
                            const layer = priceLabelLayers.find(l => l.key === selectedElement);
                            if (!layer || layer.key === 'background') return null;
                            return (
                                <button
                                    type="button"
                                    onClick={layer.toggleVisibility}
                                    title={layer.isVisible ? "Camada Visível (Clique para Ocultar)" : "Camada Oculta (Clique para Exibir)"}
                                    className={`w-8 h-8 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
                                        layer.isVisible 
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' 
                                            : 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                    }`}
                                >
                                    <i className={`bi ${layer.isVisible ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                </button>
                            );
                        })()}

                    </div>
                ) : (
                    <div className="text-[11px] font-medium text-slate-400 italic">
                        Clique em qualquer elemento na etiqueta abaixo para editá-lo
                    </div>
                )}

            </div>

            {/* MODAL BODY: PREVIEW EM 100% DA LARGURA DISPONÍVEL */}
            {(() => {
                if (isArtConfigLoading) {
                    return (
                        <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-200/50 dark:bg-slate-950/80">
                            <div className="flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-slate-900 px-5 py-3 shadow-lg border border-slate-200 dark:border-slate-800">
                                <span className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                                <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    Carregando template
                                </span>
                            </div>
                        </div>
                    );
                }
                const activeTitleFontSize = selectedMagnitude === 'tens' ? titleFontSizeTens : selectedMagnitude === 'hundreds' ? titleFontSizeHundreds : titleFontSizeThousands;
                const activeDeFontSize = selectedMagnitude === 'tens' ? deFontSizeTens : selectedMagnitude === 'hundreds' ? deFontSizeHundreds : deFontSizeThousands;
                const activeNormalPriceFontSize = selectedMagnitude === 'tens' ? normalPriceFontSizeTens : selectedMagnitude === 'hundreds' ? normalPriceFontSizeHundreds : normalPriceFontSizeThousands;
                const activePorFontSize = selectedMagnitude === 'tens' ? porFontSizeTens : selectedMagnitude === 'hundreds' ? porFontSizeHundreds : porFontSizeThousands;
                const activeCurrencyFontSize = selectedMagnitude === 'tens' ? currencyFontSizeTens : selectedMagnitude === 'hundreds' ? currencyFontSizeHundreds : currencyFontSizeThousands;
                const activeCentsFontSize = selectedMagnitude === 'tens' ? centsFontSizeTens : selectedMagnitude === 'hundreds' ? centsFontSizeHundreds : centsFontSizeThousands;
                const activeInstallmentsFontSize = selectedMagnitude === 'tens' ? installmentsFontSizeTens : selectedMagnitude === 'hundreds' ? installmentsFontSizeHundreds : installmentsFontSizeThousands;
                const activePromoPriceScale = selectedMagnitude === 'tens' ? scaleTens : selectedMagnitude === 'hundreds' ? scaleHundreds : scaleThousands;

                return (
                    <div 
                        onClick={() => {
                            setSelectedElement(null);
                            setSelectedElements(new Set());
                        }}
                        className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 bg-slate-200/50 dark:bg-slate-950/80 overflow-y-auto custom-scrollbar relative z-20"
                    >
                        <div className="w-full max-w-full lg:max-w-4xl xl:max-w-5xl flex flex-col items-center justify-center my-auto p-4 sm:p-6 overflow-visible">
                            {/* Etiqueta de Preço: Renderizador Unificado 1:1 */}
                            <PriceLabelArtRenderer
                                    containerRefOut={previewRef}
                                    mode="edit"
                                    data={{
                                        artWidthMm: artworkSizeMm.widthMm,
                                        artHeightMm: artworkSizeMm.heightMm,
                                    title,
                                    showTitle,
                                    titleFontSize: activeTitleFontSize,
                                    titleColor,
                                    titleFontFamily,
                                    titlePos,
                                    titleRotation,
                                    titleWidth,

                                    deText,
                                    showDe,
                                    deFontSize: activeDeFontSize,
                                    deColor,
                                    deFontFamily,
                                    deRotation,

                                    normalPrice: isTestValuesModalOpen ? `${testNormalD1}${testNormalD2}${testNormalD3},00` : formatDisplayPrice(normalPrice),
                                    showNormalPrice,
                                    normalPriceFontSize: activeNormalPriceFontSize,
                                    normalPriceColor,
                                    normalPriceFontFamily,
                                    normalPriceRotation,

                                    porText,
                                    showPor,
                                    porFontSize: activePorFontSize,
                                    porColor,
                                    porFontFamily,
                                    porRotation,

                                    dePricePorGroupPos,
                                    dePricePorGroupRotation,
                                    dePricePorGroupGap,

                                    currencySymbol,
                                    showCurrency,
                                    currencyFontSize: activeCurrencyFontSize,
                                    currencyColor,
                                    currencyFontFamily,
                                    currencyPos,
                                    currencyRotation,

                                    promoPrice: promoPrice,
                                    showPromoPrice,
                                    priceScale: activePromoPriceScale,
                                    priceColor,
                                    promoPriceFontFamily,
                                    promoPricePos,
                                    promoPriceRotation,

                                    centsText,
                                    showCents,
                                    centsFontSize: activeCentsFontSize,
                                    centsColor,
                                    centsFontFamily,
                                    centsPos,
                                    centsRotation,

                                    installments,
                                    showInstallments,
                                    installmentsFontSize: activeInstallmentsFontSize,
                                    installmentsColor,
                                    installmentsFontFamily,
                                    installmentsPos,
                                    installmentsRotation,

                                    bgColor: bgColor && bgColor !== 'transparent'
                                        ? bgColor
                                        : oppColorsMap[selectedOppId]?.background || defaultBgColor,

                                    showPromoPriceThousands,
                                    showPromoPriceHundreds,
                                    showPromoPriceTens,
                                    scaleThousands,
                                    scaleHundreds,
                                    scaleTens,
                                    testMilharStr: isTestValuesModalOpen ? `${testMilharD1}.${testMilharD2}${testMilharD3}${testMilharD4}` : undefined,
                                    testCentenaStr: isTestValuesModalOpen ? `${testCentenaD1}${testCentenaD2}${testCentenaD3}` : undefined,
                                    testDezenaStr: isTestValuesModalOpen ? `${testDezenaD1}${testDezenaD2}` : undefined,
                                    selectedMagnitude
                                    }}
                                    selectedElement={selectedElement}
                                    selectedElements={selectedElements}
                                    onSelectElement={handleElementClick}
                                    startDragging={startDragging}
                                    startResizing={startResizing}
                                    startRotating={startRotating}
                                    onTitleWidthChange={setTitleWidth}
                                    showSafetyMargin={showSafetyMargin}
                                    activeGuideX={activeGuideX}
                                    activeGuideY={activeGuideY}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* Modal de Camadas Flutuante */}
            <PriceLabelLayersModal
                isOpen={isLayersModalOpen}
                onClose={() => setIsLayersModalOpen(false)}
                layers={priceLabelLayers}
                selectedElements={selectedElements}
                selectedElement={selectedElement}
                onSelectLayer={(key, isShift) => {
                    if (isShift) {
                        setSelectedElements(prev => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            if (next.size > 0) {
                                const arr = Array.from(next);
                                const last = arr[arr.length - 1];
                                setSelectedElement(last);
                                prevSelectedRef.current = last;
                            } else {
                                setSelectedElement(null);
                                prevSelectedRef.current = null;
                            }
                            return next;
                        });
                    } else {
                        setSelectedElement(key);
                        setSelectedElements(new Set([key]));
                        prevSelectedRef.current = key;
                        setIsLayersModalOpen(false);
                    }
                }}
                onCenterElement={handleCenterElement}
            />

            {/* Modal de seleção da visão de contexto */}
            <PriceLabelOpportunityModal
                isOpen={isOppSelectModalOpen}
                onClose={() => setIsOppSelectModalOpen(false)}
                allOppOptions={allOppOptions}
                selectedOppId={selectedOppId}
                onSelectOpportunityView={handleSelectOpportunityView}
            />

            {/* Modal de Preenchimento de Dados da Etiqueta */}
            <PriceLabelDataFillModal
                isOpen={isDataFillModalOpen}
                onClose={() => setIsDataFillModalOpen(false)}
                onApplyProductTitle={(prodName) => {
                    setTitle(prodName);
                    setShowTitle(true);
                    setIsDataFillModalOpen(false);
                    toast.success(`Nome "${prodName}" aplicado na etiqueta!`);
                }}
                title={title}
                setTitle={setTitle}
                normalPrice={normalPrice}
                setNormalPrice={setNormalPrice}
                promoPrice={promoPrice}
                setPromoPrice={setPromoPrice}
                centsText={centsText}
                setCentsText={setCentsText}
                currencySymbol={currencySymbol}
                setCurrencySymbol={setCurrencySymbol}
                installments={installments}
                setInstallments={setInstallments}
            />

            {/* Modal Footer Fullwidth */}
            <div className="flex items-center px-6 lg:px-10 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className={`flex items-center gap-2 text-xs font-bold ${
                    autoSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                }`}>
                    <i className={`bi text-sm ${
                        autoSaveStatus === 'saving'
                            ? 'bi-arrow-repeat animate-spin text-blue-500'
                            : autoSaveStatus === 'error'
                                ? 'bi-exclamation-circle-fill text-red-500'
                                : 'bi-cloud-check-fill text-emerald-500'
                    }`} />
                    <span>
                        {autoSaveStatus === 'saving'
                            ? 'Salvamento automático...'
                            : autoSaveStatus === 'error'
                                ? 'Erro no salvamento automático'
                                : 'Salvamento automático'}
                    </span>
                </div>
            </div>

            {/* Modal de Teste de Valores (Simulador com Sliders) */}
            <PriceLabelTestValuesModal
                isOpen={isTestValuesModalOpen}
                onClose={closeTestValuesModal}
                testDezenaD1={testDezenaD1}
                setTestDezenaD1={setTestDezenaD1}
                testDezenaD2={testDezenaD2}
                setTestDezenaD2={setTestDezenaD2}
                testCentenaD1={testCentenaD1}
                setTestCentenaD1={setTestCentenaD1}
                testCentenaD2={testCentenaD2}
                setTestCentenaD2={setTestCentenaD2}
                testCentenaD3={testCentenaD3}
                setTestCentenaD3={setTestCentenaD3}
                testMilharD1={testMilharD1}
                setTestMilharD1={setTestMilharD1}
                testMilharD2={testMilharD2}
                setTestMilharD2={setTestMilharD2}
                testMilharD3={testMilharD3}
                setTestMilharD3={setTestMilharD3}
                testMilharD4={testMilharD4}
                setTestMilharD4={setTestMilharD4}
                testNormalD1={testNormalD1}
                setTestNormalD1={setTestNormalD1}
                testNormalD2={testNormalD2}
                setTestNormalD2={setTestNormalD2}
                testNormalD3={testNormalD3}
                setTestNormalD3={setTestNormalD3}
            />
        </div>
    );
};

export default PriceLabelArtEditorModal;
