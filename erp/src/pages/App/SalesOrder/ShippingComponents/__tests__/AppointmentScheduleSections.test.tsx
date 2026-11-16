// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Agendamento from '../Agendamento';

afterEach(cleanup);

describe('tópicos de programação do agendamento', () => {
  it('recolhe programação incluindo as alternativas', () => {
    render(<Agendamento title="Programação" groupPrimarySections scheduling={{ date: '', time: '', type: 'fixed' }} onChangeScheduling={vi.fn()} errors={{}} />);
    const primary = screen.getByRole('button', { name: 'Programação' });
    expect(primary.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Data programada')).toBeTruthy();
    expect(screen.getByText('Horário programado')).toBeTruthy();
    fireEvent.click(primary);
    expect(primary.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Data programada')).toBeNull();
    expect(screen.queryByText('Horário programado')).toBeNull();
    expect(screen.queryByText('Alternativas')).toBeNull();
    fireEvent.click(primary);
    expect(screen.getByText('Data programada')).toBeTruthy();
    expect(screen.getByText('Horário programado')).toBeTruthy();
    expect(screen.getByText('Alternativas')).toBeTruthy();
  });
});
