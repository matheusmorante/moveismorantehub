import React, { useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import Person from '@/pages/types/person.type';
import { UserRole } from '@/context/AuthContext';
import { getPrimaryRole } from '@/pages/utils/accessRoles';
import {
  getUserProfileByEmail,
} from '@/pages/utils/employeeProfileService';
import { isEmployeeEmailTaken } from '@/pages/utils/personService';
import { emailLookupFormSchema } from '../../../../../../../../shared-utils/lookupFormSchemas';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';

export const EMPLOYEE_ROLES: {
  value: UserRole;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'administrator',
    label: 'Administrador',
    description: 'Acesso total a todas as áreas do sistema',
    icon: 'bi-shield-shaded',
  },
  {
    value: 'manager',
    label: 'Gestor',
    description: 'Gestão operacional, estoque e relatórios',
    icon: 'bi-briefcase-fill',
  },
  {
    value: 'stockist',
    label: 'Estoquista',
    description: 'Controle, contagens e movimentações de estoque',
    icon: 'bi-boxes',
  },
  {
    value: 'seller',
    label: 'Vendedor',
    description: 'Vendas, pedidos e clientes',
    icon: 'bi-tag-fill',
  },
  {
    value: 'deliverer',
    label: 'Entregador / Montador',
    description: 'Rotas de entrega e montagens',
    icon: 'bi-truck',
  },
  {
    value: 'pending',
    label: 'Sem Acesso',
    description: 'Acesso bloqueado temporariamente',
    icon: 'bi-slash-circle',
  },
];

const DEFAULT_ROLE_NAMES: Record<UserRole, string> = {
  administrator: 'Administrador',
  manager: 'Gestor',
  stockist: 'Estoquista',
  seller: 'Vendedor',
  deliverer: 'Entregador / Montador',
  accountant: 'Contador',
  pending: 'Sem Acesso',
};

export interface UseEmployeeRolesProps {
  formData: Partial<Person>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
  isEmployee: boolean;
  person?: Person | null;
}

export const useEmployeeRoles = ({
  formData,
  setFormData,
  isEmployee,
  person,
}: UseEmployeeRolesProps) => {
  const emailLookupForm = useZodForm(emailLookupFormSchema, { email: '' });
  const emailLookupRevision = useRef(0);

  // Sync profile on employee load
  useEffect(() => {
    if (!isEmployee || !person?.email) return;

    getUserProfileByEmail(person.email)
      .then((prof) => {
        if (prof?.roles && prof.roles.length > 0) {
          setFormData((prev) => ({
            ...prev,
            roles: (prof.roles || prev.roles) as UserRole[],
            role: prof.role || getPrimaryRole(prof.roles || []) || prev.role,
          }));
        } else if (prof?.role) {
          setFormData((prev) => ({
            ...prev,
            role: prof.role || prev.role,
            roles: [prof.role as UserRole].filter(Boolean),
          }));
        }
      })
      .catch(() => {});
  }, [isEmployee, person?.email, setFormData]);

  const toggleEmployeeRole = (roleValue: UserRole) => {
    const currentRoles =
      formData.roles && formData.roles.length > 0
        ? [...formData.roles]
        : formData.role
          ? [formData.role]
          : ['seller'];

    let nextRoles: UserRole[];

    if (roleValue === 'pending') {
      nextRoles = ['pending'];
    } else {
      const withoutPending = currentRoles.filter((r) => r !== 'pending');
      if (withoutPending.includes(roleValue)) {
        nextRoles = withoutPending.filter((r) => r !== roleValue) as UserRole[];
        if (nextRoles.length === 0) {
          nextRoles = ['pending'];
        }
      } else {
        nextRoles = [...withoutPending, roleValue] as UserRole[];
      }
    }

    const primaryRole = getPrimaryRole(nextRoles);

    setFormData((prev) => ({
      ...prev,
      roles: nextRoles,
      role: primaryRole,
      position:
        !prev.position ||
        prev.position.trim() === '' ||
        EMPLOYEE_ROLES.some((er) => er.label === prev.position) ||
        prev.position.includes('/')
          ? nextRoles
              .filter((r) => r !== 'pending')
              .map((r) => DEFAULT_ROLE_NAMES[r])
              .join(' / ') || DEFAULT_ROLE_NAMES[primaryRole]
          : prev.position,
    }));
  };

  const handleEmployeeEmailBlur = async () => {
    const revision = ++emailLookupRevision.current;
    if (!isEmployee || !formData.email?.trim()) return;

    const values = await emailLookupForm.validateValues(
      { email: formData.email },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
    if (!values || revision !== emailLookupRevision.current) return;

    try {
      const isTaken = await isEmployeeEmailTaken(values.email, person?.id);
      if (revision !== emailLookupRevision.current) return;
      if (isTaken) {
        toast.error('Este e-mail já está sendo utilizado por outro colaborador.');
        return;
      }

      const profile = await getUserProfileByEmail(values.email);
      if (!profile || revision !== emailLookupRevision.current) return;

      const profileRoles =
        profile.roles && profile.roles.length > 0
          ? profile.roles
          : profile.role
            ? [profile.role]
            : ['seller'];

      setFormData((current) =>
        current.email?.trim() !== values.email
          ? current
          : {
              ...current,
              fullName: current.fullName || profile.full_name || profile.email,
              position: current.position || profile.position || '',
              role:
                current.role ||
                (profile.role as UserRole) ||
                getPrimaryRole(profileRoles as UserRole[]),
              roles:
                current.roles && current.roles.length > 0
                  ? current.roles
                  : (profileRoles as UserRole[]),
            }
      );
      toast.info('Dados e cargos da conta vinculados ao funcionário.');
    } catch (error) {
      console.error('Erro ao localizar conta pelo e-mail:', error);
      if (revision === emailLookupRevision.current) {
        toast.error('Não foi possível localizar a conta. Tente novamente.');
      }
    }
  };

  return {
    toggleEmployeeRole,
    handleEmployeeEmailBlur,
  };
};
