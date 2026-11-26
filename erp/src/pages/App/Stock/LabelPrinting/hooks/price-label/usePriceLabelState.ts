import { useState, useRef, useCallback } from 'react';
import type {
  Opportunity,
  PriceLabelArtEditorModalProps,
} from '../../types/PriceLabelArtEditorTypes';
import { usePriceLabelHistory } from './usePriceLabelHistory';
import { buildPriceLabelStateSnapshot } from './priceLabelStateSnapshot';
import { usePriceLabelEditorTransientState } from './usePriceLabelEditorTransientState';
import { usePriceLabelTitleState } from './usePriceLabelTitleState';
import { usePriceLabelInstallmentsState } from './usePriceLabelInstallmentsState';
import { usePriceLabelPromoPriceState } from './usePriceLabelPromoPriceState';
import { applyPriceLabelMagnitudeSnapshot } from './priceLabelMagnitudeSnapshot';
import { applyPriceLabelSnapshot } from './priceLabelSnapshotRestoration';
import { usePriceLabelFixedElementStates } from './usePriceLabelFixedElementStates';
import {
  buildPriceLabelCurrentLayout,
  buildPriceLabelMagnitudeSnapshot,
  buildPriceLabelMagnitudeSnapshotSetters,
} from './priceLabelMagnitudeSnapshotState';

export function usePriceLabelState(
  initialProduct: PriceLabelArtEditorModalProps['initialProduct'],
  config: PriceLabelArtEditorModalProps['config'],
  isOpen: boolean,
  canEditHistory: () => boolean = () => true,
) {
  const [magnitudeTemplates, setMagnitudeTemplates] = useState<{
    tens?: any;
    hundreds?: any;
    thousands?: any;
  }>({});
  const getDefaultBg = (_oppId?: string) => '#ffffff';
  const [showSafetyMargin, setShowSafetyMargin] = useState(true);
  const [oppColorsMap, setOppColorsMap] = useState<Record<string, Record<string, string>>>({});

  const titleState = usePriceLabelTitleState(initialProduct, config);
  const fixedElementState = usePriceLabelFixedElementStates(initialProduct, config);
  const promoPriceState = usePriceLabelPromoPriceState(initialProduct, config);
  const installmentsState = usePriceLabelInstallmentsState();

  const [selectedMagnitude, setSelectedMagnitude] = useState<'tens' | 'hundreds' | 'thousands'>(
    'hundreds'
  );
  const [activeGuideX, setActiveGuideX] = useState<number | null>(null);
  const [activeGuideY, setActiveGuideY] = useState<number | null>(null);
  const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('none');
  const [dePricePorGroupPos, setDePricePorGroupPos] = useState({ x: 0, y: 0 });
  const [dePricePorGroupRotation, setDePricePorGroupRotation] = useState<number>(0);
  const [dePricePorGroupGap, setDePricePorGroupGap] = useState<number>(10);

  const defaultBgColor = getDefaultBg(selectedOppId);
  const [bgColor, setBgColor] = useState<string>(defaultBgColor);
  const editorTransientState = usePriceLabelEditorTransientState();
  const isApplyingHistoryRef = useRef<boolean>(false);

  const magnitudeSnapshotSetters = buildPriceLabelMagnitudeSnapshotSetters({
    ...titleState,
    ...fixedElementState,
    ...promoPriceState,
    ...installmentsState,
    setDePricePorGroupPos,
    setDePricePorGroupRotation,
    setDePricePorGroupGap,
    setBgColor,
  });

  const applyMagnitudeSnapshot = (s: any, preserveFixedTextStyles = false) =>
    applyPriceLabelMagnitudeSnapshot(
      s,
      preserveFixedTextStyles,
      magnitudeSnapshotSetters,
      defaultBgColor,
    );

  const applySnapshot = (s: any, preserveLayout = false) =>
    applyPriceLabelSnapshot({
      snapshot: s,
      preserveLayout,
      getCurrentLayout: () =>
        buildPriceLabelCurrentLayout({
          ...titleState,
          ...fixedElementState,
          ...promoPriceState,
          ...installmentsState,
          dePricePorGroupPos,
        }),
      selectedMagnitude,
      setSelectedMagnitude,
      setMagnitudeTemplates,
      setOppColorsMap,
      setSelectedOppId,
      applyMagnitudeSnapshot,
      setters: magnitudeSnapshotSetters,
      isApplyingHistoryRef,
    });

  const getMagnitudeSnapshot = useCallback(
    () =>
      buildPriceLabelMagnitudeSnapshot({
        ...titleState,
        ...fixedElementState,
        ...promoPriceState,
        ...installmentsState,
        dePricePorGroupPos,
        dePricePorGroupRotation,
        dePricePorGroupGap,
        bgColor,
      }),
    [
      titleState,
      fixedElementState,
      promoPriceState,
      installmentsState,
      dePricePorGroupPos,
      dePricePorGroupRotation,
      dePricePorGroupGap,
      bgColor,
    ]
  );

  const handleSwitchMagnitude = (newMag: 'tens' | 'hundreds' | 'thousands') => {
    if (newMag === selectedMagnitude) return;
    const curState = getMagnitudeSnapshot();
    const updatedMap = {
      ...magnitudeTemplates,
      [selectedMagnitude]: curState,
    };
    setMagnitudeTemplates(updatedMap);
    setSelectedMagnitude(newMag);
    const targetState = updatedMap[newMag];
    if (targetState) {
      applyMagnitudeSnapshot(targetState, true);
    }
  };

  const getSnapshot = useCallback(() => {
    const curMagState = getMagnitudeSnapshot();
    return buildPriceLabelStateSnapshot({
      selectedOppId,
      selectedMagnitude,
      magnitudeTemplates,
      oppColorsMap,
      currentMagnitudeSnapshot: curMagState,
    });
  }, [
    selectedOppId,
    selectedMagnitude,
    magnitudeTemplates,
    getMagnitudeSnapshot,
    oppColorsMap,
  ]);

  const {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = usePriceLabelHistory<ReturnType<typeof getSnapshot>>({
    canEdit: canEditHistory,
    isOpen,
    getSnapshot,
    applySnapshot,
    isApplyingHistoryRef,
  });

  return {
    applySnapshot,
    getSnapshot,
    getMagnitudeSnapshot,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    getDefaultBg,
    showSafetyMargin,
    setShowSafetyMargin,
    oppColorsMap,
    setOppColorsMap,
    ...titleState,
    ...fixedElementState,
    ...promoPriceState,
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
    ...installmentsState,
    dePricePorGroupPos,
    setDePricePorGroupPos,
    dePricePorGroupRotation,
    setDePricePorGroupRotation,
    dePricePorGroupGap,
    setDePricePorGroupGap,
    defaultBgColor,
    bgColor,
    setBgColor,
    ...editorTransientState,
  };
}
