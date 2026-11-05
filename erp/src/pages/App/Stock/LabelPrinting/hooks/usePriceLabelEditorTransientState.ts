import { useRef, useState } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

export function usePriceLabelEditorTransientState() {
  const [selectedElement, setSelectedElement] = useState<PriceLabelLayerKey>(null);
  const [selectedElements, setSelectedElements] = useState<Set<PriceLabelLayerKey>>(new Set());
  const [isArtConfigLoading, setIsArtConfigLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const lastQueuedSnapshotRef = useRef('');
  const latestRequestedSnapshotRef = useRef('');
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isCenterMenuOpen, setIsCenterMenuOpen] = useState(false);
  const [isOppSelectModalOpen, setIsOppSelectModalOpen] = useState(false);
  const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);
  const [showColorPickerDropdown, setShowColorPickerDropdown] = useState(false);
  const pendingGradientColorRef = useRef<string | null>(null);

  return {
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
  };
}
