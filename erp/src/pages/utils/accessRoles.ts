import { UserRole } from '@/context/AuthContext';

export const SYSTEM_ROLES: Array<[Exclude<UserRole, 'pending'>, string]> = [
    ['administrator', 'Administrador'],
    ['manager', 'Gestor'],
    ['seller', 'Vendedor'],
    ['deliverer', 'Entregador / Montador'],
    ['accountant', 'Contador'],
];

const priority: UserRole[] = ['administrator', 'manager', 'deliverer', 'seller', 'accountant'];

export const getProfileRoles = (profile: { role?: UserRole; roles?: UserRole[] | null }): UserRole[] => {
    const roles = profile.roles?.filter((role) => role !== 'pending') || [];
    return roles.length ? roles : (profile.role && profile.role !== 'pending' ? [profile.role] : []);
};

export const getPrimaryRole = (roles: UserRole[]): UserRole =>
    priority.find((role) => roles.includes(role)) || 'pending';

export const roleLabel = (role: UserRole) =>
    SYSTEM_ROLES.find(([value]) => value === role)?.[1] || 'Sem acesso';
