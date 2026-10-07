import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { copyLabelImageToClipboard, downloadLabelImage } from '../services/priceLabelExportService';
import { toast } from 'react-toastify';
import { PriceLabelArtRenderer } from '../components/PriceLabelArtRenderer';
import { calculateLabelPhysicalSize } from '../utils/LabelPhysicalGeometry';
import { usePriceLabelState } from '../hooks/usePriceLabelState';
import { usePriceLabelTestValues } from '../hooks/usePriceLabelTestValues';
import { usePriceLabelEditorKeyboardShortcuts } from '../hooks/usePriceLabelEditorKeyboardShortcuts';
import { usePriceLabelLayerSelection } from '../hooks/usePriceLabelLayerSelection';
import { PriceLabelLayersModal } from './PriceLabelLayersModal';
import { PriceLabelOpportunityModal } from './PriceLabelOpportunityModal';
import { PriceLabelDataFillModal } from './PriceLabelDataFillModal';
import { PriceLabelTestValuesModal } from './PriceLabelTestValuesModal';
import { PriceLabelColorPickerPopup } from './price-label-editor/PriceLabelColorPickerPopup';
import { PriceLabelSelectedElementToolbar } from './price-label-editor/PriceLabelSelectedElementToolbar';
import {
  fetchPriceLabelArtConfig,
  fetchOpportunities,
} from '../services/priceLabelPersistenceService';
import { buildPriceLabelAutoSaveConfig } from '../services/priceLabelAutoSaveConfig';

