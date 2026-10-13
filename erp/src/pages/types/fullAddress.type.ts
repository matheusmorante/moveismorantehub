type FullAddress = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  observation: string;
  neighborhood: string;
  city: string;
  state?: string;
  housingType?: string;
  mapsUrl?: string;
  googleMapsUrl?: string;
  mapsLink?: string;
  placeId?: string;
  coords?: [number, number];
  formattedAddress?: string;
};

export type AddressViaCep = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
};

export default FullAddress;
