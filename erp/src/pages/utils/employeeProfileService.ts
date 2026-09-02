import Person from "../types/person.type";
import { UserRole } from "@/context/AuthContext";
import { getPrimaryRole } from "./accessRoles";
import { supabase } from "./supabaseConfig";

export type UserProfile = {
    id: string;
    email: string;
    full_name: string | null;
    position: string | null;
    role: UserRole | null;
    roles?: UserRole[] | null;
};

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || "";

export const getUserProfileByEmail = async (email?: string): Promise<UserProfile | null> => {
    return getUserProfileByIdOrEmail(undefined, email);
};

export const getUserProfileByIdOrEmail = async (id?: string, email?: string): Promise<UserProfile | null> => {
    if (id) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
            const { data } = await supabase
                .from("profiles")
                .select("id,email,full_name,position,role,roles")
                .eq("id", id)
                .maybeSingle();
            if (data) return data as UserProfile;
        }
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,position,role,roles")
        .ilike("email", normalizedEmail)
        .maybeSingle();

    if (error) throw error;
    return data as UserProfile;
};

export const toEmployeeFromProfile = (profile: UserProfile): Person => {
    const effectiveRoles: UserRole[] = (profile.roles && profile.roles.length > 0)
        ? profile.roles
        : (profile.role ? [profile.role] : ['pending']);

    return {
        id: profile.id,
        personType: "PF",
        fullName: profile.full_name || profile.email,
        email: profile.email,
        position: profile.position || "",
        role: profile.role || getPrimaryRole(effectiveRoles),
        roles: effectiveRoles,
        active: true,
        isDraft: false,
        deleted: false,
        fullAddress: {
            cep: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            housingType: "",
            complement: "",
            mapsUrl: "",
            observation: ""
        },
        type: "employees",
    };
};

export const saveEmployeeInProfile = async (profile: UserProfile, employee: Partial<Person>): Promise<Person> => {
    const updatePayload: Record<string, any> = {
        position: employee.position?.trim() || null,
    };

    const rolesToSave: UserRole[] = (employee.roles && employee.roles.length > 0)
        ? employee.roles
        : (employee.role ? [employee.role] : (profile.roles || ['seller']));

    const primaryRole = employee.role || getPrimaryRole(rolesToSave);

    updatePayload.roles = rolesToSave;
    updatePayload.role = primaryRole;

    if (employee.fullName?.trim()) {
        updatePayload.full_name = employee.fullName.trim();
    }

    const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

    if (error) throw error;

    return toEmployeeFromProfile({
        ...profile,
        position: employee.position?.trim() || null,
        role: primaryRole,
        roles: rolesToSave,
        full_name: employee.fullName?.trim() || profile.full_name
    });
};
