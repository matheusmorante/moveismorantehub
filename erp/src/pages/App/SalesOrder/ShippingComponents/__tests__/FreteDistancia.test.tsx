// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FreteDistancia from '../FreteDistancia';

afterEach(() => {
  cleanup();
});

describe('FreteDistancia Component', () => {
  const defaultProps = {
    value: 50,
    distance: 12.3,
    routeUrl: 'https://maps.google.com',
    onChangeValue: vi.fn(),
    onChangeDistance: vi.fn(),
    onAutoCalculateDistance: vi.fn(),
    isCalculatingDistance: false,
    errors: {},
  };

  it('deve renderizar valor do frete e distância com 1 casa decimal e badge KM', () => {
    render(<FreteDistancia {...defaultProps} />);

    const distanceInput = screen.getByTestId('shipping-distance-input') as HTMLInputElement;
    expect(distanceInput.value).toBe('12,3');
    expect(screen.getByText('km')).toBeDefined();
  });

  it('deve digitar no campo de distância no modo RTL empurrando para a esquerda com 1 casa decimal', async () => {
    const onChangeDistance = vi.fn();
    render(<FreteDistancia {...defaultProps} distance={undefined} onChangeDistance={onChangeDistance} />);

    const distanceInput = screen.getByTestId('shipping-distance-input');

    await userEvent.type(distanceInput, '1');
    expect(onChangeDistance).toHaveBeenLastCalledWith('0,1');

    await userEvent.type(distanceInput, '2');
    expect(onChangeDistance).toHaveBeenLastCalledWith('1,2');

    await userEvent.type(distanceInput, '5');
    expect(onChangeDistance).toHaveBeenLastCalledWith('12,5');
  });

  it('deve aceitar colagem (paste) de valor inteiro e formatar com 1 casa decimal', () => {
    const onChangeDistance = vi.fn();
    render(<FreteDistancia {...defaultProps} distance={undefined} onChangeDistance={onChangeDistance} />);

    const distanceInput = screen.getByTestId('shipping-distance-input');

    fireEvent.paste(distanceInput, { clipboardData: { getData: () => '25' } });
    expect(onChangeDistance).toHaveBeenLastCalledWith('25,0');

    fireEvent.paste(distanceInput, { clipboardData: { getData: () => '15,4 km' } });
    expect(onChangeDistance).toHaveBeenLastCalledWith('15,4');
  });

  it('deve exibir mensagem de erro quando shipping_distance for inválido', () => {
    render(
      <FreteDistancia
        {...defaultProps}
        errors={{ shipping_distance: 'Distância é obrigatória' }}
      />
    );

    expect(screen.getByText('Distância é obrigatória')).toBeDefined();
  });

  it('deve desabilitar campo durante o cálculo automático', () => {
    render(<FreteDistancia {...defaultProps} isCalculatingDistance={true} />);

    const distanceInput = screen.getByTestId('shipping-distance-input') as HTMLInputElement;
    expect(distanceInput.disabled).toBe(true);
    expect(distanceInput.placeholder).toBe('Calculando...');
  });
});
