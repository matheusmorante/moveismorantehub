import { useRef, type Dispatch, type SetStateAction } from 'react';
import {
  copyImageLayout,
  type ImageFormat,
  type ImageLayout,
  type ImageTemplateDesign,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { findTemplateSelection } from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import type { LayerSelectionMode } from '../TemplateGroupSettings';

export const FIRST_TEMPLATE_FORMAT = '1:1' as const;

export const TEMPLATE_FORMAT_LABELS: Record<ImageFormat, string> = {
  '1:1': 'Quadrado',
  '4:5': 'Feed',
  '9:16': 'Stories e Reels',
};

/**
 * Manages the bounded undo/redo design stack, format switching, and form design synchronization
 * for `ImageTemplateEditor`.
 */
export function useImageTemplateHistory({
  getDesign,
  setDesign,
  design,
  format,
  activeId,
  testArtifact,
  setFormat,
  setActiveId,
  setSelectionMode,
  clearFeedback,
}: {
  getDesign: () => ImageTemplateDesign;
  setDesign: (next: ImageTemplateDesign) => void;
  design: ImageTemplateDesign;
  format: ImageFormat;
  activeId: string;
  testArtifact?: ImageTemplateDesign['testArtifact'] | null;
  setFormat: Dispatch<SetStateAction<ImageFormat>>;
  setActiveId: Dispatch<SetStateAction<string>>;
  setSelectionMode: Dispatch<SetStateAction<LayerSelectionMode | null>>;
  clearFeedback: () => void;
}) {
  const past = useRef<ImageTemplateDesign[]>([]);
  const future = useRef<ImageTemplateDesign[]>([]);
  const currentFormat: ImageFormat = design.formats[format] ? format : FIRST_TEMPLATE_FORMAT;

  function applyDesign(next: ImageTemplateDesign) {
    setDesign(testArtifact ? { ...next, testArtifact } : next);
    clearFeedback();
  }

  function commit(next: ImageTemplateDesign) {
    past.current = [...past.current.slice(-49), getDesign()];
    future.current = [];
    applyDesign(next);
  }

  function changeLayout(next: ImageLayout, amendHistory = false) {
    const latest = getDesign();
    const updated = { ...latest, formats: { ...latest.formats, [currentFormat]: next } };
    if (amendHistory) applyDesign(updated);
    else commit(updated);
  }

  function changeFormatLayout(target: ImageFormat, value: ImageLayout | undefined) {
    const latest = getDesign();
    commit({ ...latest, formats: { ...latest.formats, [target]: value } });
  }

  function chooseFormat(next: ImageFormat) {
    const layout = design.formats[currentFormat]!;
    const nextLayout = design.formats[next] ?? copyImageLayout(layout, currentFormat, next);
    if (!design.formats[next]) changeFormatLayout(next, nextLayout);
    setFormat(next);
    setSelectionMode(null);
    if (activeId && !findTemplateSelection(nextLayout, activeId)) {
      setActiveId(nextLayout.layers[0]?.id ?? '');
    }
  }

  function removeCurrentFormat() {
    changeFormatLayout(currentFormat, undefined);
    setFormat(FIRST_TEMPLATE_FORMAT);
    setSelectionMode(null);
    const fallbackLayout = design.formats[FIRST_TEMPLATE_FORMAT];
    if (activeId && !findTemplateSelection(fallbackLayout, activeId)) {
      setActiveId(fallbackLayout.layers[0]?.id ?? '');
    }
  }

  function moveHistory(direction: 'undo' | 'redo') {
    const [from, to] = direction === 'undo' ? [past, future] : [future, past];
    const next = from.current.pop();
    if (!next) return;
    to.current.push(getDesign());
    applyDesign(next);
    setSelectionMode(null);
    const nextFormat: ImageFormat = next.formats[format] ? format : FIRST_TEMPLATE_FORMAT;
    if (nextFormat !== format) setFormat(nextFormat);
    const nextLayout = next.formats[nextFormat]!;
    if (activeId && !findTemplateSelection(nextLayout, activeId)) {
      setActiveId(nextLayout.layers[0]?.id ?? '');
    }
  }

  return {
    past,
    future,
    currentFormat,
    applyDesign,
    commit,
    changeLayout,
    changeFormatLayout,
    chooseFormat,
    removeCurrentFormat,
    moveHistory,
  };
}
