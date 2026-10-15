// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ route: vi.fn(), price: vi.fn(), search: vi.fn(), details: vi.fn(), settings: { storeOriginCoords: [-49, -25] } }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => mocks.settings }));
vi.mock('@/pages/utils/maps', () => ({ autoCalculateRouteDistance: mocks.route, searchAddressSuggestions: mocks.search, fetchPlaceDetails: mocks.details,
  normalizeUf: (value = 'PR') => value.trim().toUpperCase() === 'PARANÁ' ? 'PR' : value.trim().toUpperCase(),
}));
vi.mock('@/pages/utils/shippingPricing', () => ({ calculateFreightByDistance: mocks.price }));
vi.mock('@/pages/utils/formatters', () => ({ formatCurrency: (value: number) => 'R$ ' + value.toFixed(2) }));
import OrderRouteMap from './OrderRouteMap';
const response = (distance = 10) => ({ distanceKm: distance, durationMinutes: 15, destinationCoords: [-49.1, -25.1], routeGeoJSON: { type: 'LineString', coordinates: [[-49, -25], [-49.1, -25.1]] } });
const street = (value = ' Rua A ') => fireEvent.change(screen.getByLabelText('Rua'), { target: { value } });
const calculate = () => fireEvent.click(screen.getByRole('button', { name: /Calcular Valor/ }));
beforeEach(() => { vi.clearAllMocks(); mocks.route.mockResolvedValue(response()); mocks.price.mockImplementation((distance) => distance * 10); mocks.search.mockResolvedValue([]); mocks.details.mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('formulário de cálculo de frete independente', () => {
  it('bloqueia logradouro só com espaços pelo resolver antes do serviço', async () => {
    render(<OrderRouteMap />); street('   '); calculate(); await screen.findByRole('alert'); expect(mocks.route).not.toHaveBeenCalled();
  });
  it('usa endereço parseado e mantém o resultado de preço validado como snapshot', async () => {
    render(<OrderRouteMap />); street(); calculate(); await screen.findByText('10 km');
    expect(mocks.route).toHaveBeenCalledWith(expect.objectContaining({ street: 'Rua A', city: 'Colombo', state: 'PR' }));
    expect(screen.getByText('R$ 100.00')).toBeTruthy(); expect(screen.getByLabelText('Rua')).toHaveProperty('value', ' Rua A '); expect(mocks.price).toHaveBeenCalledTimes(1);
  });
  it('não repete cálculo pendente da mesma entrada, mas permite calcular outra', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(response(20));
    render(<OrderRouteMap />); street('Rua A'); act(() => { calculate(); calculate(); }); await waitFor(() => expect(mocks.route).toHaveBeenCalledTimes(1));
    street('Rua B'); calculate(); await screen.findByText('20 km');
    await act(async () => { finish(response(10)); }); expect(screen.getByText('20 km')).toBeTruthy(); expect(mocks.route).toHaveBeenCalledTimes(2);
  });
  it('descarta resposta anterior ao editar a entrada sem pedir outro cálculo', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<OrderRouteMap />); street('Rua A'); calculate(); await waitFor(() => expect(mocks.route).toHaveBeenCalledTimes(1)); street('Rua B');
    await act(async () => { finish(response(10)); }); expect(screen.queryByText('10 km')).toBeNull(); expect(screen.getByRole('button', { name: /Calcular Valor/ })).toHaveProperty('disabled', false);
  });
  it.each([-1, Infinity, NaN])('recusa distância inválida %s sem precificar ou exibir resultado', async (distance) => {
    mocks.route.mockResolvedValueOnce(response(distance)); render(<OrderRouteMap />); street(); calculate(); await screen.findByRole('alert');
    expect(mocks.price).not.toHaveBeenCalled(); expect(screen.queryByText('R$ 100.00')).toBeNull();
  });
  it('não apresenta preço inválido e permite corrigir e tentar novamente', async () => {
    mocks.price.mockReturnValueOnce(Infinity); render(<OrderRouteMap />); street(); calculate(); await screen.findByRole('alert'); expect(screen.queryByText(/R\$ Infinity/)).toBeNull();
    calculate(); await screen.findByText('R$ 100.00'); expect(mocks.route).toHaveBeenCalledTimes(2);
  });
  it('encerra a espera sem preço tardio nem reenvio automático', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<OrderRouteMap />); street(); await act(async () => { calculate(); await vi.advanceTimersByTimeAsync(15_001); }); expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { finish(response()); }); expect(screen.queryByText('10 km')).toBeNull(); expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it('reutiliza a consulta compartilhada na busca rápida e preserva coordenadas da seleção', async () => {
    vi.useFakeTimers(); mocks.search.mockResolvedValueOnce([{ display_name: 'Rua A, Colombo', place_id: 'a', address: { road: 'Rua A', city: 'Colombo', state: 'PR' } }]);
    mocks.details.mockResolvedValueOnce({ street: 'Rua A', city: 'Colombo', state: 'PR', number: '20', coords: [-49.1, -25.1], placeId: 'a' });
    render(<OrderRouteMap />); fireEvent.change(screen.getByPlaceholderText('Ex: R. Cascavel, Colombo...'), { target: { value: ' Rua A ' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(601); }); expect(mocks.search).toHaveBeenCalledWith('Rua A', 'Colombo', 'PR');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Rua A/ })); });
    await act(async () => { calculate(); }); expect(mocks.route).toHaveBeenCalledWith(expect.objectContaining({ street: 'Rua A', number: '20', coords: [-49.1, -25.1], placeId: 'a' }));
  });
  it('não calcula usando a localização anterior depois de editar o número manualmente', async () => {
    vi.useFakeTimers(); mocks.search.mockResolvedValueOnce([{ display_name: 'Rua A', place_id: 'a', address: { road: 'Rua A', city: 'Colombo', state: 'PR' } }]);
    mocks.details.mockResolvedValueOnce({ street: 'Rua A', number: '20', city: 'Colombo', state: 'PR', coords: [-49.1, -25.1], placeId: 'a' });
    render(<OrderRouteMap />); fireEvent.change(screen.getByPlaceholderText('Ex: R. Cascavel, Colombo...'), { target: { value: 'Rua A' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(601); }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Rua A/ })); });
    fireEvent.change(screen.getByLabelText('Nº'), { target: { value: '99' } }); await act(async () => { calculate(); });
    expect(mocks.route).toHaveBeenCalledWith(expect.objectContaining({ street: 'Rua A', number: '99', placeId: '', mapsUrl: '' }));
    expect(mocks.route.mock.calls[0][0].coords).toBeUndefined();
  });
  it('interrompe o complemento da busca rápida ao editar o logradouro no formulário', async () => {
    vi.useFakeTimers(); mocks.search.mockResolvedValueOnce([{ display_name: 'Rua A', place_id: 'a', address: { road: 'Rua A', city: 'Colombo', state: 'PR' } }]);
    let finish!: (value: unknown) => void; mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<OrderRouteMap />); fireEvent.change(screen.getByPlaceholderText('Ex: R. Cascavel, Colombo...'), { target: { value: 'Rua A' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(601); }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Rua A/ })); });
    expect(screen.getByText('Completando endereço...')).toBeTruthy(); street('Rua B'); expect(screen.queryByText('Completando endereço...')).toBeNull();
    await act(async () => { finish({ street: 'Rua A', number: '20', city: 'Colombo', state: 'PR' }); }); expect(screen.getByLabelText('Rua')).toHaveProperty('value', 'Rua B');
  });
});
