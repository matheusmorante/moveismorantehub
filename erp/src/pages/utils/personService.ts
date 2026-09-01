import { supabase } from '@/pages/utils/supabaseConfig';
import Person from "../types/person.type";

const TABLE_NAME = "people";

const mapToDB = (collectionName: string, person: Partial<Person>) => {
    const p = person as any;

    const dbObj: any = {};

    // Only set fields that are defined in 'person' for partial updates
    if (p.type || collectionName) dbObj.person_type = p.type || collectionName;
    if (p.personType !== undefined) dbObj.person_type_pf_pj = p.personType;
    if (p.fullName !== undefined) dbObj.full_name = p.fullName;
    if (p.socialName !== undefined) dbObj.social_name = p.socialName;
    if (p.nickname !== undefined || p.tradeName !== undefined) dbObj.nickname = p.nickname || p.tradeName;
    if (p.cpfCnpj !== undefined) dbObj.cpf_cnpj = p.cpfCnpj;
    if (p.rgIe !== undefined) dbObj.rg_ie = p.rgIe;
    if (p.email !== undefined) dbObj.email = p.email;
    if (p.phone !== undefined) dbObj.phone = p.phone;
    if (p.observation !== undefined) dbObj.observation = p.observation;
    if (p.position !== undefined) dbObj.position = p.position;
    if (p.active !== undefined) dbObj.active = p.active;
    if (p.isDraft !== undefined) dbObj.is_draft = p.isDraft;
    if (p.leadTime !== undefined) dbObj.lead_time = p.leadTime;
    if (p.deleted !== undefined) dbObj.deleted = p.deleted;
    if (p.marketingOrigin !== undefined) dbObj.marketing_origin = p.marketingOrigin;

    // Special handling for address and employee metadata (roles)
    if (p.fullAddress || p.address || p.additionalContacts !== undefined || p.noAddress !== undefined || p.role !== undefined || p.roles !== undefined) {
        let addressVal: any = p.fullAddress || p.address || {};
        if (typeof addressVal === 'string' && addressVal.trim().startsWith('{')) {
            try {
                addressVal = JSON.parse(addressVal);
            } catch (e) {
                // keep as string
            }
        }
        
        if (typeof addressVal === 'object' && addressVal !== null) {
            addressVal = { ...addressVal };
            if (p.additionalContacts !== undefined) {
                addressVal.additionalContacts = p.additionalContacts;
            }
            if (p.noAddress !== undefined) {
                addressVal.noAddress = p.noAddress;
            }
            if (p.role !== undefined) {
                addressVal.role = p.role;
            }
            if (p.roles !== undefined) {
                addressVal.roles = p.roles;
            }
        }
        dbObj.address = addressVal;
    }

    if (person.deletedAt !== undefined) {
        dbObj.deleted_at = person.deletedAt ? (person.deletedAt.includes('T') ? person.deletedAt : new Date().toISOString()) : null;
    }

    dbObj.updated_at = new Date().toISOString();

    return dbObj;
};

export const mapAddress = (data: any) => {
    return {
        zipCode: data.zipCode || data.cep || '',
        cep: data.zipCode || data.cep || '',
        street: data.street || data.address || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || data.bairro || '',
        city: data.city || '',
        state: data.state || data.uf || '',
        observation: ''
    };
};

