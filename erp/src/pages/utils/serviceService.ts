import { supabase } from '@/pages/utils/supabaseConfig';
import Service from '../types/service.type';
import { serviceFormSchema, serviceDraftSchema, servicePatchSchema } from '../../../../shared-utils/serviceFormSchema';

const TABLE_NAME = 'services';

const mapFromDB = (data: any): Service => ({
  ...data.service_data,
  id: String(data.id),
  isDraft: data.is_draft,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const confirmedService = (data: any, expectedId?: string): Service => {
  if (data?.id === undefined || data.id === null || String(data.id) === ''
    || (expectedId !== undefined && String(data.id) !== expectedId)
    || !data.service_data || typeof data.service_data !== 'object' || Array.isArray(data.service_data)) throw { uncertain: true };
  return mapFromDB(data);
};
const throwWriteError = (error: any): never => {
  if (!error?.code || error.code === 'PGRST116' || error.code === '40003' || error.code.startsWith('08')) throw { uncertain: true };
  throw error;
};

export const subscribeToServices = (callback: (services: Service[]) => void) => {
  let currentServices: Service[] = [];

  const fetchAll = () => {
    supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('is_draft', false)
      .order('id', { ascending: false })
      .then(({ data, error }: { data: any; error: any }) => {
        if (data && !error) {
          currentServices = data.map(mapFromDB);
          callback(currentServices);
        } else if (error) {
          console.error('Erro ao buscar serviços iniciais:', error);
          callback([]);
        }
      });
  };

  fetchAll();

  return () => {
    // Realtime desabilitado para economizar conexões e tráfego
  };
};

export const saveService = async (service: Service): Promise<Service> => {
  const flags = servicePatchSchema.parse(service);
  const values = (flags.isDraft ? serviceDraftSchema : serviceFormSchema).parse(flags);
  if (service.id) {
    return await updateService(service.id, service);
  }

  const serviceToSave = { ...service, ...values };
  delete serviceToSave.isDraft;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([
      {
        service_data: serviceToSave,
        is_draft: service.isDraft ?? false,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throwWriteError(error);
  return confirmedService(data);
};

export const updateService = async (
  id: string,
  serviceToUpdate: Partial<Service>
): Promise<Service> => {
  const patch = servicePatchSchema.parse(serviceToUpdate);
  if (typeof id !== 'string' || !id.trim()) throw new Error('Serviço não encontrado.');
  const { data: current, error: lookupError } = await supabase
    .from(TABLE_NAME)
    .select('service_data,is_draft')
    .eq('id', id)
    .single();
  if (lookupError) throw lookupError;
  if (!current?.service_data || typeof current.service_data !== 'object' || Array.isArray(current.service_data)) throw new Error('Serviço não encontrado.');
  const merged = { ...current.service_data, ...patch };
  const isDraftVal = patch.isDraft;
  const values = ((isDraftVal ?? current.is_draft) ? serviceDraftSchema : serviceFormSchema).parse(merged);
  Object.assign(merged, values);
  delete merged.id;
  delete merged.isDraft;

  const updateData: any = {
    service_data: merged,
    updated_at: new Date().toISOString(),
  };
  if (isDraftVal !== undefined) updateData.is_draft = isDraftVal;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throwWriteError(error);
  return confirmedService(data, id);
};

export const moveToTrash = async (id: string): Promise<void> => {
  try {
    await updateService(id, {
      deleted: true,
      active: false,
    });
  } catch (error) {
    console.error('Erro ao mover serviço para lixeira: ', error);
    throw error;
  }
};

export const restoreService = async (id: string): Promise<void> => {
  try {
    await updateService(id, {
      deleted: false,
      active: true,
    });
  } catch (error) {
    console.error('Erro ao restaurar o serviço: ', error);
    throw error;
  }
};

export const permanentDeleteService = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar permanentemente o serviço: ', error);
    throw error;
  }
};
