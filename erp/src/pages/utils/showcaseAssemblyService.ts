import { supabase } from '@/pages/utils/supabaseConfig';

const TABLE_NAME = 'showcase_assemblies';

export interface ShowcaseAssembly {
    id?: string;
    description: string;
    quantity: number;
    date: string;
    status: 'pending' | 'completed';
    observation?: string;
    created_at?: string;
    deleted?: boolean;
}

export const getShowcaseAssemblies = async () => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('deleted', false)
        .order('date', { ascending: false });

    if (error) {
        // Tabela pode não existir ainda (404 do PostgREST)
        if (error.code === '42P01' || error.message?.includes('does not exist') || (error as any)?.details?.includes('does not exist')) {
            console.warn(`Tabela '${TABLE_NAME}' não existe. Retornando lista vazia.`);
            return [] as ShowcaseAssembly[];
        }
        throw error;
    }
    return data as ShowcaseAssembly[];
};

export const saveShowcaseAssembly = async (assembly: ShowcaseAssembly) => {
    if (assembly.id) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(assembly)
            .eq('id', assembly.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert(assembly);
        if (error) throw error;
    }
};

export const deleteShowcaseAssembly = async (id: string) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ deleted: true })
        .eq('id', id);
    if (error) throw error;
};
