// @vitest-environment happy-dom
import React, { createRef } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerSupportResizeHandle } from '../components/CustomerSupportResizeHandle';

afterEach(cleanup);

const renderHandle = (overrides: Partial<React.ComponentProps<typeof CustomerSupportResizeHandle>> = {}) => {
  const panel = document.createElement('div');
  panel.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, right: 340, top: 0, bottom: 700, width: 340, height: 700,
    toJSON: () => ({}),
  });
  const props = {
    panelId: 'panel',
    panelRef: { current: panel },
    label: 'Lista de conversas',
    isOpen: true,
    width: 340,
    minWidth: 260,
    maxWidth: 600,
    defaultWidth: 340,
    onResize: vi.fn(),
    onToggle: vi.fn(),
    onDragChange: vi.fn(),
    ...overrides,
  };
  const view = render(<CustomerSupportResizeHandle {...props} />);
  return { ...view, props };
};

describe('divisória redimensionável da Central', () => {
  it('expõe controles de teclado, limites, recolhimento e abertura', () => {
    const { getByRole, props, rerender } = renderHandle();
    const separator = getByRole('separator', { name: 'Redimensionar painel: Lista de conversas' });

    expect(separator.getAttribute('aria-valuenow')).toBe('340');
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(props.onResize).toHaveBeenLastCalledWith(356);
    fireEvent.keyDown(separator, { key: 'End' });
    expect(props.onResize).toHaveBeenLastCalledWith(600);
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(props.onResize).toHaveBeenLastCalledWith(260);

    rerender(<CustomerSupportResizeHandle {...props} width={260} />);
    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(props.onToggle).toHaveBeenLastCalledWith(false);

    rerender(<CustomerSupportResizeHandle {...props} isOpen={false} />);
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(props.onToggle).toHaveBeenLastCalledWith(true);
    expect(props.onResize).toHaveBeenLastCalledWith(260);
  });

  it('arrasta até os limites, recolhe além do limiar e termina a interação', () => {
    const onResize = vi.fn();
    const onToggle = vi.fn();
    const onDragChange = vi.fn();
    const { getByRole } = renderHandle({ onResize, onToggle, onDragChange });
    const separator = getByRole('separator', { name: 'Redimensionar painel: Lista de conversas' });

    fireEvent.pointerDown(separator, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 1000 });
    expect(onResize).toHaveBeenLastCalledWith(600);
    fireEvent.pointerMove(window, { clientX: -100 });
    expect(onToggle).toHaveBeenLastCalledWith(false);
    fireEvent.pointerUp(window, { clientX: -100 });
    expect(onDragChange).toHaveBeenNthCalledWith(1, true);
    expect(onDragChange).toHaveBeenLastCalledWith(false);
  });

  it('restaura a largura padrão ao receber duplo clique', () => {
    const { getByRole, props } = renderHandle({ isOpen: false });
    fireEvent.doubleClick(getByRole('separator', { name: 'Redimensionar painel: Lista de conversas' }));
    expect(props.onToggle).toHaveBeenCalledWith(true);
    expect(props.onResize).toHaveBeenCalledWith(340);
  });

  it('aceita um ref de painel React sem exigir montagem do layout completo', () => {
    const panelRef = createRef<HTMLDivElement>();
    expect(() => renderHandle({ panelRef })).not.toThrow();
  });
});
