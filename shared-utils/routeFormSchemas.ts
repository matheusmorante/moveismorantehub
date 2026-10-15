import { z } from 'zod';

const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const optionalText = z.string().trim().optional();

export const routeAddressFormSchema = z.object({
  street: optionalText, number: optionalText, neighborhood: optionalText, city: optionalText,
  state: optionalText, cep: optionalText, complement: optionalText, observation: optionalText,
  mapsUrl: optionalText, googleMapsUrl: optionalText, mapsLink: optionalText,
  placeId: optionalText, formattedAddress: optionalText, coords: coordinateSchema.optional(),
}).refine((address) => Boolean(
  address.street || address.neighborhood || address.city || address.cep || address.mapsUrl ||
  address.googleMapsUrl || address.mapsLink || address.placeId || address.coords?.some((value) => value !== 0)
), 'Preencha ao menos a rua, bairro, cidade ou uma localização válida para calcular a distância.');

export const routeAddressSearchFormSchema = z.object({
  search: z.string().trim().min(3, 'Digite ao menos 3 caracteres para pesquisar o endereço.'),
});

export const routeDistanceResultSchema = z.object({
  distanceKm: z.number().nonnegative(), durationMinutes: z.number().nonnegative(),
  destinationCoords: coordinateSchema,
  routeGeoJSON: z.object({ type: z.literal('LineString'), coordinates: z.array(coordinateSchema).min(2) }).nullable().optional(),
});
