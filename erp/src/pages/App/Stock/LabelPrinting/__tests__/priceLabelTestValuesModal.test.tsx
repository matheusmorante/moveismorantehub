// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PriceLabelTestValuesModal, type PriceLabelTestValuesModalProps } from '../modals/PriceLabelTestValuesModal';

const fields = [
  ['testDezenaD1', 'setTestDezenaD1', 'Dezena: 1º dígito'],
  ['testDezenaD2', 'setTestDezenaD2', 'Dezena: 2º dígito'],
  ['testCentenaD1', 'setTestCentenaD1', 'Centena: 1º dígito'],
  ['testCentenaD2', 'setTestCentenaD2', 'Centena: 2º dígito'],
  ['testCentenaD3', 'setTestCentenaD3', 'Centena: 3º dígito'],
  ['testMilharD1', 'setTestMilharD1', 'Milhar: 1º dígito'],
  ['testMilharD2', 'setTestMilharD2', 'Milhar: 2º dígito'],
  ['testMilharD3', 'setTestMilharD3', 'Milhar: 3º dígito'],
  ['testMilharD4', 'setTestMilharD4', 'Milhar: 4º dígito'],
  ['testNormalD1', 'setTestNormalD1', 'Preço anterior: 1º dígito'],
  ['testNormalD2', 'setTestNormalD2', 'Preço anterior: 2º dígito'],
  ['testNormalD3', 'setTestNormalD3', 'Preço anterior: 3º dígito'],
] as const;

function makeProps(overrides: Partial<PriceLabelTestValuesModalProps> = {}) {
  return {
    isOpen: true, onClose: vi.fn(),
    ...Object.fromEntries(fields.flatMap(([field, setter]) => [[field, 1], [setter, vi.fn()]])),
    ...overrides,
  } as PriceLabelTestValuesModalProps;
}

function setup(overrides: Partial<PriceLabelTestValuesModalProps> = {}) {
  const props = makeProps(overrides);
  return { props, ...render(<PriceLabelTestValuesModal {...props} />) };
}

afterEach(cleanup);

