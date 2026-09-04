import { UserRole } from '@/context/AuthContext';

export const SYSTEM_ROLES: Array<[Exclude<UserRole, 'pending'>, string]> = [
    ['administrator', 'Administrador'],
    ['manager', 'Gestor'],
    ['stockist', 'Estoquista'],
    ['seller', 'Vendedor'],
    ['deliverer', 'Entregador / Montador'],
    ['accountant', 'Contador'],
];

const priority: UserRole[] = ['administrator', 'manager', 'stockist', 'deliverer', 'seller', 'accountant'];

export const getProfileRoles = (profile: { role?: UserRole; roles?: UserRole[] | null }): UserRole[] => {
    const roles = profile.roles?.filter((role) => role !== 'pending') || [];
    return roles.length ? roles : (profile.role && profile.role !== 'pending' ? [profile.role] : []);
};

export const getPrimaryRole = (roles: UserRole[]): UserRole =>
    priority.find((role) => roles.includes(role)) || 'pending';

export const roleLabel = (role: UserRole) =>
    SYSTEM_ROLES.find(([value]) => value === role)?.[1] || 'Sem acesso';

/**
 * Verifica se um registro de pessoa é um colaborador válido e ativo para seleção (ex: vendedor, atendente).
 * Requer estar ativo, não deletado, ser do tipo 'employees' ou possuir cargo/role válido (não 'pending').
 */
export const isValidEmployee = (person?: any): boolean => {
    if (!person || person.active === false || person.deleted === true) return false;
    
    // Obter papéis/roles
    const rolesList: UserRole[] = Array.isArray(person.roles) && person.roles.length > 0
        ? person.roles
        : (person.role ? [person.role] : []);

    const hasValidRole = rolesList.some(r => r && r !== 'pending');
    const isEmployeeType = person.type === 'employees' || person.person_type === 'employees';
    
    // Se for do tipo employees e possuir role 'pending' exclusiva, não tem acesso
    if (rolesList.length === 1 && rolesList[0] === 'pending') {
        return false;
    }

    return isEmployeeType || hasValidRole;
};
