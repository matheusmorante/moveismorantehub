import Person from '@/pages/types/person.type';
import { UserRole } from '@/context/AuthContext';
import { getPrimaryRole } from '@/pages/utils/accessRoles';
import { getShippingRouteUrl } from '@/pages/utils/maps';

export const EMPTY_PERSON_ADDRESS = {
  cep: '',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: 'PR',
  housingType: '',
  complement: '',
  mapsUrl: '',
  observation: '',
};

export const isFinalConsumer = (name?: string): boolean =>
  name?.toLowerCase().trim() === 'consumidor final';

export const resolveShippingRouteUrl = (fullAddress?: Person['fullAddress']): string => {
  if (!fullAddress) return '';
  return (
    fullAddress.mapsUrl ||
    (fullAddress.street?.trim() ? getShippingRouteUrl(fullAddress as any) : '')
  );
};

export const createInitialPersonState = (
  collectionName: string,
  person?: Person | null,
  title?: string
): Partial<Person> => {
  if (person) {
    const initialRoles =
      person.roles && person.roles.length > 0
        ? person.roles
        : person.role
          ? [person.role]
          : ['seller'];

    const rawAddress = (person.fullAddress || {}) as Record<string, any>;

    return {
      ...person,
      role: person.role || getPrimaryRole(initialRoles as UserRole[]),
      roles: initialRoles as UserRole[],
      personType: person.personType || 'PF',
      fullAddress: {
        ...EMPTY_PERSON_ADDRESS,
        ...person.fullAddress,
        cep: person.fullAddress?.cep || '',
        street: person.fullAddress?.street || '',
        number: person.fullAddress?.number || '',
        neighborhood: person.fullAddress?.neighborhood || '',
        city: person.fullAddress?.city || '',
        state: person.fullAddress?.state || 'PR',
        housingType: rawAddress.housingType || '',
        complement: person.fullAddress?.complement || '',
        mapsUrl:
          person.fullAddress?.mapsUrl ||
          rawAddress.googleMapsUrl ||
          rawAddress.mapsLink ||
          '',
        observation: person.fullAddress?.observation || '',
      },
      additionalContacts: person.additionalContacts || [],
      observations: person.observations || '',
    };
  }

  return {
    personType: 'PF',
    fullName: '',
    socialName: '',
    cpfCnpj: '',
    email: '',
    phone: '',
    noPhone: false,
    active: true,
    type: collectionName as any,
    role: 'seller',
    roles: ['seller'],
    fullAddress: { ...EMPTY_PERSON_ADDRESS },
    noAddress: false,
    marketingOrigin: '',
    position: title === 'Vendedor' ? 'Vendedor' : '',
    additionalContacts: [],
    observations: '',
    stockOrigins: collectionName === 'suppliers' ? ['normal'] : undefined,
  };
};