describe('prévia de dígitos com RHF e zodResolver reais', () => {
  it('não altera o proprietário ao abrir, receber valores ou dispensar a prévia', () => {
    const s = setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    s.rerender(<PriceLabelTestValuesModal {...s.props} isOpen />);
    expect(screen.getByRole('dialog', { name: 'Simulador / Teste de Numeração' })).toBeTruthy();
    expect(screen.getAllByRole('slider')).toHaveLength(12);
    s.rerender(<PriceLabelTestValuesModal {...s.props} isOpen testDezenaD1={7} />);
    expect((screen.getByRole('slider', { name: fields[0][2] }) as HTMLInputElement).value).toBe('7');
    fireEvent.click(screen.getByLabelText('Fechar teste de numeração'));
    expect(s.props.onClose).toHaveBeenCalledOnce();
    fields.forEach(([, setter]) => expect(s.props[setter]).not.toHaveBeenCalled());
  });

  it.each(fields)('valida e aplica zero no campo %s sem alterar seus irmãos', async (_field, setter, label) => {
    const s = setup();
    fireEvent.change(screen.getByRole('slider', { name: label }), { target: { value: '0' } });
    expect(s.props[setter]).not.toHaveBeenCalled();
    await waitFor(() => expect(s.props[setter]).toHaveBeenCalledWith(0));
    fields.filter(([, other]) => other !== setter).forEach(([, other]) => expect(s.props[other]).not.toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([NaN, -1, 10, 1.5])('impede dígito inválido %s antes do setter e mostra erro', async (digit) => {
    const s = setup();
    const slider = screen.getByRole('slider', { name: fields[0][2] }) as HTMLInputElement;
    // A faixa nativa restringe os eventos normais; a fronteira ainda rejeita um valor malformado.
    Object.defineProperty(slider, 'valueAsNumber', { configurable: true, get: () => digit });
    fireEvent.change(slider, { target: { value: '2' } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''));
    expect(slider.getAttribute('aria-invalid')).toBe('true');
    fields.forEach(([, setter]) => expect(s.props[setter]).not.toHaveBeenCalled());
  });

  it('serializa mudanças rápidas, preserva a última intenção e recebe o valor atual do proprietário', async () => {
    const props = makeProps(), changes = vi.fn();
    function Owner() {
      const [digit, setDigit] = useState(1);
      return <PriceLabelTestValuesModal {...props} testDezenaD1={digit} setTestDezenaD1={(value) => { changes(value); setDigit(value); }} />;
    }
    render(<Owner />);
    const slider = screen.getByRole('slider', { name: fields[0][2] });
    fireEvent.change(slider, { target: { value: '3' } });
    fireEvent.change(slider, { target: { value: '0' } });
    fireEvent.change(slider, { target: { value: '9' } });
    expect(changes).not.toHaveBeenCalled();
    await waitFor(() => expect(changes).toHaveBeenCalledTimes(3));
    expect(changes.mock.calls.map(([value]) => value)).toEqual([3, 0, 9]);
    expect((slider as HTMLInputElement).value).toBe('9');
  });

  it('continua a fila depois de uma entrada inválida e remove o erro só ao aplicar valor válido', async () => {
    const s = setup();
    const slider = screen.getByRole('slider', { name: fields[0][2] }) as HTMLInputElement;
    Object.defineProperty(slider, 'valueAsNumber', { configurable: true, get: () => -1 });
    fireEvent.change(slider, { target: { value: '2' } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    Reflect.deleteProperty(slider, 'valueAsNumber');
    fireEvent.change(slider, { target: { value: '9' } });
    await waitFor(() => expect(s.props.setTestDezenaD1).toHaveBeenCalledWith(9));
    expect(s.props.setTestDezenaD1).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('dispensar a prévia invalida alterações enfileiradas antes de fechar e reabrir', async () => {
    const s = setup();
    const slider = screen.getByRole('slider', { name: fields[0][2] });
    fireEvent.change(slider, { target: { value: '4' } });
    fireEvent.change(slider, { target: { value: '8' } });
    fireEvent.click(screen.getByText('Concluir Teste'));
    expect(s.props.onClose).toHaveBeenCalledOnce();
    s.rerender(<PriceLabelTestValuesModal {...s.props} isOpen={false} />);
    s.rerender(<PriceLabelTestValuesModal {...s.props} />);
    await act(async () => { await Promise.resolve(); });
    expect(s.props.setTestDezenaD1).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('slider', { name: fields[0][2] }), { target: { value: '6' } });
    await waitFor(() => expect(s.props.setTestDezenaD1).toHaveBeenCalledWith(6));
    expect(s.props.setTestDezenaD1).toHaveBeenCalledOnce();
  });

  it('desmontar invalida a fila sem publicar alterações no proprietário', async () => {
    const s = setup();
    fireEvent.change(screen.getByRole('slider', { name: fields[0][2] }), { target: { value: '4' } });
    s.unmount();
    await act(async () => { await Promise.resolve(); });
    fields.forEach(([, setter]) => expect(s.props[setter]).not.toHaveBeenCalled());
  });

  it('Escape dispensa uma única vez e impede efeitos da fila antiga', async () => {
    const s = setup();
    fireEvent.change(screen.getByRole('slider', { name: fields[0][2] }), { target: { value: '4' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await act(async () => { await Promise.resolve(); });
    expect(s.props.onClose).toHaveBeenCalledOnce();
    expect(s.props.setTestDezenaD1).not.toHaveBeenCalled();
  });

  it('mostra erro de aplicação e permite uma alteração posterior pela mesma fila', async () => {
    const apply = vi.fn().mockImplementationOnce(() => { throw new Error('Falha do proprietário'); });
    setup({ setTestDezenaD1: apply });
    const slider = screen.getByRole('slider', { name: fields[0][2] });
    fireEvent.change(slider, { target: { value: '3' } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível aplicar'));
    fireEvent.change(slider, { target: { value: '9' } });
    await waitFor(() => expect(apply).toHaveBeenLastCalledWith(9));
    expect(apply).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
