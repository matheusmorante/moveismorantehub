// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBodyScrollLock, lockBodyScroll, unlockBodyScroll } from '../useBodyScrollLock';

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  it('trava o scroll do body e html ao montar com isLocked=true', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('não trava o scroll quando isLocked=false', () => {
    renderHook(() => useBodyScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('suporta múltiplos modais aninhados mantendo o scroll travado até todos fecharem', () => {
    const modal1 = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');

    const modal2 = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');

    // Fecha o modal interno
    modal2.unmount();
    // O modal 1 ainda está aberto, logo o scroll DEVE continuar travado
    expect(document.body.style.overflow).toBe('hidden');

    // Fecha o modal externo
    modal1.unmount();
    // Agora que todos fecharam, o scroll deve ser liberado
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