import type {
  PriceLabelArtEditorModalProps,
  PriceLabelLayerKey,
} from '../types/PriceLabelArtEditorTypes';
import { PriceLabelEditorHeader } from './price-label-editor/PriceLabelEditorHeader';
import { PriceLabelEditorFooter } from './price-label-editor/PriceLabelEditorFooter';
import { PriceLabelMenuBar } from './price-label-editor/PriceLabelMenuBar';

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onArtConfigLoaded,
  initialProduct,
}) => {
  const isStandaloneTemplate = window.location.pathname === '/templates/price-label';
  const [isDataFillModalOpen, setIsDataFillModalOpen] = useState(false);
  const rawArtworkSize = calculateLabelPhysicalSize(config);
  const artworkSizeMm =
    rawArtworkSize && rawArtworkSize.widthMm >= rawArtworkSize.heightMm
      ? rawArtworkSize
      : { widthMm: 100, heightMm: 56 };
  const {
    getDefaultBg,
    showSafetyMargin,
    setShowSafetyMargin,
    oppColorsMap,
    setOppColorsMap,
    title,
    setTitle,
    showTitle,
    setShowTitle,
    titleFontSizeTens,
    setTitleFontSizeTens,
    titleFontSizeHundreds,
    setTitleFontSizeHundreds,
    titleFontSizeThousands,
    setTitleFontSizeThousands,
    titleColor,
    setTitleColor,
    titleFontFamily,
    setTitleFontFamily,
    titlePos,
    setTitlePos,
    titleRotation,
    setTitleRotation,
    titleWidth,
    setTitleWidth,
    deText,
    setDeText,
    showDe,
    setShowDe,
    deFontSizeTens,
    setDeFontSizeTens,
    deFontSizeHundreds,
    setDeFontSizeHundreds,
    deFontSizeThousands,
    setDeFontSizeThousands,
    deColor,
    setDeColor,
    deFontFamily,
    setDeFontFamily,
    dePos,
    setDePos,
    deRotation,
    setDeRotation,
    normalPrice,
    setNormalPrice,
    showNormalPrice,
    setShowNormalPrice,
    normalPriceFontSizeTens,
    setNormalPriceFontSizeTens,
    normalPriceFontSizeHundreds,
    setNormalPriceFontSizeHundreds,
    normalPriceFontSizeThousands,
    setNormalPriceFontSizeThousands,
    normalPriceColor,
    setNormalPriceColor,
    normalPriceFontFamily,
    setNormalPriceFontFamily,
    normalPricePos,
    setNormalPricePos,
    normalPriceRotation,
    setNormalPriceRotation,
    porText,
    setPorText,
    showPor,
    setShowPor,
    porFontSizeTens,
    setPorFontSizeTens,
    porFontSizeHundreds,
    setPorFontSizeHundreds,
    porFontSizeThousands,
    setPorFontSizeThousands,
    porColor,
    setPorColor,
    porFontFamily,
    setPorFontFamily,
    porPos,
    setPorPos,
    porRotation,
    setPorRotation,
    currencySymbol,
    setCurrencySymbol,
    showCurrency,
    setShowCurrency,
    currencyFontSizeTens,
    setCurrencyFontSizeTens,
    currencyFontSizeHundreds,
    setCurrencyFontSizeHundreds,
    currencyFontSizeThousands,
    setCurrencyFontSizeThousands,
    currencyColor,
    setCurrencyColor,
    currencyFontFamily,
    setCurrencyFontFamily,
    currencyPos,
    setCurrencyPos,
    currencyRotation,
    setCurrencyRotation,
    promoPrice,
    setPromoPrice,
    showPromoPrice,
    setShowPromoPrice,
    showPromoPriceTens,
    setShowPromoPriceTens,
    showPromoPriceHundreds,
    setShowPromoPriceHundreds,
    showPromoPriceThousands,
    setShowPromoPriceThousands,
    showSizeDropdown,
    setShowSizeDropdown,
    priceColor,
    setPriceColor,
    promoPriceFontFamily,
    setPromoPriceFontFamily,
    promoPricePos,
    setPromoPricePos,
    promoPriceRotation,
    setPromoPriceRotation,
    scaleTens,
    setScaleTens,
    scaleHundreds,
    setScaleHundreds,
    scaleThousands,
    setScaleThousands,
    scaleTenThousands,
    setScaleTenThousands,
    centsText,
    setCentsText,
    showCents,
    setShowCents,
    centsFontSizeTens,
    setCentsFontSizeTens,
    centsFontSizeHundreds,
    setCentsFontSizeHundreds,
    centsFontSizeThousands,
    setCentsFontSizeThousands,
    centsColor,
    setCentsColor,
    centsFontFamily,
    setCentsFontFamily,
    centsPos,
    setCentsPos,
    centsRotation,
    setCentsRotation,
    selectedMagnitude,
    setSelectedMagnitude,
    activeGuideX,
    setActiveGuideX,
    activeGuideY,
    setActiveGuideY,
    dbOpportunities,
    setDbOpportunities,
    selectedOppId,
    setSelectedOppId,
    showInstallments,
    setShowInstallments,
    installments,
    setInstallments,
    installmentsFontSizeTens,
    setInstallmentsFontSizeTens,
    installmentsFontSizeHundreds,
    setInstallmentsFontSizeHundreds,
    installmentsFontSizeThousands,
    setInstallmentsFontSizeThousands,
    installmentsColor,
    setInstallmentsColor,
    installmentsFontFamily,
    setInstallmentsFontFamily,
    installmentsPos,
    setInstallmentsPos,
    installmentsRotation,
    setInstallmentsRotation,
    dePricePorGroupPos,
    setDePricePorGroupPos,
    dePricePorGroupRotation,
    setDePricePorGroupRotation,
    dePricePorGroupGap,
    setDePricePorGroupGap,
    defaultBgColor,
    bgColor,
    setBgColor,
    selectedElement,
    setSelectedElement,
    selectedElements,
    setSelectedElements,
    isArtConfigLoading,
    setIsArtConfigLoading,
    autoSaveStatus,
    setAutoSaveStatus,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    saveQueueRef,
    isFileMenuOpen,
    setIsFileMenuOpen,
    isCenterMenuOpen,
    setIsCenterMenuOpen,
    isOppSelectModalOpen,
    setIsOppSelectModalOpen,
    isLayersModalOpen,
    setIsLayersModalOpen,
    showColorPickerDropdown,
    setShowColorPickerDropdown,
    pendingGradientColorRef,
    applySnapshot,
    getSnapshot,
    getMagnitudeSnapshot,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = usePriceLabelState(initialProduct, config, isOpen);
  const [colorHistory, setColorHistory] = useState<string[]>([
    '#000000',
    '#1e3a8a',
    '#dc2626',
    '#ea580c',
    '#ffffff',
    '#2563eb',
    '#16a34a',
    '#ff7900',
    '#7c3aed',
  ]);
  const handleCenterElement = (elementKey: string | null) => {
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
    const labelName = priceLabelLayers.find((l) => l.key === elementKey)?.label || elementKey;
    toast.success(`Componente "${labelName}" centralizado na etiqueta!`);
  };

  const closeColorPicker = () => {
    const color = pendingGradientColorRef.current;
    if (color) {
      setColorHistory((prev) =>
        [color, ...prev.filter((item) => item.toLowerCase() !== color.toLowerCase())].slice(0, 10)
      );
      pendingGradientColorRef.current = null;
    }
    setShowColorPickerDropdown(false);
  };
  const {
    isTestValuesModalOpen,
    openTestValuesModal,
    closeTestValuesModal,
    testDezenaD1,
    setTestDezenaD1,
    testDezenaD2,
    setTestDezenaD2,
    testCentenaD1,
    setTestCentenaD1,
    testCentenaD2,
    setTestCentenaD2,
    testCentenaD3,
    setTestCentenaD3,
    testMilharD1,
    setTestMilharD1,
    testMilharD2,
    setTestMilharD2,
    testMilharD3,
    setTestMilharD3,
    testMilharD4,
    setTestMilharD4,
    testNormalD1,
    setTestNormalD1,
    testNormalD2,
    setTestNormalD2,
    testNormalD3,
    setTestNormalD3,
  } = usePriceLabelTestValues({
    promoPrice,
    normalPrice,
    setPromoPrice,
    setNormalPrice,
  });

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
    initialPositions: {},
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
    initialVal: 0,
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
    initialRot: 0,
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
      const dbArtConfig = (await fetchPriceLabelArtConfig(layoutId)) || config?.artConfig;
      if (cancelled) return;

      if (dbArtConfig) {
        onArtConfigLoaded?.(dbArtConfig);
        if (dbArtConfig.oppColorsMap && typeof dbArtConfig.oppColorsMap === 'object') {
          setOppColorsMap(dbArtConfig.oppColorsMap);
        }

        const snapshotToApply =
          dbArtConfig.opportunities?.['none'] ||
          dbArtConfig.opportunities?.['default'] ||
          dbArtConfig.opportunities?.['salvado'] ||
          dbArtConfig.globalSnapshot ||
          Object.values(dbArtConfig.opportunities || {})[0];

        if (snapshotToApply) {
          const { selectedOppId: _savedContext, ...globalLayout } = snapshotToApply as Record<
            string,
            any
          >;
          applySnapshot(globalLayout, isInitializedRef.current);
        } else {
          const initialBg =
            selectedOppId === 'none'
              ? '#ffffff'
              : selectedOppId === 'salvado'
                ? '#ff7900'
                : '#ffffff';
          setBgColor(initialBg);
        }
      } else {
        const initialBg =
          selectedOppId === 'none'
            ? '#ffffff'
            : selectedOppId === 'salvado'
              ? '#ff7900'
              : '#ffffff';
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
        console.error('Erro ao carregar oportunidades:', err);
      }
    }
    fetchOpps();
  }, [isOpen, initialProduct]);

  // LISTA DE OPÇÕES DO SELETOR DE ETIQUETA
  const allOppOptions = useMemo(() => {
    const baseOptions = [{ id: 'none', name: 'SEM OPORTUNIDADE' }];

    if (dbOpportunities && dbOpportunities.length > 0) {
      const oppsMapped = dbOpportunities.map((opp) => ({
        id: opp.id || opp.slug || opp.name,
        name: opp.name.toUpperCase(),
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
    setBgColor(
      savedBackground && savedBackground !== 'transparent' ? savedBackground : defaultBgColor
    );
  }, [selectedOppId, oppColorsMap, defaultBgColor]);

  const queueAutoSave = (snapshot: Record<string, any>, serialized: string) => {
    const previousSnapshot = lastQueuedSnapshotRef.current;
    lastQueuedSnapshotRef.current = serialized;
    latestRequestedSnapshotRef.current = serialized;
    setAutoSaveStatus('saving');

    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(() =>
        onSaveConfig(
          buildPriceLabelAutoSaveConfig({
            artConfig: config.artConfig,
            snapshot,
            oppColorsMap,
            selectedOppId,
            title,
            normalPrice,
            promoPrice,
            showPromoPrice,
            priceColor,
            showTitle,
            scaleTens,
            scaleHundreds,
            scaleThousands,
            scaleTenThousands,
            titlePos,
            titleWidth,
            promoPricePos,
            dePricePorGroupPos,
            dePricePorGroupRotation,
            dePricePorGroupGap,
          })
        )
      )
      .then(() => {
        if (latestRequestedSnapshotRef.current === serialized) setAutoSaveStatus('saved');
      })
      .catch((error) => {
        if (lastQueuedSnapshotRef.current === serialized)
          lastQueuedSnapshotRef.current = previousSnapshot;
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

  const keyboardPositionSetters = useMemo(
    () => ({
      title: setTitlePos,
      dePricePorGroup: setDePricePorGroupPos,
      deText: setDePos,
      normalPrice: setNormalPricePos,
      porText: setPorPos,
      currencySymbol: setCurrencyPos,
      promoPrice: setPromoPricePos,
      cents: setCentsPos,
      installments: setInstallmentsPos,
    }),
    [
      setTitlePos,
      setDePricePorGroupPos,
      setDePos,
      setNormalPricePos,
      setPorPos,
      setCurrencyPos,
      setPromoPricePos,
      setCentsPos,
      setInstallmentsPos,
    ]
  );

  usePriceLabelEditorKeyboardShortcuts({
    isOpen,
    selectedElement,
    onUndo: handleUndo,
    onRedo: handleRedo,
    positionSetters: keyboardPositionSetters,
  });

  // A selection change on click cycles overlapping layers; Shift keeps multi-selection.
  const handleElementClick = usePriceLabelLayerSelection({
    previousSelectedRef: prevSelectedRef,
    setSelectedElement,
    setSelectedElements,
    showTitle,
    showDe,
    showNormalPrice,
    showPor,
    showCurrency,
    showPromoPrice,
    showCents,
    showInstallments,
  });

  // ARRASTATOR DE ELEMENTOS NO CANVAS COM ÍMÃ E LINHAS GUIA MAGNÉTICAS (SUPORTE A MULTISELEÇÃO E MOVIMENTAÇÃO CONJUNTA)
  const startDragging = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
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
        initialPositions,
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
          { x: 0, y: 0 }, // Centro da etiqueta
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
            y: startPos.y + finalDy,
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
    },
    [
      selectedElement,
      selectedElements,
      titlePos,
      dePricePorGroupPos,
      dePos,
      normalPricePos,
      porPos,
      currencyPos,
      promoPricePos,
      centsPos,
      installmentsPos,
      showTitle,
      showDe,
      showNormalPrice,
      showPor,
      showCurrency,
      showPromoPrice,
      showCents,
      showInstallments,
    ]
  );

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
    selectedMagnitude === 'tens'
      ? scaleTens
      : selectedMagnitude === 'hundreds'
        ? scaleHundreds
        : selectedMagnitude === 'thousands'
          ? scaleThousands
          : scaleTenThousands;

  // REDIMENSIONAR ELEMENTO ARRASTANDO O CANTO INFERIOR DIREITO
  const startResizing = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
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
        initialTenThousands: scaleTenThousands,
      };

      const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
        if (!resizeRef.current.isResizing || !resizeRef.current.layer) return;
        const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

        const delta = curX - resizeRef.current.startX + (curY - resizeRef.current.startY);
        const l = resizeRef.current.layer;

        if (l === 'promoPrice') {
          const deltaPx = Math.round(delta * 0.18);
          setScaleTens(Math.max(10, (resizeRef.current.initialTens ?? scaleTens) + deltaPx));
          setScaleHundreds(
            Math.max(10, (resizeRef.current.initialHundreds ?? scaleHundreds) + deltaPx)
          );
          setScaleThousands(
            Math.max(10, (resizeRef.current.initialThousands ?? scaleThousands) + deltaPx)
          );
          setScaleTenThousands(
            Math.max(10, (resizeRef.current.initialTenThousands ?? scaleTenThousands) + deltaPx)
          );
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
    },
    [
      activeTitleFontSize,
      activeDeFontSize,
      activeNormalPriceFontSize,
      activePorFontSize,
      activeCurrencyFontSize,
      activeCentsFontSize,
      activeInstallmentsFontSize,
      activeScale,
      selectedMagnitude,
    ]
  );

  // ROTACIONAR ELEMENTO ARRASTANDO A SETA CURVADA
  const startRotating = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
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
        initialRot,
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
    },
    [
      titleRotation,
      deRotation,
      normalPriceRotation,
      porRotation,
      currencyRotation,
      promoPriceRotation,
      centsRotation,
      installmentsRotation,
    ]
  );

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
      setOppColorsMap((prev) => ({
        ...prev,
        [selectedOppId]: {
          ...(prev[selectedOppId] || {}),
          [selectedElement]: newColor,
        },
      }));
    }

    if (addToHistory) {
      setColorHistory((prev) => {
        const filtered = prev.filter((c) => c.toLowerCase() !== newColor.toLowerCase());
        return [newColor, ...filtered].slice(0, 10);
      });
    }
  };

  const handleOpportunityColorChange = (
    opportunityId: string,
    color: string,
    isCurrentActiveOpp: boolean
  ) => {
    if (!selectedElement) return;

    setOppColorsMap((prev) => ({
      ...prev,
      [opportunityId]: {
        ...(prev[opportunityId] || {}),
        [selectedElement]: color,
      },
    }));
    if (isCurrentActiveOpp) handleColorSelect(color, false);
    pendingGradientColorRef.current = color;
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
    selectedElements.forEach((key) => {
      if (key === 'title') {
        setTitleFontSizeTens(v);
        setTitleFontSizeHundreds(v);
        setTitleFontSizeThousands(v);
      } else if (key === 'deText') {
        setDeFontSizeTens(v);
        setDeFontSizeHundreds(v);
        setDeFontSizeThousands(v);
      } else if (key === 'normalPrice') {
        setNormalPriceFontSizeTens(v);
        setNormalPriceFontSizeHundreds(v);
        setNormalPriceFontSizeThousands(v);
      } else if (key === 'porText') {
        setPorFontSizeTens(v);
        setPorFontSizeHundreds(v);
        setPorFontSizeThousands(v);
      } else if (key === 'installments') {
        setInstallmentsFontSizeTens(v);
        setInstallmentsFontSizeHundreds(v);
        setInstallmentsFontSizeThousands(v);
      } else if (key === 'currencySymbol') {
        setCurrencyFontSizeTens(v);
        setCurrencyFontSizeHundreds(v);
        setCurrencyFontSizeThousands(v);
      } else if (key === 'cents') {
        setCentsFontSizeTens(v);
        setCentsFontSizeHundreds(v);
        setCentsFontSizeThousands(v);
      } else if (key === 'promoPrice') {
        if (selectedMagnitude === 'tens') setScaleTens(v);
        else if (selectedMagnitude === 'hundreds') setScaleHundreds(v);
        else setScaleThousands(v);
      }
    });
  };

  const handleBatchFontFamily = (fontVal: string) => {
    selectedElements.forEach((key) => {
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
    selectedElement === 'title'
      ? titleFontFamily
      : selectedElement === 'deText'
        ? deFontFamily
        : selectedElement === 'normalPrice'
          ? normalPriceFontFamily
          : selectedElement === 'porText'
            ? porFontFamily
            : selectedElement === 'currencySymbol'
              ? currencyFontFamily
              : selectedElement === 'promoPrice'
                ? promoPriceFontFamily
                : selectedElement === 'cents'
                  ? centsFontFamily
                  : selectedElement === 'installments'
                    ? installmentsFontFamily
                    : 'Inter, system-ui, sans-serif';

  const activeColor =
    selectedElement === 'title'
      ? titleColor
      : selectedElement === 'deText'
        ? deColor
        : selectedElement === 'normalPrice'
          ? normalPriceColor
          : selectedElement === 'porText'
            ? porColor
            : selectedElement === 'currencySymbol'
              ? currencyColor
              : selectedElement === 'promoPrice'
                ? priceColor
                : selectedElement === 'cents'
                  ? centsColor
                  : selectedElement === 'installments'
                    ? installmentsColor
                    : bgColor && bgColor !== 'transparent'
                      ? bgColor
                      : oppColorsMap[selectedOppId]?.background || defaultBgColor;

  if (!isOpen) return null;

  const priceLabelLayers: {
    key: NonNullable<PriceLabelLayerKey>;
    label: string;
    icon: string;
    isVisible: boolean;
    toggleVisibility: () => void;
    pos: { x: number; y: number };
    resetPos: () => void;
    desc: string;
  }[] = [
    {
      key: 'title',
      label: 'NOME DO PRODUTO',
      icon: 'bi-fonts',
      isVisible: showTitle,
      toggleVisibility: () => setShowTitle(!showTitle),
      pos: titlePos,
      resetPos: () => {
        setTitlePos({ x: 0, y: 0 });
        setTitleRotation(0);
      },
      desc: 'Cabeçalho superior',
    },
    {
      key: 'deText',
      label: 'TEXTO "DE"',
      icon: 'bi-type',
      isVisible: showDe,
      toggleVisibility: () => setShowDe(!showDe),
      pos: dePos,
      resetPos: () => {
        setDePos({ x: 0, y: 0 });
        setDeRotation(0);
      },
      desc: 'Prefixo do preço original',
    },
    {
      key: 'normalPrice',
      label: 'PREÇO ORIGINAL (DE:)',
      icon: 'bi-type-strikethrough',
      isVisible: showNormalPrice,
      toggleVisibility: () => setShowNormalPrice(!showNormalPrice),
      pos: normalPricePos,
      resetPos: () => {
        setNormalPricePos({ x: 0, y: 0 });
        setNormalPriceRotation(0);
      },
      desc: 'Valor riscado horizontalmente',
    },
    {
      key: 'porText',
      label: 'TEXTO "POR:"',
      icon: 'bi-type',
      isVisible: showPor,
      toggleVisibility: () => setShowPor(!showPor),
      pos: porPos,
      resetPos: () => {
        setPorPos({ x: 0, y: 0 });
        setPorRotation(0);
      },
      desc: 'Sufixo do preço original',
    },
    {
      key: 'currencySymbol',
      label: 'SÍMBOLO MOEDA (R$)',
      icon: 'bi-currency-dollar',
      isVisible: showCurrency,
      toggleVisibility: () => setShowCurrency(!showCurrency),
      pos: currencyPos,
      resetPos: () => {
        setCurrencyPos({ x: 0, y: 0 });
        setCurrencyRotation(0);
      },
      desc: 'Símbolo R$ à esquerda',
    },
    {
      key: 'promoPrice',
      label: 'PREÇO PRINCIPAL (POR:)',
      icon: 'bi-tag-fill',
      isVisible: showPromoPrice,
      toggleVisibility: () => setShowPromoPrice(!showPromoPrice),
      pos: promoPricePos,
      resetPos: () => {
        setPromoPricePos({ x: 0, y: 0 });
        setPromoPriceRotation(0);
      },
      desc: 'Valor em destaque grande',
    },
    {
      key: 'cents',
      label: 'CENTAVOS (,00)',
      icon: 'bi-superscript',
      isVisible: showCents,
      toggleVisibility: () => setShowCents(!showCents),
      pos: centsPos,
      resetPos: () => {
        setCentsPos({ x: 0, y: 0 });
        setCentsRotation(0);
      },
      desc: 'Dígitos centavos à direita',
    },
    {
      key: 'installments',
      label: 'PARCELAMENTO',
      icon: 'bi-credit-card-2-front-fill',
      isVisible: showInstallments,
      toggleVisibility: () => setShowInstallments(!showInstallments),
      pos: installmentsPos,
      resetPos: () => {
        setInstallmentsPos({ x: 0, y: 0 });
        setInstallmentsRotation(0);
      },
      desc: 'Condições de pagamento',
    },
    {
      key: 'background',
      label: 'FUNDO DA ETIQUETA',
      icon: 'bi-palette-fill',
      isVisible: true,
      toggleVisibility: () => {},
      pos: { x: 0, y: 0 },
      resetPos: () => {},
      desc: 'Cor de fundo da etiqueta',
    },
  ];

  const handleCopyImage = () => copyLabelImageToClipboard(previewRef.current);

  const handleDownloadPng = () => {
    downloadLabelImage(
      previewRef.current,
      'etiqueta_preco_' + selectedOppId + '_' + Date.now() + '.png'
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col animate-fade-in overflow-hidden w-screen h-screen ${isStandaloneTemplate ? 'bg-white dark:bg-slate-950' : 'bg-slate-900/90 backdrop-blur-md'}`}
    >
      <PriceLabelEditorHeader
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBackToErp={handleBackToErp}
      />

      <PriceLabelMenuBar
        onDownloadPng={handleDownloadPng}
        onCopyImage={handleCopyImage}
        onRenameTitle={() => {
          setSelectedElement('title');
          setSelectedElements(new Set(['title']));
          const newTitle = window.prompt('Nome / Título da Arte:', title);
          if (newTitle !== null && newTitle.trim()) {
            setTitle(newTitle.trim().toUpperCase());
            toast.success('Título da arte atualizado!');
          }
        }}
        onOpenLayersModal={() => setIsLayersModalOpen(true)}
        showSafetyMargin={showSafetyMargin}
        onToggleSafetyMargin={() => setShowSafetyMargin(!showSafetyMargin)}
        selectedOppId={selectedOppId}
        onSelectOpportunityContext={handleSelectOpportunityContext}
        allOppOptions={allOppOptions}
        onOpenDataFillModal={() => setIsDataFillModalOpen(true)}
        onOpenTestValuesModal={openTestValuesModal}
      />

      {/* 3. BARRA DE FERRAMENTAS DO ELEMENTO SELECIONADO */}
      <PriceLabelSelectedElementToolbar
        selectedElement={selectedElement}
        selectedElements={selectedElements}
        onClearSelection={() => {
          setSelectedElement(null);
          setSelectedElements(new Set());
        }}
        priceLabelLayers={priceLabelLayers}
        activeFontFamily={activeFontFamily}
        onFontChange={handleFontChange}
        onBatchFontFamily={handleBatchFontFamily}
        onBatchFontSize={handleBatchFontSize}
        dePricePorGroupGap={dePricePorGroupGap}
        setDePricePorGroupGap={setDePricePorGroupGap}
        scaleTens={scaleTens}
        setScaleTens={setScaleTens}
        showPromoPriceTens={showPromoPriceTens}
        setShowPromoPriceTens={setShowPromoPriceTens}
        scaleHundreds={scaleHundreds}
        setScaleHundreds={setScaleHundreds}
        showPromoPriceHundreds={showPromoPriceHundreds}
        setShowPromoPriceHundreds={setShowPromoPriceHundreds}
        scaleThousands={scaleThousands}
        setScaleThousands={setScaleThousands}
        showPromoPriceThousands={showPromoPriceThousands}
        setShowPromoPriceThousands={setShowPromoPriceThousands}
        titleFontSizeTens={titleFontSizeTens}
        setTitleFontSizeTens={setTitleFontSizeTens}
        setTitleFontSizeHundreds={setTitleFontSizeHundreds}
        setTitleFontSizeThousands={setTitleFontSizeThousands}
        deFontSizeTens={deFontSizeTens}
        setDeFontSizeTens={setDeFontSizeTens}
        setDeFontSizeHundreds={setDeFontSizeHundreds}
        setDeFontSizeThousands={setDeFontSizeThousands}
        normalPriceFontSizeTens={normalPriceFontSizeTens}
        setNormalPriceFontSizeTens={setNormalPriceFontSizeTens}
        setNormalPriceFontSizeHundreds={setNormalPriceFontSizeHundreds}
        setNormalPriceFontSizeThousands={setNormalPriceFontSizeThousands}
        porFontSizeTens={porFontSizeTens}
        setPorFontSizeTens={setPorFontSizeTens}
        setPorFontSizeHundreds={setPorFontSizeHundreds}
        setPorFontSizeThousands={setPorFontSizeThousands}
        currencyFontSizeTens={currencyFontSizeTens}
        setCurrencyFontSizeTens={setCurrencyFontSizeTens}
        setCurrencyFontSizeHundreds={setCurrencyFontSizeHundreds}
        setCurrencyFontSizeThousands={setCurrencyFontSizeThousands}
        centsFontSizeTens={centsFontSizeTens}
        setCentsFontSizeTens={setCentsFontSizeTens}
        setCentsFontSizeHundreds={setCentsFontSizeHundreds}
        setCentsFontSizeThousands={setCentsFontSizeThousands}
        installmentsFontSizeTens={installmentsFontSizeTens}
        setInstallmentsFontSizeTens={setInstallmentsFontSizeTens}
        setInstallmentsFontSizeHundreds={setInstallmentsFontSizeHundreds}
        setInstallmentsFontSizeThousands={setInstallmentsFontSizeThousands}
        activeColor={activeColor}
        onToggleColorPicker={(event) => {
          event.stopPropagation();
          setShowColorPickerDropdown(!showColorPickerDropdown);
        }}
        showSizeDropdown={showSizeDropdown}
        setShowSizeDropdown={setShowSizeDropdown}
      />
      <PriceLabelColorPickerPopup
        isOpen={showColorPickerDropdown}
        onClose={closeColorPicker}
        allOppOptions={allOppOptions}
        selectedOppId={selectedOppId}
        selectedElement={selectedElement}
        oppColorsMap={oppColorsMap}
        getDefaultBg={getDefaultBg}
        colorHistory={colorHistory}
        onOppColorChange={handleOpportunityColorChange}
      />

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
        const activeTitleFontSize =
          selectedMagnitude === 'tens'
            ? titleFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? titleFontSizeHundreds
              : titleFontSizeThousands;
        const activeDeFontSize =
          selectedMagnitude === 'tens'
            ? deFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? deFontSizeHundreds
              : deFontSizeThousands;
        const activeNormalPriceFontSize =
          selectedMagnitude === 'tens'
            ? normalPriceFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? normalPriceFontSizeHundreds
              : normalPriceFontSizeThousands;
        const activePorFontSize =
          selectedMagnitude === 'tens'
            ? porFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? porFontSizeHundreds
              : porFontSizeThousands;
        const activeCurrencyFontSize =
          selectedMagnitude === 'tens'
            ? currencyFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? currencyFontSizeHundreds
              : currencyFontSizeThousands;
        const activeCentsFontSize =
          selectedMagnitude === 'tens'
            ? centsFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? centsFontSizeHundreds
              : centsFontSizeThousands;
        const activeInstallmentsFontSize =
          selectedMagnitude === 'tens'
            ? installmentsFontSizeTens
            : selectedMagnitude === 'hundreds'
              ? installmentsFontSizeHundreds
              : installmentsFontSizeThousands;
        const activePromoPriceScale =
          selectedMagnitude === 'tens'
            ? scaleTens
            : selectedMagnitude === 'hundreds'
              ? scaleHundreds
              : scaleThousands;

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

                  normalPrice: isTestValuesModalOpen
                    ? `${testNormalD1}${testNormalD2}${testNormalD3},00`
                    : formatDisplayPrice(normalPrice),
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

                  bgColor:
                    bgColor && bgColor !== 'transparent'
                      ? bgColor
                      : oppColorsMap[selectedOppId]?.background || defaultBgColor,

                  showPromoPriceThousands,
                  showPromoPriceHundreds,
                  showPromoPriceTens,
                  scaleThousands,
                  scaleHundreds,
                  scaleTens,
                  testMilharStr: isTestValuesModalOpen
                    ? `${testMilharD1}.${testMilharD2}${testMilharD3}${testMilharD4}`
                    : undefined,
                  testCentenaStr: isTestValuesModalOpen
                    ? `${testCentenaD1}${testCentenaD2}${testCentenaD3}`
                    : undefined,
                  testDezenaStr: isTestValuesModalOpen
                    ? `${testDezenaD1}${testDezenaD2}`
                    : undefined,
                  selectedMagnitude,
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
            setSelectedElements((prev) => {
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

      <PriceLabelEditorFooter autoSaveStatus={autoSaveStatus} />

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
