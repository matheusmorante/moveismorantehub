import React from 'react';

let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

/**
 * Bloqueia o scroll do documento (body e html) com contagem de referências.
 * Permite que múltiplos modais abertos simultaneamente ou aninhados não conflitem
 * e que o scroll de fundo permaneça travado até o último modal ser fechado.
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  lockCount += 1;
}

/**
 * Libera o scroll do documento caso não haja mais modais abertos.
 */
export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
  }
}

/**
 * Hook do React para desativar o scroll do conteúdo de fundo enquanto o componente/modal estiver ativo.
 *
 * @param isLocked Indica se o scroll deve ser travado (default: true).
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  React.useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
