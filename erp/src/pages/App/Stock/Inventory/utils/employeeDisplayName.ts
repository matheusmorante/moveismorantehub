import type Person from '@/pages/types/person.type';

/** Preferred display name for the employee responsible for an inventory audit. */
export const getEmployeeDisplayName = (employee?: Person): string =>
  employee?.fullName || employee?.socialName || employee?.nickname || 'Responsável não informado';
