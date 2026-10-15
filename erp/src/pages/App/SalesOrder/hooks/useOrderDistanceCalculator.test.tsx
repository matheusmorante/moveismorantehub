// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Shipping from '@/pages/types/Shipping.type';
import type CustomerData from '@/pages/types/customerData.type';
const mocks = vi.hoisted(() => ({ route: vi.fn(), freight: vi.fn(), warn: vi.fn(), success: vi.fn() }));
vi.mock('@/pages/utils/maps', () => ({ autoCalculateRouteDistance: mocks.route }));
vi.mock('@/pages/utils/shippingPricing', () => ({ calculateFreightByDistance: mocks.freight }));
vi.mock('react-toastify', () => ({ toast: { warn: mocks.warn, success: mocks.success } }));
import { useOrderDistanceCalculator } from './useOrderDistanceCalculator';
const route = (distanceKm = 10) => ({ distanceKm, durationMinutes: 15, destinationCoords: [-49.1, -25.1], routeGeoJSON: { type: 'LineString', coordinates: [[-49, -25], [-49.1, -25.1]] } });
const renderOwner = () => renderHook(({ address }: { address: Record<string, unknown> }) => {
  const [shipping, setShipping] = React.useState({ useCustomerAddress: true, value: 7 } as Shipping);
  return { shipping, ...useOrderDistanceCalculator(shipping, { fullAddress: address } as CustomerData, setShipping) };
}, { initialProps: { address: {} } });
beforeEach(() => { vi.clearAllMocks(); mocks.route.mockResolvedValue(route()); mocks.freight.mockImplementation((distance) => distance * 10); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('consulta de distância pelo formulário do pedido', () => {
  it('valida endereço sem consumir o serviço quando vazio ou com coordenadas inválidas', async () => {
    const { result } = renderOwner();
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: ' ', city: ' ' }); });
    await act(async () => { await result.current.handleAutoCalculateDistance({ coords: [-181, -25] }); });
    expect(mocks.route).not.toHaveBeenCalled(); expect(mocks.warn).toHaveBeenCalled(); expect(result.current.shipping.value).toBe(7);
  });
  it('envia o endereço parseado e aplica apenas dados de rota e frete válidos', async () => {
    const { result } = renderOwner(); await act(async () => { await result.current.handleAutoCalculateDistance({ street: ' Rua A ', city: ' Colombo ', number: ' 10 ', extra: 'fora do contrato' }); });
    expect(mocks.route).toHaveBeenCalledWith({ street: 'Rua A', city: 'Colombo', number: '10' }, expect.any(Function));
    expect(result.current.shipping).toMatchObject({ value: 100, distance: 10, durationMinutes: 15, destinationCoords: [-49.1, -25.1] });
  });
  it('aceita localização por coordenadas e não reutiliza cache de outro destino', async () => {
    const { result } = renderOwner();
    await act(async () => { await result.current.handleAutoCalculateDistance({ coords: [-49, -25] }); });
    await act(async () => { await result.current.handleAutoCalculateDistance({ coords: [-49.2, -25.2] }); });
    expect(mocks.route).toHaveBeenCalledTimes(2); expect(mocks.route).toHaveBeenLastCalledWith({ coords: [-49.2, -25.2] }, expect.any(Function));
  });
  it('compartilha uma consulta idêntica enquanto pendente e não repete o destino já aplicado', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderOwner(); let first!: Promise<void>; let second!: Promise<void>;
    await act(async () => { first = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); second = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); });
    expect(mocks.route).toHaveBeenCalledTimes(1);
    await act(async () => { finish(route()); await Promise.all([first, second]); }); expect(result.current.shipping.value).toBe(100);
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: 'Rua A' }); }); expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it('não deixa resposta antiga substituir a distância do endereço mais recente', async () => {
    let finishOld!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; })).mockResolvedValueOnce(route(20));
    const { result } = renderOwner(); let old!: Promise<void>;
    await act(async () => { old = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); });
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: 'Rua B' }); });
    await act(async () => { finishOld(route(10)); await old; }); expect(result.current.shipping.value).toBe(200); expect(result.current.shipping.distance).toBe(20);
  });
  it('invalida a consulta anterior quando o novo endereço é inválido', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderOwner(); let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); });
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: '' }); });
    await act(async () => { finish(route()); await pending; }); expect(result.current.shipping.value).toBe(7); expect(result.current.isCalculatingDistance).toBe(false);
  });
  it('não aplica resposta se o formulário trocou de endereço sem iniciar outra consulta', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderOwner(); let pending!: Promise<void>;
    rerender({ address: { street: 'Rua A' } });
    await act(async () => { pending = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); });
    rerender({ address: { street: '' } });
    await act(async () => { finish(route()); await pending; }); expect(result.current.shipping.value).toBe(7); expect(result.current.isCalculatingDistance).toBe(false);
  });
  it('preserva a consulta do endereço novo iniciada antes do render do formulário', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderOwner(); let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleAutoCalculateDistance({ street: 'Rua Nova' }); });
    rerender({ address: { street: 'Rua Nova' } });
    await act(async () => { finish(route()); await pending; }); expect(result.current.shipping.value).toBe(100);
  });
  it('limita a espera sem reenviar nem aplicar sucesso por resposta tardia', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderOwner(); let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleAutoCalculateDistance({ street: 'Rua A' }); await vi.advanceTimersByTimeAsync(15_001); });
    expect(result.current.isCalculatingDistance).toBe(false); expect(mocks.warn).toHaveBeenCalled();
    await act(async () => { finish(route()); await pending; }); expect(result.current.shipping.value).toBe(7); expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it.each([-1, Infinity, NaN])('impede distância inválida %s antes de calcular o preço', async (distance) => {
    mocks.route.mockResolvedValueOnce(route(distance)); const { result } = renderOwner();
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: 'Rua A' }); });
    expect(mocks.freight).not.toHaveBeenCalled(); expect(mocks.warn).toHaveBeenCalled(); expect(result.current.shipping.value).toBe(7);
  });
  it('preserva o frete quando a configuração gera valor inválido e permite corrigir e repetir', async () => {
    mocks.freight.mockReturnValueOnce(Infinity); const { result } = renderOwner();
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: 'Rua A' }); }); expect(result.current.shipping.value).toBe(7);
    await act(async () => { await result.current.handleAutoCalculateDistance({ street: 'Rua A' }, { silentSuccess: true }); }); expect(result.current.shipping.value).toBe(100); expect(mocks.success).not.toHaveBeenCalled();
  });
});
