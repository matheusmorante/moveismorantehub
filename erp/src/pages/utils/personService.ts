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

    // Special handling for address
    if (p.fullAddress || p.address) {
        let addressVal = p.fullAddress || p.address;
        if (typeof addressVal === 'string' && addressVal.trim().startsWith('{')) {
            try {
                addressVal = JSON.parse(addressVal);
            } catch (e) {
                // keep as string
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
        observation: data.observation || '',
        active: data.active ?? true,
        isDraft: data.is_draft ?? false,
        deleted: data.deleted ?? false,
        deletedAt: data.deleted_at,
        position: data.position || '',
        type: data.person_type as any,
        leadTime: data.lead_time || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
    return p as Person;
};

const mapProfileToPerson = (prof: any): Person => {
    return {
        id: prof.id,
        fullName: prof.full_name || '',
        email: prof.email || '',
        position: prof.position || '',
        active: true,
        isDraft: false,
        fullAddress: { street: '' },
        deleted: false
    } as any;
};

export const subscribeToPeople = (collectionName: string, callback: (people: Person[]) => void, includeDeleted = false) => {
    const fetchAll = async () => {
        let peopleQuery = supabase.from(TABLE_NAME).select('*');

        if (!includeDeleted) {
            // Show everything (active, inactive, drafts) except deleted
            // Note: or(deleted.eq.false,deleted.is.null) is safer for items migrated without this flag
            peopleQuery = peopleQuery.or('deleted.eq.false,deleted.is.null');
        } else {
            // For trash view: show only deleted records
            peopleQuery = peopleQuery.eq('deleted', true);
        }

        if (collectionName === 'employees') {
            peopleQuery = peopleQuery.or(`person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`);
        } else if (collectionName === 'customers') {
            // "fornecedores podem ser clientes"
            peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.suppliers`);
        } else {
            // "clientes nao podem ser fornecedores" (this is for 'suppliers')
            // Using ilike for case-insensitivity and or for singular/plural support
            peopleQuery = peopleQuery.or(`person_type.ilike.${collectionName},person_type.ilike.supplier`);
        }

        const { data: peopleData } = await peopleQuery.order('full_name', { ascending: true });
        let employees: Person[] = (peopleData || []).map(mapFromDB);

        if (collectionName === 'employees') {
            // Also fetch from profiles
            const { data: profilesData } = await supabase.from('profiles').select('*').not('position', 'is', null).neq('position', '');
            if (profilesData) {
                const profileEmployees = profilesData.map(mapProfileToPerson);

                // Fetch ALL emails from 'people' table (including those in lixeira) to prevent duplicates and prevent showing deleted logins
                const { data: allPeopleEmails } = await supabase.from(TABLE_NAME).select('email, deleted');
                const emailsToExclude = new Set<string>();
                
                if (allPeopleEmails) {
                    (allPeopleEmails as any[]).forEach(row => {
                        if (row.email) {
                            // If we are showing active list (includeDeleted=false), we exclude any email that is in people table (active or deleted)
                            // If we are showing trash (includeDeleted=true), we only exclude if it's already in the 'employees' list (which are the trashed ones)
                            emailsToExclude.add(row.email.toLowerCase());
                        }
                    });
                }

                // If NOT viewing trash, exclude any email already listed (active) OR any profile that has a persona in 'people' table (to avoid duplication or showing deleted ones)
                profileEmployees.forEach((pe: Person) => {
                    if (pe.email && !emailsToExclude.has(pe.email.toLowerCase())) {
                        employees.push(pe);
                    }
                });
            }
        }

        // Sort final list
        employees.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        callback(employees);
    };

    fetchAll();

    const channel = supabase.channel(`${collectionName}_mixed_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => fetchAll())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            if (collectionName === 'employees') fetchAll();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
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
        await updatePerson(collectionName, id, {
            deleted: true,
            deletedAt: new Date().toLocaleString('pt-BR'),
            active: false
        });
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
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error(`Erro ao deletar permanentemente em ${collectionName}: `, error);
        throw error;
    }
};

export const isPersonRegisteredAs = async (type: string, identifiers: { cpfCnpj?: string, email?: string, phone?: string }): Promise<boolean> => {
    const person = await getPersonByIdentifiers(identifiers);
    return person?.type === type;
};

export const getPersonByIdentifiers = async (identifiers: { cpfCnpj?: string, email?: string, phone?: string }): Promise<Person | null> => {
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

    const { data, error } = await supabase.from(TABLE_NAME).select('*').or(conditions.join(','));

    if (error || !data || data.length === 0) {
        return null;
    }

    return mapFromDB(data[0]);
};