const mapFromDB = (data: any): Person => {
    if (!data) return {} as Person;
    let parsedAddress = data.address;
    if (typeof parsedAddress === 'string') {
        try {
            parsedAddress = JSON.parse(parsedAddress);
        } catch (e) {
            // keep as string if not JSON
        }
    }

    const rolesFromAddress = typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress.roles : undefined;
    const roleFromAddress = typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress.role : undefined;

    const p: any = {
        id: String(data.id),
        personType: data.person_type_pf_pj || 'PF',
        fullName: data.full_name || '',
        socialName: data.social_name || '',
        nickname: data.nickname || '',
        cpfCnpj: data.cpf_cnpj || '',
        rgIe: data.rg_ie || '',
        email: data.email || '',
        phone: data.phone || '',
        address: parsedAddress || {},
        fullAddress: typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress : { street: parsedAddress || '' },
        noAddress: (typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress.noAddress : false) || false,
        observation: data.observation || '',
        active: data.active ?? true,
        isDraft: data.is_draft ?? false,
        deleted: data.deleted ?? false,
        deletedAt: data.deleted_at,
        position: data.position || '',
        role: roleFromAddress || (rolesFromAddress?.[0]) || (data.person_type === 'employees' ? 'seller' : undefined),
        roles: rolesFromAddress || (roleFromAddress ? [roleFromAddress] : (data.person_type === 'employees' ? ['seller'] : undefined)),
        type: data.person_type as any,
        leadTime: data.lead_time || 0,
        marketingOrigin: data.marketing_origin || '',
        additionalContacts: data.additional_contacts || (typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress.additionalContacts : []) || [],
        defaultIpiPercent: data.default_ipi_percent,
        defaultFreightCost: data.default_freight_cost,
        defaultFreightType: data.default_freight_type || 'none',
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
    return p as Person;
};

const mapProfileToPerson = (prof: any): Person => {
    const rolePositions: Record<string, string> = {
        administrator: 'Administrador',
        manager: 'Gerente',
        seller: 'Vendedor',
        deliverer: 'Entregador / Montador',
        pending: 'Sem Acesso'
    };
    const effectiveRoles = prof.roles && prof.roles.length > 0 ? prof.roles : (prof.role ? [prof.role] : ['seller']);
    return {
        id: prof.id,
        fullName: prof.full_name || prof.email || 'Conta sem nome',
        email: prof.email || '',
        position: prof.position || rolePositions[prof.role] || '',
        role: prof.role || effectiveRoles[0] || 'administrator',
        roles: effectiveRoles,
        type: 'employees',
        active: true,
        isDraft: false,
        fullAddress: { street: '' },
        deleted: false
    } as any;
};

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

        // Mapear colaboradores existentes por email normalizado
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
            seller: 'Vendedor',
            deliverer: 'Entregador / Montador',
            pending: 'Sem Acesso'
        };

        for (const profile of profilesData) {
            const profileEmail = normalizeEmail(profile.email);
            if (!profileEmail) continue;

            const existingEmp = existingByEmail.get(profileEmail);

            if (existingEmp) {
                // Se já existe colaborador para esse email, atualiza as informações com os dados do Google
                const googleName = profile.full_name?.trim();
                const updates: Record<string, any> = {};

                if (googleName && (!existingEmp.full_name || existingEmp.full_name === profileEmail.split('@')[0])) {
                    updates.full_name = googleName;
                }

                if (Object.keys(updates).length > 0) {
                    updates.updated_at = new Date().toISOString();
                    await supabase
                        .from(TABLE_NAME)
                        .update(updates)
                        .eq('id', existingEmp.id);
                }
            } else {
                // Se nenhum colaborador usa esse email, cria exatamente 1 novo colaborador
                console.log(`[Colaboradores] Criando novo colaborador para o email ${profileEmail} a partir da conta Google...`);
                const effectiveRoles = (profile.roles && profile.roles.length > 0)
                    ? profile.roles
                    : (profile.role ? [profile.role] : ['pending']);
                const primaryRole = profile.role || effectiveRoles[0] || 'pending';
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

export const subscribeToPeople = (collectionName: string, callback: (people: Person[]) => void, includeDeleted = false) => {
    let currentPeople: Person[] = [];

    const fetchAll = async () => {
        if (collectionName === 'employees') {
            await syncMissingEmployeesFromProfiles();
        }

        let peopleQuery = supabase.from(TABLE_NAME).select('*');

        if (!includeDeleted) {
            peopleQuery = peopleQuery.or('deleted.eq.false,deleted.is.null');
        } else {
            peopleQuery = peopleQuery.eq('deleted', true);
        }

        if (collectionName === 'employees') {
            peopleQuery = peopleQuery.or(`person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`);
        } else if (collectionName === 'customers') {
            peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
        } else {
            peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
        }

        const { data: peopleData } = await peopleQuery.order('full_name', { ascending: true });
        let employees: Person[] = (peopleData || []).map(mapFromDB);

        // Deduplicação estrita de 1 colaborador por e-mail
        if (collectionName === 'employees') {
            const uniqueMap = new Map<string, Person>();
            for (const emp of employees) {
                const emailKey = emp.email?.toLowerCase().trim();
                const key = emailKey || String(emp.id);
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, emp);
                } else {
                    // Se já tiver uma entrada, preserva a que tiver telefone ou endereço preenchido
                    const existing = uniqueMap.get(key)!;
                    const existingScore = (existing.phone ? 10 : 0) + (existing.fullAddress?.street ? 10 : 0);
                    const currentScore = (emp.phone ? 10 : 0) + (emp.fullAddress?.street ? 10 : 0);
                    if (currentScore > existingScore) {
                        uniqueMap.set(key, emp);
                    }
                }
            }
            employees = Array.from(uniqueMap.values());
        }

        employees.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        currentPeople = employees;
        callback(currentPeople);
    };

    fetchAll();

    return () => {
        // Realtime desabilitado para economizar conexões e tráfego
    };
};

export const savePerson = async (collectionName: string, person: Person): Promise<Person> => {
    if (person.id) {
        return await updatePerson(collectionName, person.id, person);
    }

    try {
        const dbPerson = mapToDB(collectionName, person);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([dbPerson])
            .select();

        if (error) throw error;
        return mapFromDB(data[0]);
    } catch (error) {
        console.error(`Erro ao salvar em ${collectionName}: `, error);
        throw error;
    }
};

export const savePeopleBatch = async (collectionName: string, people: Partial<Person>[]): Promise<void> => {
    try {
        const dbPeople = people.map(p => mapToDB(collectionName, p));
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert(dbPeople);

        if (error) throw error;
    } catch (error) {
        console.error(`Erro ao salvar lote em ${collectionName}: `, error);
        throw error;
    }
};

