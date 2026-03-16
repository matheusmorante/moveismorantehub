import { supabase } from '@/pages/utils/supabaseConfig';
import Service from "../types/service.type";

const TABLE_NAME = "services";

const mapFromDB = (data: any): Service => ({
    id: String(data.id),
    ...data.service_data,
    isDraft: data.is_draft,
    createdAt: data.created_at,
    updatedAt: data.updated_at
});

export const subscribeToServices = (callback: (services: Service[]) => void) => {
    // Initial fetch
    supabase.from(TABLE_NAME)
        .select('*')
        .eq('is_draft', false)
        .order('id', { ascending: false })
        .then(({ data, error }: { data: any, error: any }) => {
            if (data && !error) {
                callback(data.map(mapFromDB));
            } else if (error) {
                console.error("Erro ao buscar serviços iniciais:", error);
                callback([]);
            }
        });

    const channel = supabase.channel('services_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            supabase.from(TABLE_NAME)
                .select('*')
                .eq('is_draft', false)
                .order('id', { ascending: false })
                .then(({ data }: { data: any }) => {
                    if (data) callback(data.map(mapFromDB));
                });
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const saveService = async (service: Service): Promise<Service> => {
    if (service.id) {
        return await updateService(service.id, service);
    }

    try {
        const serviceToSave = { ...service };
        delete serviceToSave.isDraft;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                service_data: serviceToSave,
                is_draft: service.isDraft ?? false,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return mapFromDB(data);
    } catch (error) {
        console.error("Erro ao salvar o serviço: ", error);
        throw error;
    }
};

export const updateService = async (id: string, serviceToUpdate: Partial<Service>): Promise<Service> => {
    try {
        const { data: current } = await supabase
            .from(TABLE_NAME)
            .select('service_data')
            .eq('id', id)
            .single();

        const merged = { ...(current?.service_data || {}), ...serviceToUpdate };
        const isDraftVal = serviceToUpdate.isDraft;
        delete merged.id;
        delete merged.isDraft;

        const updateData: any = {
            service_data: merged,
            updated_at: new Date().toISOString()
        };
        if (isDraftVal !== undefined) updateData.is_draft = isDraftVal;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapFromDB(data);
    } catch (error) {
        console.error("Erro ao atualizar o serviço: ", error);
        throw error;
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        await updateService(id, {
            deleted: true,
            active: false
        });
    } catch (error) {
        console.error("Erro ao mover serviço para lixeira: ", error);
        throw error;
    }
};

export const restoreService = async (id: string): Promise<void> => {
    try {
        await updateService(id, {
            deleted: false,
            active: true
        });
    } catch (error) {
        console.error("Erro ao restaurar o serviço: ", error);
        throw error;
    }
};

export const permanentDeleteService = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao deletar permanentemente o serviço: ", error);
        throw error;
    }
};
