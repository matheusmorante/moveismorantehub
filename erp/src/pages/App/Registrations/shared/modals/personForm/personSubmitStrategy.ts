import Person from '@/pages/types/person.type';
import { SavePersonOptions } from '@/pages/utils/personService/personMutationService';
import {
  getPersonByIdentifiers,
  isEmployeeEmailTaken,
  isSupplierNameTaken,
} from '@/pages/utils/personService';
import {
  getUserProfileByIdOrEmail,
  saveEmployeeInProfile,
} from '@/pages/utils/employeeProfileService';
import { getPrimaryRole } from '@/pages/utils/accessRoles';
import { toast } from 'react-toastify';

export interface PersonCollectionStrategy {
  validatePreSubmit(validatedData: Partial<Person>, personId?: string): Promise<boolean>;
  checkDuplicates(validatedData: Partial<Person>, collectionName: string): Promise<boolean>;
  prepareData(data: Person): Person;
  getSaveOptions(isNew: boolean, isTestArtifact: boolean): SavePersonOptions | undefined;
  afterSave(savedPerson: Person, originalPerson?: Person | null, canManageRoles?: boolean): Promise<void>;
}

const customerStrategy: PersonCollectionStrategy = {
  validatePreSubmit: async () => true,

  checkDuplicates: async (validatedData, collectionName) => {
    const existing = await getPersonByIdentifiers(
      {
        cpfCnpj: validatedData.cpfCnpj || '',
        email: validatedData.email || '',
        phone: validatedData.phone || '',
      },
      collectionName
    );
    if (existing) {
      toast.warn('Aviso: Já existe um cliente cadastrado com este CPF/CNPJ, e-mail ou celular.');
    }
    return true; // Customers only receive a warning, not blocked
  },

  prepareData: (data) => {
    const res = { ...data };
    if (res.position?.trim() === '') {
      res.position = null as any;
    }
    return res;
  },

  getSaveOptions: (isNew, isTestArtifact) => {
    return isNew && isTestArtifact ? { isTestArtifact: true } : undefined;
  },

  afterSave: async () => {},
};

const employeeStrategy: PersonCollectionStrategy = {
  validatePreSubmit: async (validatedData, personId) => {
    if (validatedData.email && validatedData.email.trim() !== '') {
      const isEmailTaken = await isEmployeeEmailTaken(validatedData.email, personId);
      if (isEmailTaken) {
        toast.error('Já existe outro colaborador cadastrado com este e-mail.');
        return false;
      }
    }
    return true;
  },

  checkDuplicates: async (validatedData, collectionName) => {
    const existing = await getPersonByIdentifiers(
      {
        cpfCnpj: validatedData.cpfCnpj || '',
        email: validatedData.email || '',
        phone: validatedData.phone || '',
      },
      collectionName
    );
    if (existing) {
      toast.error('Este funcionário já está cadastrado.');
      return false;
    }
    return true;
  },

  prepareData: (data) => {
    const res = { ...data };
    if (res.position?.trim() === '') {
      res.position = null as any;
    }
    if (!res.roles || res.roles.length === 0) {
      res.roles = res.role ? [res.role] : ['seller'];
    }
    res.role = res.role || getPrimaryRole(res.roles);
    return res;
  },

  getSaveOptions: () => undefined,

  afterSave: async (savedPerson, originalPerson, canManageRoles) => {
    try {
      const userProfile = await getUserProfileByIdOrEmail(originalPerson?.id, savedPerson.email);
      if (userProfile) {
        await saveEmployeeInProfile(userProfile, savedPerson, canManageRoles);
      }
    } catch (profErr) {
      console.warn('Aviso ao sincronizar profile do colaborador:', profErr);
    }
  },
};

const supplierStrategy: PersonCollectionStrategy = {
  validatePreSubmit: async (validatedData, personId) => {
    if (validatedData.fullName && validatedData.fullName.trim() !== '') {
      const isNameTaken = await isSupplierNameTaken(validatedData.fullName, personId);
      if (isNameTaken) {
        toast.error('Já existe um fornecedor cadastrado com este nome.');
        return false;
      }
    }
    return true;
  },

  checkDuplicates: async (validatedData, collectionName) => {
    const existing = await getPersonByIdentifiers(
      {
        cpfCnpj: validatedData.cpfCnpj || '',
        email: validatedData.email || '',
        phone: validatedData.phone || '',
      },
      collectionName
    );
    if (existing) {
      toast.error('Este fornecedor já está cadastrado.');
      return false;
    }
    return true;
  },

  prepareData: (data) => {
    const res = { ...data };
    if (res.position?.trim() === '') {
      res.position = null as any;
    }
    return res;
  },

  getSaveOptions: () => undefined,

  afterSave: async () => {},
};

export const getPersonCollectionStrategy = (collectionName: string): PersonCollectionStrategy => {
  switch (collectionName) {
    case 'employees':
      return employeeStrategy;
    case 'suppliers':
      return supplierStrategy;
    case 'customers':
    default:
      return customerStrategy;
  }
};
