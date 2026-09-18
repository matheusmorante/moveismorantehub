import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from './personMapper';
import { getPrimaryRole } from '../accessRoles';

export const syncMissingEmployeesFromProfiles = async (): Promise<void> => {
    try {
        const { data: profilesData, error: profError } = await supabase
            .from('profiles')
            .select('*');

        if (profError || !profilesData || profilesData.length === 0) return;

        const { data: existingPeople, error: peopleError } = await supabase
            .from(TABLE_NAME)
            .select('id,email,full_name,person_type,position,phone,address')
            .or('person_type.ilike.employees,and(position.not.is.null,position.neq."")');

        if (peopleError) return;

        const normalizeEmail = (e?: string) => (e || '').trim().toLowerCase();

        const existingByEmail = new Map<string, any>();
        for (const p of (existingPeople || [])) {
            const emailKey = normalizeEmail(p.email);
            if (emailKey && !existingByEmail.has(emailKey)) {
                existingByEmail.set(emailKey, p);
            }
        }

        const rolePositions: Record<string, string> = {
            administrator: 'Administrador',
            manager: 'Gestor',
            stockist: 'Estoquista',
            seller: 'Vendedor',
            deliverer: 'Entregador / Montador',
            accountant: 'Contador',
            pending: 'Sem Acesso'
        };

        for (const profile of profilesData) {
            const profileEmail = normalizeEmail(profile.email);
            if (!profileEmail) continue;

            const existingEmp = existingByEmail.get(profileEmail);

            if (existingEmp) {
                const googleName = profile.full_name?.trim();
                let currentAddress = existingEmp.address || {};

                if (typeof currentAddress === 'string') {
                    try {
                        currentAddress = JSON.parse(currentAddress);
                    } catch {
                        currentAddress = {};
                    }
                }

                const empRoles: any[] = Array.isArray(currentAddress?.roles) && currentAddress.roles.length > 0
                    ? currentAddress.roles
                    : (currentAddress?.role ? [currentAddress.role] : []);

                const profileRoles: any[] = Array.isArray(profile.roles) && profile.roles.length > 0
                    ? profile.roles
                    : (profile.role ? [profile.role] : []);

                if (empRoles.length > 0 && JSON.stringify(empRoles) !== JSON.stringify(profileRoles)) {
                    const primaryRole = currentAddress.role || getPrimaryRole(empRoles);
                    await supabase
                        .from('profiles')
                        .update({
                            role: primaryRole,
                            roles: empRoles
                        })
                        .eq('id', profile.id);
                } 
                else if (profileRoles.length > 0 && empRoles.length === 0) {
                    const primaryRole = profile.role || getPrimaryRole(profileRoles);
                    const newAddr = { ...currentAddress, role: primaryRole, roles: profileRoles };
                    await supabase
                        .from(TABLE_NAME)
                        .update({ address: newAddr, updated_at: new Date().toISOString() })
                        .eq('id', existingEmp.id);
                }

                if (googleName && (!existingEmp.full_name || existingEmp.full_name === profileEmail.split('@')[0])) {
                    await supabase
                        .from(TABLE_NAME)
                        .update({ full_name: googleName, updated_at: new Date().toISOString() })
                        .eq('id', existingEmp.id);
                }
            } else {
                const effectiveRoles = (profile.roles && profile.roles.length > 0)
                    ? profile.roles
                    : (profile.role ? [profile.role] : ['pending']);
                const primaryRole = profile.role || getPrimaryRole(effectiveRoles);
                const defaultPosition = profile.position || rolePositions[primaryRole] || 'Vendedor';

                const newEmployeeData: any = {
                    person_type: 'employees',
                    person_type_pf_pj: 'PF',
                    full_name: profile.full_name || profileEmail.split('@')[0] || 'Colaborador',
                    email: profile.email,
                    phone: profile.phone || '',
                    position: defaultPosition,
                    active: true,
                    is_draft: false,
                    deleted: false,
                    address: {
                        noAddress: true,
                        street: '',
                        city: '',
                        state: '',
                        cep: '',
                        role: primaryRole,
                        roles: effectiveRoles
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data: inserted, error: insertError } = await supabase
                    .from(TABLE_NAME)
                    .insert([newEmployeeData])
                    .select();

                if (!insertError && inserted && inserted.length > 0) {
                    existingByEmail.set(profileEmail, inserted[0]);
                }
            }
        }
    } catch (err) {
        console.warn('[Colaboradores] Erro ao sincronizar colaboradores a partir dos perfis:', err);
    }
};
