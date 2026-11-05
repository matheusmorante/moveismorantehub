import React, { useState, useEffect, useRef } from 'react';
import type { ArtworkSaveGuard } from './price-label-editor/usePriceLabelArtworkSession';
import { PriceLabelArtEditorSession } from './price-label-editor/PriceLabelArtEditorSession';
import type { PriceLabelArtEditorModalProps } from '../types/PriceLabelArtEditorTypes';

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = (props) => {
  const guards = useRef(new Map<string, ArtworkSaveGuard>());
  const [isDataFillModalOpen, setIsDataFillModalOpen] = useState(false);
  const ownerKey = JSON.stringify([props.config.layoutId || 'preco_2x5_restored', props.config.category || 'precos']);
  if (!guards.current.has(ownerKey)) guards.current.set(ownerKey, { active: null, error: null });
  useEffect(() => {
    if (!props.isOpen) setIsDataFillModalOpen(false);
  }, [props.isOpen]);
  return props.isOpen ? (
    <PriceLabelArtEditorSession
      key={ownerKey}
      {...props}
      saveGuard={guards.current.get(ownerKey)!}
      isDataFillModalOpen={isDataFillModalOpen}
      setIsDataFillModalOpen={setIsDataFillModalOpen}
    />
  ) : null;
};

export default PriceLabelArtEditorModal;