export const updatePerson = async (collectionName: string, id: string, personToUpdate: Partial<Person>): Promise<Person> => {
    try {
        const dbPerson = mapToDB(collectionName, personToUpdate);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(dbPerson)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            // If it's a profile update that failed in people table, it's expected if it wasn't there yet.
            // But for a generic update, we should at least not crash.
            return {} as Person;
        }
        return mapFromDB(data[0]);
    } catch (error) {
        console.error(`Erro ao atualizar em ${collectionName}: `, error);
        throw error;
    }
};

export const moveToTrash = async (collectionName: string, id: string): Promise<void> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let result = null;

        if (!isUUID) {
            result = await updatePerson(collectionName, id, {
                deleted: true,
                deletedAt: new Date().toLocaleString('pt-BR'),
                active: false
            });
        }

        // Se não foi encontrado na tabela de 'people' e for funcionário, pode ser um perfil de login
        if ((!result || !result.id) && collectionName === 'employees') {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ position: null })
                .eq('id', id);
            
            if (profileError) throw profileError;
        }
    } catch (error) {
        console.error(`Erro ao mover para lixeira em ${collectionName}: `, error);
        throw error;
    }
};

export const restorePerson = async (collectionName: string, id: string): Promise<void> => {
    try {
        await updatePerson(collectionName, id, {
            deleted: false,
            deletedAt: undefined,
            active: true
        });
    } catch (error) {
        console.error(`Erro ao restaurar em ${collectionName}: `, error);
        throw error;
    }
};

export const permanentDeletePerson = async (collectionName: string, id: string): Promise<void> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let deletedInPeople = false;

        if (!isUUID) {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq('id', id)
                .select();

            if (error) throw error;
            deletedInPeople = data && data.length > 0;
        }

        // Se nada foi deletado e for funcionário, limpar posição no perfil
        if (!deletedInPeople && collectionName === 'employees') {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ position: null })
                .eq('id', id);
            
            if (profileError) throw profileError;
        }
    } catch (error) {
        console.error(`Erro ao deletar permanentemente em ${collectionName}: `, error);
        throw error;
    }
};

export const isPersonRegisteredAs = async (type: string, identifiers: { cpfCnpj?: string, email?: string, phone?: string }): Promise<boolean> => {
    const person = await getPersonByIdentifiers(identifiers);
    return person?.type === type;
};

export const getPersonByIdentifiers = async (
    identifiers: { cpfCnpj?: string, email?: string, phone?: string },
    collectionName?: string
): Promise<Person | null> => {
    const { cpfCnpj, email, phone } = identifiers;
    const conditions = [];
    
    if (cpfCnpj && cpfCnpj.trim() !== '' && cpfCnpj !== '___.___.___-__' && cpfCnpj !== '__.___.___/____-__') {
        conditions.push(`cpf_cnpj.eq.${cpfCnpj}`);
    }
    if (email && email.trim() !== '') {
        conditions.push(`email.eq.${email}`);
    }
    if (phone && phone.trim() !== '' && phone !== '(__) _____-____') {
        conditions.push(`phone.eq.${phone}`);
    }

    if (conditions.length === 0) return null;

    let query = supabase.from(TABLE_NAME).select('*').or(conditions.join(','));

    if (collectionName) {
        query = query.ilike('person_type', `${collectionName.slice(0, -1)}%`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        return null;
    }

    return mapFromDB(data[0]);
};

export const fetchPersons = async (collectionName: string = 'suppliers', includeDeleted = false): Promise<Person[]> => {
    try {
        let peopleQuery = supabase.from(TABLE_NAME).select('*');

        if (!includeDeleted) {
            peopleQuery = peopleQuery.or('deleted.eq.false,deleted.is.null');
        } else {
            peopleQuery = peopleQuery.eq('deleted', true);
        }

        if (collectionName === 'employees') {
            peopleQuery = peopleQuery.or(`person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`);
        } else if (collectionName === 'customers') {
            peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
        } else {
            peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
        }

        const { data: peopleData, error } = await peopleQuery.order('full_name', { ascending: true });
        if (error) throw error;

        return (peopleData || []).map(mapFromDB);
    } catch (e) {
        console.error("Erro ao buscar pessoas em personService:", e);
        return [];
    }
};

export const isEmployeeEmailTaken = async (email: string, excludeId?: string): Promise<boolean> => {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return false;

    let query = supabase
        .from(TABLE_NAME)
        .select('id,email,person_type,deleted')
        .or('deleted.eq.false,deleted.is.null')
        .or(`person_type.ilike.employees,and(position.not.is.null,position.neq."")`)
        .ilike('email', normalized);

    if (excludeId) {
        query = query.neq('id', String(excludeId));
    }

    const { data, error } = await query;
    if (error) {
        console.error("Erro ao verificar email duplicado de colaborador:", error);
        return false;
    }

    return Boolean(data && data.length > 0);
};
