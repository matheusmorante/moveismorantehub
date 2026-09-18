import { supabase } from '@/pages/utils/supabaseConfig';
import Person from "../../types/person.type";
import { TABLE_NAME, mapFromDB } from './personMapper';

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

export const isSupplierNameTaken = async (name: string, excludeId?: string): Promise<boolean> => {
    const normalized = name?.trim().toLowerCase();
    if (!normalized) return false;

    const { data } = await supabase
        .from(TABLE_NAME)
        .select('id, full_name, nickname, social_name')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');

    if (!data) return false;

    return data.some((p: any) => {
        if (excludeId && String(p.id) === String(excludeId)) return false;
        const pName = (p.full_name || p.nickname || p.social_name || '').trim().toLowerCase();
        return pName === normalized;
    });
};
