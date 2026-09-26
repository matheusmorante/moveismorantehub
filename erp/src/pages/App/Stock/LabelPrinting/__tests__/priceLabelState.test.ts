// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceLabelState } from '../hooks/usePriceLabelState';

describe('usePriceLabelState - Undo / Redo e Gerenciamento de Histórico', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockProduct = { name: 'PRODUTO TESTE', price: '199,00' };
  const mockConfig = { layoutId: 'layout_test', text: 'PRODUTO TESTE', price: '199,00' };

  it('inicializa com pilhas vazias e canUndo/canRedo falsos ao abrir', () => {
    const { result } = renderHook(() =>
      usePriceLabelState(mockProduct, mockConfig, true)
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.title).toBe('PRODUTO TESTE');
  });

  it('registra snapshot após alteração de estado com debounce de 300ms', () => {
    const { result } = renderHook(() =>
      usePriceLabelState(mockProduct, mockConfig, true)
    );

    act(() => {
      result.current.setTitlePos({ x: 50, y: 100 });
    });

    // Antes dos 300ms ainda não empilhou novo undo
    expect(result.current.canUndo).toBe(false);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('handleUndo restaura posições, escala e rotação do snapshot anterior', () => {
    const { result } = renderHook(() =>
      usePriceLabelState(mockProduct, mockConfig, true)
    );

    // Estado inicial com posição customizada
    act(() => {
      result.current.setTitlePos({ x: 10, y: 20 });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    const initialPos = { ...result.current.titlePos };
    expect(initialPos).toEqual({ x: 10, y: 20 });

    // Modifica posição, rotação e escala
    act(() => {
      result.current.setTitlePos({ x: 120, y: 80 });
      result.current.setTitleRotation(45);
      result.current.setScaleTens(300);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.titlePos).toEqual({ x: 120, y: 80 });
    expect(result.current.titleRotation).toBe(45);
    expect(result.current.scaleTens).toBe(300);
    expect(result.current.canUndo).toBe(true);

    // Executa Undo
    act(() => {
      result.current.handleUndo();
    });

    // Posição, rotação e escala devem ter voltado ao estado original
    expect(result.current.titlePos).toEqual(initialPos);
    expect(result.current.titleRotation).toBe(0);
    expect(result.current.scaleTens).toBe(240); // default
    expect(result.current.canRedo).toBe(true);
  });

  it('handleRedo reaplica a alteração desfeita com fidelidade', () => {
    const { result } = renderHook(() =>
      usePriceLabelState(mockProduct, mockConfig, true)
    );

    act(() => {
      result.current.setNormalPrice('799,00');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Desfaz
    act(() => {
      result.current.handleUndo();
    });
    expect(result.current.normalPrice).toBe('199,00');

    // Refaz
    act(() => {
      result.current.handleRedo();
    });
    expect(result.current.normalPrice).toBe('799,00');
    expect(result.current.canRedo).toBe(false);
  });

  it('Ctrl+Z e Ctrl+Y não interferem quando o usuário está digitando em input ou textarea', () => {
    const { result } = renderHook(() =>
      usePriceLabelState(mockProduct, mockConfig, true)
    );

    act(() => {
      result.current.setTitlePos({ x: 10, y: 20 });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      result.current.setTitlePos({ x: 200, y: 200 });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.titlePos).toEqual({ x: 200, y: 200 });

    // 1. Simula Ctrl+Z dentro de um <input>
    const inputElement = document.createElement('input');
    document.body.appendChild(inputElement);

    const inputEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(inputEvent, 'target', { value: inputElement });

    act(() => {
      window.dispatchEvent(inputEvent);
    });

    // Posição NÃO pode ter sido desfeita pelo hook
    expect(result.current.titlePos).toEqual({ x: 200, y: 200 });

    // 2. Simula Ctrl+Z dentro de um <textarea>
    const textareaElement = document.createElement('textarea');
    document.body.appendChild(textareaElement);

    const textareaEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(textareaEvent, 'target', { value: textareaElement });

    act(() => {
      window.dispatchEvent(textareaEvent);
    });

    // Posição continua intacta
    expect(result.current.titlePos).toEqual({ x: 200, y: 200 });

    // 3. Simula Ctrl+Z fora de campos de texto (ex: no body/canvas)
    const bodyEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(bodyEvent, 'target', { value: document.body });

    act(() => {
      window.dispatchEvent(bodyEvent);
    });

    // Agora sim o Undo deve ter sido acionado!
    expect(result.current.titlePos).toEqual({ x: 10, y: 20 });
  });
});
