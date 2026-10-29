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

  it('renderiza as opções radio e seleciona Não quando o valor for negativo', () => {
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Não"
        onChange={vi.fn()}
      />
    );

    const naoOption = screen.getByRole('radio', { name: 'Não' }) as HTMLInputElement;
    expect(naoOption.checked).toBe(true);
    expect(screen.getByText('Não')).toBeDefined();
    expect((screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement).checked).toBe(false);
  });

  it('seleciona Sim quando o valor for afirmativo', () => {
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Sim"
        onChange={vi.fn()}
      />
    );

    expect((screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'Não' }) as HTMLInputElement).checked).toBe(false);
  });

  it('emite "Sim" ao selecionar o rádio afirmativo', () => {
    const onChange = vi.fn();
    render(
      <YesNoPowerToggle
        field={mockField}
        value=""
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Sim' }));

    expect(onChange).toHaveBeenCalledWith('Sim');
  });

  it('emite "Não" ao selecionar o rádio negativo', () => {
    const onChange = vi.fn();
    render(
      <YesNoPowerToggle
        field={mockField}
        value="Sim"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Não' }));

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

    const simOption = screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement;
    fireEvent.click(simOption);

    expect(onChange).not.toHaveBeenCalled();
    expect(simOption.hasAttribute('disabled')).toBe(true);
  });
});
