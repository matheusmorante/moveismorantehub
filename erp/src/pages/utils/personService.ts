import { supabase } from '@/pages/utils/supabaseConfig';
import Person from "../types/person.type";

const TABLE_NAME = "people";

const mapToDB = (collectionName: string, person: Partial<Person>) => {
    const p = person as any;

    // Ensure address is saved as an object if possible
    let addressValue = p.fullAddress || p.address;
    if (typeof addressValue === 'string' && addressValue.trim().startsWith('{')) {
        try {
            addressValue = JSON.parse(addressValue);
        } catch (e) {
            // keep as string
        }
    }

    return {
        person_type: p.type || collectionName,
        full_name: p.fullName,
        nickname: p.nickname || p.tradeName,
        cpf_cnpj: p.cpfCnpj,
        rg_ie: p.rgIe,
        email: p.email,
        phone: p.phone,
        address: addressValue,
        observation: p.observation,
        position: p.position,
        active: p.active,
        is_draft: p.isDraft ?? false,
        deleted: p.deleted,
        deleted_at: person.deletedAt ? new Date().toISOString() : null, // Simplification
        updated_at: new Date().toISOString()
    };
};

const mapFromDB = (data: any): Person => {
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
        fullName: data.full_name,
        nickname: data.nickname,
        cpfCnpj: data.cpf_cnpj,
        rgIe: data.rg_ie,
        email: data.email,
        phone: data.phone,
        address: parsedAddress,
        fullAddress: typeof parsedAddress === 'object' && parsedAddress !== null ? parsedAddress : { street: parsedAddress || '' },
        observation: data.observation,
        active: data.active,
        isDraft: data.is_draft,
        deleted: data.deleted,
        deletedAt: data.deleted_at,
        position: data.position,
        type: data.person_type,
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
            // Use "not is_draft eq true" to capture both false AND null (imported records)
            peopleQuery = peopleQuery
                .not('is_draft', 'eq', true)
                .not('deleted', 'eq', true);
        } else {
            // For trash view: show only deleted records
            peopleQuery = peopleQuery.eq('deleted', true);
        }

        if (collectionName === 'employees') {
            peopleQuery = peopleQuery.or(`person_type.eq.employees,and(position.not.is.null,position.neq."")`);
        } else if (collectionName === 'customers') {
            // "fornecedores podem ser clientes" - "employees" removed as per "apenas fornecedores podem estar na lista de clientes"
            peopleQuery = peopleQuery.or(`person_type.eq.customers,person_type.eq.suppliers`);
        } else {
            // "clientes nao podem ser fornecedores" (collectionName === 'suppliers')
            peopleQuery = peopleQuery.eq('person_type', collectionName);
        }

        const { data: peopleData } = await peopleQuery.order('full_name', { ascending: true });
        let employees: Person[] = (peopleData || []).map(mapFromDB);

        if (collectionName === 'employees') {
            // Also fetch from profiles
            const { data: profilesData } = await supabase.from('profiles').select('*').not('position', 'is', null).neq('position', '');
            if (profilesData) {
                const profileEmployees = profilesData.map(mapProfileToPerson);
                // Merge without duplicates (by email if possible, or ID)
                const existingEmails = new Set(employees.map(e => e.email?.toLowerCase()).filter(Boolean));
                profileEmployees.forEach(pe => {
                    if (!pe.email || !existingEmails.has(pe.email.toLowerCase())) {
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
