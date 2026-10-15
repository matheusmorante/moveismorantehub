// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersonForm } from './usePersonForm';

const mocks = vi.hoisted(() => ({ save: vi.fn(), identifiers: vi.fn(), emailTaken: vi.fn(), nameTaken: vi.fn(), profile: vi.fn(), profileById: vi.fn(), syncProfile: vi.fn(), cep: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/personService', () => ({ savePerson: mocks.save, getPersonByIdentifiers: mocks.identifiers, isEmployeeEmailTaken: mocks.emailTaken, isSupplierNameTaken: mocks.nameTaken }));
vi.mock('@/pages/utils/employeeProfileService', () => ({ getUserProfileByEmail: mocks.profile, getUserProfileByIdOrEmail: mocks.profileById, saveEmployeeInProfile: mocks.syncProfile }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ requiredFields: {} }) }));
vi.mock('@/pages/utils/maps', () => ({ getAddressByCep: mocks.cep, getShippingRouteUrl: () => '' }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReset().mockImplementation(async (_type, data) => ({ ...data, id: 'saved-person' }));
  mocks.identifiers.mockReset().mockResolvedValue(null);
  mocks.emailTaken.mockReset().mockResolvedValue(false);
  mocks.nameTaken.mockReset().mockResolvedValue(false);
  mocks.profile.mockReset().mockResolvedValue(null);
  mocks.profileById.mockReset().mockResolvedValue(null);
  mocks.cep.mockReset().mockResolvedValue(null);
});
const submitEvent = { preventDefault: vi.fn() } as never;
function setup(collectionName = 'suppliers') {
  const close = vi.fn();
  const hook = renderHook(() => usePersonForm({ isOpen: true, onClose: close, collectionName, title: 'Pessoa' }));
  return { ...hook, close };
}
const cepEvent = (value: string) => ({ target: { value } }) as never;

describe('person form owner', () => {
  it('blocks invalid fields before lookups and saves parsed lead time when corrected', async () => {
    const { result, close } = setup();
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.error).toHaveBeenCalledWith('O nome é obrigatório.');
    expect(mocks.nameTaken).not.toHaveBeenCalled();
    act(() => result.current.setFormData((current) => ({ ...current, fullName: 'Fornecedor', leadTime: 'inválido' as never })));
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.save).not.toHaveBeenCalled();
    act(() => result.current.setFormData((current) => ({ ...current, leadTime: '2' as never })));
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.save).toHaveBeenCalledWith('suppliers', expect.objectContaining({ fullName: 'Fornecedor', leadTime: 2, isDraft: false }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('holds the resolver across duplicate lookup and saving to block concurrent creation', async () => {
    let finish!: (taken: boolean) => void;
    mocks.nameTaken.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const { result, close } = setup();
    act(() => result.current.setFormData((current) => ({ ...current, fullName: 'Fornecedor' })));
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.handleSubmit(submitEvent); });
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.nameTaken).toHaveBeenCalledTimes(1);
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { finish(false); await first; });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('reports lookup failures, releases loading and permits retry', async () => {
    mocks.nameTaken.mockRejectedValueOnce(new Error('Consulta indisponível'));
    const { result } = setup();
    act(() => result.current.setFormData((current) => ({ ...current, fullName: 'Fornecedor' })));
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.error).toHaveBeenCalledWith('Erro ao salvar.');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    await act(async () => { await result.current.handleSubmit(submitEvent); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it('validates employee email lookups independently and sends the parsed email', async () => {
    const { result } = setup('employees');
    act(() => result.current.setFormData((current) => ({ ...current, email: 'inválido' })));
    await act(async () => { await result.current.handleEmployeeEmailBlur(); });
    expect(mocks.emailTaken).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Informe um e-mail válido.');
    mocks.profile.mockResolvedValueOnce({ full_name: 'Alice', email: 'alice@example.com' });
    act(() => result.current.setFormData((current) => ({ ...current, email: ' alice@example.com ' })));
    await act(async () => { await result.current.handleEmployeeEmailBlur(); });
    expect(mocks.profile).toHaveBeenCalledWith('alice@example.com');
    expect(result.current.formData.fullName).toBe('Alice');
  });

  it('invalidates the previous location when manually editing the address and preserves unrelated fields', () => {
    const { result } = setup();
    act(() => result.current.setFormData((current) => ({ ...current, fullAddress: {
      ...current.fullAddress!, street: 'Rua anterior', number: '10', complement: 'Fundos', observation: 'Interfone',
      coords: [-49, -25] as [number, number], placeId: 'antigo', formattedAddress: 'Rua anterior, 10',
      mapsUrl: 'https://maps.google.com/?q=antigo', googleMapsUrl: 'rota antiga', mapsLink: 'link antigo',
    } })));
    act(() => result.current.handleAddressChange('number', '99'));
    expect(result.current.formData.fullAddress).toMatchObject({ number: '99', complement: 'Fundos', observation: 'Interfone',
      placeId: '', formattedAddress: '', mapsUrl: '', googleMapsUrl: '', mapsLink: '' });
    expect(result.current.formData.fullAddress?.coords).toBeUndefined();
  });

  it('blocks invalid CEP and discards an obsolete address response', async () => {
    const { result } = setup();
    await act(async () => { await result.current.handleCepBlur(cepEvent('123')); });
    expect(mocks.cep).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Informe um CEP com 8 dígitos.');
    let finish!: (data: { street: string }) => void;
    mocks.cep.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce({ street: 'Endereço atual' });
    act(() => result.current.handleAddressChange('cep', '87000-000'));
    let first!: Promise<void>;
    await act(async () => { first = result.current.handleCepBlur(cepEvent('87000-000')); });
    act(() => result.current.handleAddressChange('cep', '80000-000'));
    await act(async () => { await result.current.handleCepBlur(cepEvent('80000-000')); });
    await act(async () => { finish({ street: 'Endereço antigo' }); await first; });
    expect(mocks.cep).toHaveBeenNthCalledWith(1, '87000000');
    expect(mocks.cep).toHaveBeenNthCalledWith(2, '80000000');
    expect(result.current.formData.fullAddress?.street).toBe('Endereço atual');
  });
});
