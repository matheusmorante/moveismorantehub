import { z } from 'zod';

const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const optionalText = z.string().trim().optional();
const optionalAddressNumber = z.string().regex(/^[0-9]*$/, 'O número do endereço deve conter apenas números.').optional();

export const routeAddressFormSchema = z.object({
  street: optionalText, number: optionalAddressNumber, neighborhood: optionalText, city: optionalText,
  state: optionalText, cep: optionalText, complement: optionalText, observation: optionalText,
  mapsUrl: optionalText, googleMapsUrl: optionalText, mapsLink: optionalText,
  placeId: optionalText, formattedAddress: optionalText, coords: coordinateSchema.optional(),
}).refine((address) => Boolean(
  address.street || address.neighborhood || address.city || address.cep || address.mapsUrl ||
  address.googleMapsUrl || address.mapsLink || address.placeId || address.coords?.some((value) => value !== 0)
), 'Preencha ao menos a rua, bairro, cidade ou uma localização válida para calcular a distância.');

export const routeAddressSearchFormSchema = z.object({
  search: z.string().trim().min(3, 'Digite ao menos 3 caracteres para pesquisar o endereço.'),
  city: z.string({ error: 'Informe uma cidade válida para pesquisar.' }).trim().optional(),
  state: z.string({ error: 'Informe uma UF válida para pesquisar.' }).trim().optional(),
});

export const addressSuggestionFormSchema = z.object({
  display_name: z.string().trim().min(1, 'A sugestão precisa identificar o endereço.'),
  place_id: optionalText,
  address: z.object({
    road: optionalText, pedestrian: optionalText, house_number: optionalText,
    suburb: optionalText, neighbourhood: optionalText, city: optionalText, town: optionalText,
    village: optionalText, state: optionalText, postcode: optionalText,
  }).default({}),
});
export const addressSuggestionsFormSchema = z.array(addressSuggestionFormSchema);
export const createAddressChoiceFormSchema = (availableKeys: readonly string[]) => z.object({
  choice: z.string().min(1, 'Selecione um endereço disponível.'),
}).refine(({ choice }) => availableKeys.includes(choice), 'Selecione um endereço da busca atual.');

export const addressSelectionFormSchema = z.object({
  street: z.string().trim().min(1, 'Informe um logradouro válido.'),
  number: routeAddressFormSchema.shape.number, neighborhood: routeAddressFormSchema.shape.neighborhood,
  city: routeAddressFormSchema.shape.city, state: routeAddressFormSchema.shape.state,
  cep: routeAddressFormSchema.shape.cep, placeId: routeAddressFormSchema.shape.placeId,
  coords: routeAddressFormSchema.shape.coords, formattedAddress: routeAddressFormSchema.shape.formattedAddress,
});
export const addressPlaceLookupFormSchema = z.object({
  placeId: z.string().trim().min(1, 'A localização selecionada não é válida.'),
});
export const routeFreightFormSchema = routeAddressFormSchema.safeExtend({ street: addressSelectionFormSchema.shape.street });

export const routeDistanceResultSchema = z.object({
  distanceKm: z.number().nonnegative(), durationMinutes: z.number().nonnegative(),
  destinationCoords: coordinateSchema,
  routeGeoJSON: z.object({ type: z.literal('LineString'), coordinates: z.array(coordinateSchema).min(2) }).nullable().optional(),
});
