// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as userEvent from '@testing-library/user-event';
import React from 'react';
import { PercentInput } from './PercentInput';
import { DistanceInput } from './DistanceInput';
import { MeasurementInput } from './MeasurementInput';

afterEach(() => {
  cleanup();
});

describe('MaskedNumericInput Core via Percent & Distance', () => {
  describe('PercentInput (2 casas decimais RTL)', () => {
    it('deve formatar valor inicial de 12.34 como 12,34%', () => {
      render(<PercentInput value={12.34} onChangeValue={vi.fn()} testID="pct-input" />);
      const input = screen.getByTestId('pct-input') as HTMLInputElement;
      expect(input.value.replace(/\s/g, ' ')).toContain('12,34');
    });

    it('deve digitar RTL corretamente: 1 -> 0,01% ate 1234 -> 12,34%', async () => {
      const handleChange = vi.fn();
      render(<PercentInput value={null} onChangeValue={handleChange} testID="pct-input" />);
      const input = screen.getByTestId('pct-input');

      await userEvent.type(input, '1');
      expect(handleChange).toHaveBeenLastCalledWith(0.01);
      await userEvent.type(input, '234');
      expect(handleChange).toHaveBeenLastCalledWith(12.34);
    });

    it('deve lidar com paste (colagem inteira) extraindo semanticamente', () => {
      const handleChange = vi.fn();
      render(<PercentInput value={null} onChangeValue={handleChange} testID="pct-input" />);
      const input = screen.getByTestId('pct-input');

      fireEvent.paste(input, { clipboardData: { getData: () => '10' } });
      expect(handleChange).toHaveBeenLastCalledWith(10.0); // 10,00%

      fireEvent.paste(input, { clipboardData: { getData: () => '10,5' } });
      expect(handleChange).toHaveBeenLastCalledWith(10.5); // 10,50%

      fireEvent.paste(input, { clipboardData: { getData: () => '12.34%' } });
      expect(handleChange).toHaveBeenLastCalledWith(12.34);
    });
  });

  describe('DistanceInput (1 casa decimal RTL)', () => {
    it('deve digitar RTL corretamente (1 casa): 1 -> 0,1 km; 123 -> 12,3 km', async () => {
      const handleChange = vi.fn();
      render(<DistanceInput value={null} onChangeValue={handleChange} testID="km-input" />);
      const input = screen.getByTestId('km-input');

      await userEvent.type(input, '1');
      expect(handleChange).toHaveBeenLastCalledWith(0.1);

      await userEvent.type(input, '23');
      expect(handleChange).toHaveBeenLastCalledWith(12.3);
    });

    it('deve colar (paste) semanticamente, mantendo o inteiro colado', () => {
      const handleChange = vi.fn();
      render(<DistanceInput value={null} onChangeValue={handleChange} testID="km-input" />);
      const input = screen.getByTestId('km-input');

      fireEvent.paste(input, { clipboardData: { getData: () => '123' } });
      expect(handleChange).toHaveBeenLastCalledWith(123.0);

      fireEvent.paste(input, { clipboardData: { getData: () => '12,3 km' } });
      expect(handleChange).toHaveBeenLastCalledWith(12.3);
    });
  });

  describe('MeasurementInput (Dimensões - 2 casas decimais RTL)', () => {
    it('deve formatar valor inicial com 2 casas e badge cm', () => {
      render(<MeasurementInput unit="cm" value={180.5} onChangeValue={vi.fn()} testID="dim-input" />);
      const input = screen.getByTestId('dim-input') as HTMLInputElement;
      expect(input.value).toBe('180,50');
      expect(screen.getByText('cm')).toBeDefined();
    });

    it('deve digitar RTL empurrando dígitos para a esquerda com 2 casas decimais', async () => {
      const handleChange = vi.fn();
      render(<MeasurementInput unit="cm" value={null} onChangeValue={handleChange} testID="dim-input" />);
      const input = screen.getByTestId('dim-input');

      await userEvent.type(input, '1');
      expect(handleChange).toHaveBeenLastCalledWith(0.01);

      await userEvent.type(input, '85');
      expect(handleChange).toHaveBeenLastCalledWith(1.85);

      await userEvent.type(input, '00');
      expect(handleChange).toHaveBeenLastCalledWith(185.0);
    });
  });

  describe('MeasurementInput (Peso - 1 casa decimal RTL)', () => {
    it('deve formatar valor inicial com 1 casa e badge kg', () => {
      render(<MeasurementInput unit="kg" value={45.2} onChangeValue={vi.fn()} testID="weight-input" />);
      const input = screen.getByTestId('weight-input') as HTMLInputElement;
      expect(input.value).toBe('45,2');
      expect(screen.getByText('kg')).toBeDefined();
    });

    it('deve digitar RTL empurrando dígitos para a esquerda com 1 casa decimal', async () => {
      const handleChange = vi.fn();
      render(<MeasurementInput unit="kg" value={null} onChangeValue={handleChange} testID="weight-input" />);
      const input = screen.getByTestId('weight-input');

      await userEvent.type(input, '1');
      expect(handleChange).toHaveBeenLastCalledWith(0.1);

      await userEvent.type(input, '5');
      expect(handleChange).toHaveBeenLastCalledWith(1.5);

      await userEvent.type(input, '0');
      expect(handleChange).toHaveBeenLastCalledWith(15.0);
    });
  });
});
