// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { YesNoPowerToggle } from './YesNoPowerToggle';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('YesNoPowerToggle', () => {
  afterEach(() => {
    cleanup();
  });

  const mockField: TechnicalFieldDefinition = {
    id: 'f-1',
    name: 'Possui espelho',
    options: [{ id: '1', value: 'Não' }, { id: '2', value: 'Sim' }],
  };

  it('renderiza no estado Desligado quando o valor for "Não" ou vazio', () => {
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Não"
        onChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Desligado')).toBeDefined();
    expect(screen.getByText('Não')).toBeDefined();
    expect(toggle.querySelector('.bi-power')).toBeDefined();
  });

  it('renderiza no estado Ligado quando o valor for "Sim" ou true', () => {
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Sim"
        onChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Ligado')).toBeDefined();
    expect(screen.getByText('Sim')).toBeDefined();
  });

  it('alterna de Desligado para Ligado emitindo "Sim" ao clicar', () => {
    const onChange = vi.fn();
    render(
      <YesNoPowerToggle
        field={mockField}
        value=""
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith('Sim');
  });

  it('alterna de Ligado para Desligado emitindo "Não" ao clicar', () => {
    const onChange = vi.fn();
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Sim"
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith('Não');
  });

  it('não dispara onChange quando desativado (disabled)', () => {
    const onChange = vi.fn();
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Sim"
        disabled={true}
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onChange).not.toHaveBeenCalled();
    expect(toggle.hasAttribute('disabled')).toBe(true);
  });
});
