// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TemporaryProductWarning from './TemporaryProductWarning';

afterEach(cleanup);

describe('TemporaryProductWarning', () => {
  it('explica estoque e conciliação ao passar o mouse sem bloquear o formulário', () => {
    render(<><TemporaryProductWarning /><input aria-label="Outro campo" /></>);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Aviso: produto sem cadastro' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('não gerará movimentação de estoque');
    expect(tooltip.textContent).toContain('Antes de atender a venda');
    expect(tooltip.textContent).toContain('Se a venda já estiver atendida');
    expect(tooltip.textContent).toContain('não gera movimentação retroativa');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('textbox'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('abre por foco ou toque e fecha com Escape', () => {
    render(<TemporaryProductWarning />);
    const button = screen.getByRole('button');
    fireEvent.focus(button);
    expect(button.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });
});
