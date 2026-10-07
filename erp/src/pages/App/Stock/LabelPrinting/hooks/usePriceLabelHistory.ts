import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePriceLabelHistoryParams<TSnapshot> {
  isOpen: boolean;
  getSnapshot: () => TSnapshot;
  applySnapshot: (snapshot: TSnapshot) => void;
  isApplyingHistoryRef: { current: boolean };
}

export function usePriceLabelHistory<TSnapshot>({
  isOpen,
  getSnapshot,
  applySnapshot,
  isApplyingHistoryRef,
}: UsePriceLabelHistoryParams<TSnapshot>) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<TSnapshot[]>([]);
  const redoStackRef = useRef<TSnapshot[]>([]);

  // Registra o snapshot inicial e acompanha mudanças do editor para a pilha de Desfazer/Refazer
  useEffect(() => {
    if (!isOpen) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    // Ao abrir, inicializa a pilha com a arte atual
    if (undoStackRef.current.length === 0) {
      const initialSnap = getSnapshot();
      undoStackRef.current = [initialSnap];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    }

    if (isApplyingHistoryRef.current) return;

    const timer = setTimeout(() => {
      if (isApplyingHistoryRef.current) return;
      const currentSnap = getSnapshot();
      const stack = undoStackRef.current;
      if (stack.length > 0) {
        const lastSnap = stack[stack.length - 1];
        if (JSON.stringify(lastSnap) === JSON.stringify(currentSnap)) return;
      }
      undoStackRef.current = [...stack.slice(-50), currentSnap];
      redoStackRef.current = [];
      setCanUndo(undoStackRef.current.length > 1);
      setCanRedo(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, getSnapshot]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length <= 1) return;

    isApplyingHistoryRef.current = true;
    const current = stack.pop()!;
    redoStackRef.current.push(current);

    const previous = stack[stack.length - 1]!;
    applySnapshot(previous);

    setCanUndo(stack.length > 1);
    setCanRedo(true);

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 120);
  }, []);

  const handleRedo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;

    isApplyingHistoryRef.current = true;
    const next = redoStack.pop()!;
    undoStackRef.current.push(next);

    applySnapshot(next);

    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(redoStack.length > 0);

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 120);
  }, []);

  // Atalhos globais de teclado para Ctrl+Z e Ctrl+Y (ou Cmd+Z / Cmd+Y no Mac)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          if (e.shiftKey) {
            // Ctrl + Shift + Z -> Refazer
            e.preventDefault();
            handleRedo();
          } else {
            // Ctrl + Z -> Desfazer (se não estiver num campo de texto simples)
            if (!isInput) {
              e.preventDefault();
              handleUndo();
            }
          }
        } else if (key === 'y') {
          // Ctrl + Y -> Refazer
          if (!isInput) {
            e.preventDefault();
            handleRedo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  return { canUndo, canRedo, handleUndo, handleRedo };
}

