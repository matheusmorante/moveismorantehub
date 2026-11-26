import { z } from 'zod';

export const createUserRolesFormSchema = <TRole extends string>(allowedRoles: readonly TRole[]) =>
  z.object({
    // An empty list intentionally removes account access.
    roles: z.array(z.custom<TRole>(
      (value) => typeof value === 'string' && allowedRoles.includes(value as TRole),
      { error: 'Selecione apenas cargos disponíveis no sistema.' },
    )),
  });
