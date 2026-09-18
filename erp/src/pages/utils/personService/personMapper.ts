import Person from "../../types/person.type";

export const TABLE_NAME = "people";

export const mapToDB = (collectionName: string, person: Partial<Person>) => {
    const p = person as any;
    const dbObj: any = {};

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

export const mapFromDB = (data: any): Person => {
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
        employeeCode: data.employee_code ?? undefined,
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
