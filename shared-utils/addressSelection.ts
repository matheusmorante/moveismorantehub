import type { z } from 'zod';
import type { addressSelectionFormSchema, addressSuggestionFormSchema } from './routeFormSchemas';

export type SelectedAddress = z.output<typeof addressSelectionFormSchema>;
export type AddressSuggestion = z.output<typeof addressSuggestionFormSchema>;
export type AddressSelectionBaseline = Partial<SelectedAddress> & { mapsUrl?: string; googleMapsUrl?: string; mapsLink?: string };
const physicalFields = ['street', 'number', 'neighborhood', 'city', 'state', 'cep'] as const;
const guardedFields = [...physicalFields, 'mapsUrl', 'googleMapsUrl', 'mapsLink'] as const;
const locationFields = ['coords', 'placeId', 'formattedAddress', 'mapsUrl', 'googleMapsUrl', 'mapsLink'] as const;
const clearLocation = (address: Record<string, unknown>) => {
  for (const field of locationFields) address[field] = field === 'coords' ? undefined : '';
};
export const addressSelectionKey = (suggestion: AddressSuggestion) => JSON.stringify(suggestion);
export const addressStateKey = (address: AddressSelectionBaseline) => JSON.stringify([
  ...guardedFields.map((field) => address[field] ?? ''), address.coords ?? null,
]);

const clearDerivedLocation = (address: Record<string, unknown>) => {
  address.coords = undefined;
  address.placeId = '';
  address.formattedAddress = '';
};

/** Editing an address invalidates coordinates and links from its previous location, but preserves explicitly provided mapsUrl when editing physical fields. */
export function changeAddressField<T extends object>(current: T, field: string, value: unknown): T {
  if ((current as Record<string, unknown> | undefined)?.[field] === value) return current;
  const next = { ...current } as Record<string, unknown>;
  if (guardedFields.includes(field as typeof guardedFields[number])) clearDerivedLocation(next);
  next[field] = value;
  return next as T;
}

export function getSuggestedAddress(suggestion: AddressSuggestion, cityHint?: string, stateHint?: string): SelectedAddress {
  const address = suggestion.address;
  return {
    street: address.road || address.pedestrian || suggestion.display_name.split(',')[0].split('-')[0].trim(),
    number: address.house_number || '', neighborhood: address.suburb || address.neighbourhood || '',
    city: address.city || address.town || address.village || cityHint || 'Colombo',
    state: address.state || stateHint || 'PR', cep: address.postcode || '',
    placeId: suggestion.place_id, formattedAddress: suggestion.display_name,
  };
}

/** Enrichment may fill the selected address only while its input is unchanged. */
export function mergeAddressSelection<T extends object>(current: T, selected: SelectedAddress, baseline?: AddressSelectionBaseline): T {
  const before = (current || {}) as AddressSelectionBaseline;
  if (baseline && addressStateKey(before) !== addressStateKey(baseline)) return current;
  const next = { ...current, street: selected.street } as Record<string, unknown>;
  for (const field of physicalFields) {
    next[field] = selected[field] || before[field] || '';
  }
  const changed = !baseline || physicalFields.some((field) => (before[field] ?? '') !== (next[field] ?? '')) ||
    Boolean(selected.placeId && selected.placeId !== before.placeId);
  if (changed) {
    clearLocation(next);
  }
  if (selected.placeId) next.placeId = selected.placeId;
  if (selected.coords) next.coords = selected.coords;
  if (selected.formattedAddress) next.formattedAddress = selected.formattedAddress;
  return next as T;
}
