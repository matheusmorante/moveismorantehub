// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ search: vi.fn(), details: vi.fn(), changed: vi.fn(), selected: vi.fn() }));
vi.mock('@/pages/utils/maps', async () => ({ searchAddressSuggestions: mocks.search, fetchPlaceDetails: mocks.details,
  normalizeUf: (value = 'PR') => value.trim().toUpperCase() === 'PARANÁ' ? 'PR' : value.trim().toUpperCase(),
}));
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { changeAddressField, mergeAddressSelection, type SelectedAddress } from '../../../../shared-utils/addressSelection';
const suggestion = (street = 'Rua A', place = 'a') => ({ display_name: ` ${street}, Colombo `, place_id: ` ${place} `, address: { road: ` ${street} `, city: ' Colombo ', state: 'Paraná', suburb: ' Centro ' } });
const details = (street = 'Rua A', place = 'a') => ({ street, number: ' 20 ', city: ' Colombo ', state: 'Paraná', cep: ' 83400000 ', placeId: place, coords: [-49.1, -25.1], formattedAddress: ` ${street}, 20 ` });
function Owner({ initial = {} as Record<string, unknown>, city = ' Colombo ', state = ' PR ', disabled = false }) {
  const [address, setAddress] = React.useState({ street: '', number: '10', city, state, ...initial });
  return <><AddressAutocompleteInput value={address.street} addressValue={address} cityHint={city} stateHint={state} disabled={disabled}
    onChange={(value) => { mocks.changed(value); setAddress((current) => ({ ...current, street: value })); }}
    onSelectAddress={(value: SelectedAddress, baseline) => { mocks.selected(value); setAddress((current) => mergeAddressSelection(current, value, baseline)); }} />
    <label>Número manual<input value={address.number} onChange={(event) => setAddress((current) => ({ ...current, number: event.target.value }))} /></label>
    <button type="button" onClick={() => setAddress((current) => ({ ...current, coords: [-50, -26] }))}>Localização manual</button>
    <output data-testid="address">{JSON.stringify(address)}</output></>;
}
const current = () => JSON.parse(screen.getByTestId('address').textContent!);
const query = async (text = ' Rua A ') => {
  fireEvent.change(screen.getByPlaceholderText(/Rua das Flores/), { target: { value: text } });
  await act(async () => { await vi.advanceTimersByTimeAsync(601); });
};
const choose = async (name = 'Rua A') => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: new RegExp(name) })); }); };
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); mocks.search.mockResolvedValue([suggestion()]); mocks.details.mockResolvedValue(details()); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('consultas e seleção do autocomplete compartilhado', () => {
  it('normaliza consulta e contexto antes do serviço, mantendo o campo controlado', async () => {
    render(<Owner />); await query(); expect(mocks.search).toHaveBeenCalledWith('Rua A', 'Colombo', 'PR');
    expect(current().street).toBe(' Rua A ');
  });
  it('executa o resolver do contexto antes da busca e apresenta o erro', async () => {
    render(<Owner state={123 as any} />); await query(); expect(mocks.search).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('impede seleção sem logradouro válido antes de alterar dados ou buscar detalhes', async () => {
    mocks.search.mockResolvedValueOnce([{ display_name: '-', place_id: 'a', address: {} }]); render(<Owner />); await query();
    mocks.changed.mockClear(); await choose('-'); expect(mocks.changed).not.toHaveBeenCalled(); expect(mocks.selected).not.toHaveBeenCalled(); expect(mocks.details).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('rejeita resultado de busca malformado sem descartar silenciosamente apenas a linha inválida', async () => {
    mocks.search.mockResolvedValueOnce([suggestion(), { display_name: null }]); render(<Owner />); await query();
    expect(screen.queryByRole('button', { name: /Rua A/ })).toBeNull(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('entrega seleção e detalhes parseados, conserva campos não relacionados e limpa localização anterior', async () => {
    let finish!: (value: unknown) => void; mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Owner initial={{ street: 'Rua anterior', note: 'observação', coords: [-50, -26], mapsUrl: 'rota-anterior', placeId: 'antigo' }} />); await query(); await choose();
    expect(mocks.selected).toHaveBeenCalledWith(expect.objectContaining({ street: 'Rua A', city: 'Colombo', state: 'PR', placeId: 'a' }));
    expect(mocks.details).toHaveBeenCalledWith('a'); expect(current().coords).toBeUndefined(); expect(current().mapsUrl).toBe('');
    await act(async () => { finish(details()); }); expect(current()).toMatchObject({ street: 'Rua A', number: '20', cep: '83400000', note: 'observação', coords: [-49.1, -25.1] });
  });
  it('não aplica o complemento depois de o operador editar outro campo do endereço', async () => {
    let finish!: (value: unknown) => void; mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Owner />); await query(); await choose(); fireEvent.change(screen.getByLabelText('Número manual'), { target: { value: '777' } });
    await act(async () => { finish(details()); }); expect(current().number).toBe('777'); expect(mocks.selected).toHaveBeenCalledTimes(1);
  });
  it('não aplica detalhes do endereço anterior depois de nova digitação', async () => {
    let finish!: (value: unknown) => void; mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Owner />); await query(); await choose(); fireEvent.change(screen.getByPlaceholderText(/Rua das Flores/), { target: { value: 'Outra rua' } });
    await act(async () => { finish(details()); }); expect(current().street).toBe('Outra rua'); expect(mocks.selected).toHaveBeenCalledTimes(1);
  });
  it('não substitui uma localização manual escolhida enquanto o complemento demora', async () => {
    let finish!: (value: unknown) => void; mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Owner />); await query(); await choose(); fireEvent.click(screen.getByRole('button', { name: 'Localização manual' }));
    await act(async () => { finish(details()); }); expect(current().coords).toEqual([-50, -26]); expect(mocks.selected).toHaveBeenCalledTimes(1);
  });
  it('preserva edição feita antes de a validação da seleção terminar', async () => {
    render(<Owner />); await query();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Rua A/ })); fireEvent.change(screen.getByLabelText('Número manual'), { target: { value: '777' } }); });
    expect(current().number).toBe('777'); expect(mocks.selected).not.toHaveBeenCalled(); expect(mocks.details).not.toHaveBeenCalled();
  });
  it('não apresenta erro de seleção obsoleta depois de começar outra busca', async () => {
    mocks.search.mockResolvedValueOnce([{ display_name: '-', place_id: 'a', address: {} }]); render(<Owner />); await query();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^-/ })); fireEvent.change(screen.getByPlaceholderText(/Rua das Flores/), { target: { value: 'Rua B' } }); });
    expect(screen.queryByRole('alert')).toBeNull(); expect(mocks.selected).not.toHaveBeenCalled();
  });
  it('somente a busca mais recente pode reabrir as sugestões', async () => {
    let finish!: (value: unknown) => void; mocks.search.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Owner />); await query('Rua A'); mocks.search.mockResolvedValueOnce([suggestion('Rua B', 'b')]); await query('Rua B');
    await act(async () => { finish([suggestion('Rua A', 'a')]); }); expect(screen.queryByRole('button', { name: /Rua A/ })).toBeNull(); expect(screen.getByRole('button', { name: /Rua B/ })).toBeTruthy();
  });
  it('não aplica detalhes inválidos sobre o endereço já selecionado', async () => {
    mocks.details.mockResolvedValueOnce({ ...details(), coords: [Infinity, -25] }); render(<Owner />); await query(); await choose();
    expect(mocks.selected).toHaveBeenCalledTimes(1); expect(current().number).toBe('10'); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('limita a busca sem reenvio nem reabertura por resposta tardia', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {}); let finish!: (value: unknown) => void;
    mocks.search.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); render(<Owner />); await query();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); }); expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { finish([suggestion()]); }); expect(screen.queryByRole('button', { name: /Rua A/ })).toBeNull(); expect(mocks.search).toHaveBeenCalledTimes(1);
  });
  it('limita o complemento sem substituir dados por resposta tardia', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {}); let finish!: (value: unknown) => void;
    mocks.details.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); render(<Owner />); await query(); await choose();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); }); expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { finish(details()); }); expect(mocks.selected).toHaveBeenCalledTimes(1); expect(current().number).toBe('10');
  });
  it('não inicia nem aplica buscas quando o componente é desabilitado ou desmontado', async () => {
    const view = render(<Owner />); fireEvent.change(screen.getByPlaceholderText(/Rua das Flores/), { target: { value: 'Rua A' } }); view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); expect(mocks.search).not.toHaveBeenCalled();
  });
  it('changeAddressField preserva mapsUrl informado ao editar número ou outro campo físico', () => {
    const initial = {
      street: 'Estrada Elena Tomé De Oliveira Lisboa',
      number: '',
      city: 'Colombo',
      state: 'PR',
      mapsUrl: 'https://maps.google.com/?q=-25.26,-49.14',
      coords: [-49.14, -25.26],
      placeId: 'pl-1',
    };
    const updated = changeAddressField(initial, 'number', '0');
    expect(updated.number).toBe('0');
    expect(updated.mapsUrl).toBe('https://maps.google.com/?q=-25.26,-49.14');
    expect(updated.coords).toBeUndefined();
    expect(updated.placeId).toBe('');
  });
});
