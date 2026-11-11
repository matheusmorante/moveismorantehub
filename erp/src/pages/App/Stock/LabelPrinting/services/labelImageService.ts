import { supabase } from '@/pages/utils/supabaseConfig';
import { LABEL_IMAGE_PAGE_SIZE, type CreateLabelImageInput, type LabelImagePage } from '../types/LabelImage.types';
import {
  labelImageQueryFormSchema, labelImageCreateFormSchema, labelImageDeleteFormSchema,
  labelImageRecordSchema, LabelImageUnconfirmedError,
} from '../../../../../../../shared-utils/labelImageFormSchemas';

const checkWriteError = (error: { code?: string } | null, status?: number): void => {
  if (status === 0) throw new LabelImageUnconfirmedError();
  if (!error) return;
  if (!error.code || error.code === '40003' || error.code === 'PGRST116' || error.code.startsWith('08')) {
    throw new LabelImageUnconfirmedError();
  }
  throw error;
};

export async function fetchLabelImages(options: { sort: 'newest' | 'oldest'; page?: number } = { sort: 'newest' }): Promise<LabelImagePage> {
  const query = labelImageQueryFormSchema.parse(options);
  const ascending = query.sort === 'oldest';
  const from = query.page * LABEL_IMAGE_PAGE_SIZE;
  const to = from + LABEL_IMAGE_PAGE_SIZE - 1;
  if (!Number.isSafeInteger(from) || from < 0 || !Number.isSafeInteger(to)) throw new Error('Página inválida.');
  const { data, error, count } = await supabase
    .from('label_images')
    .select('id,name,image,category', { count: 'exact' })
    .order('created_at', { ascending })
    .order('id', { ascending })
    .range(from, to);

  if (error) throw error;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new Error('Não foi possível confirmar o total de imagens.');
  const rows = labelImageRecordSchema.array().parse(data);
  return { rows, totalCount: count };
}

export async function createLabelImage(input: CreateLabelImageInput): Promise<LabelImage> {
  const values = labelImageCreateFormSchema.parse(input);
  let response;
  try { response = await supabase.from('label_images').insert([values]).select().single(); }
  catch { throw new LabelImageUnconfirmedError(); }
  if (!response || typeof response !== 'object') throw new LabelImageUnconfirmedError();
  const { data, error, status } = response;
  checkWriteError(error, status);
  const record = labelImageRecordSchema.safeParse(data);
  if (!record.success || data.name !== values.name || data.image !== values.image || data.category !== values.category) {
    throw new LabelImageUnconfirmedError();
  }
  return record.data;
}

export async function deleteLabelImage(id: number): Promise<void> {
  const values = labelImageDeleteFormSchema.parse({ id });
  let response;
  try { response = await supabase.from('label_images').delete().eq('id', values.id).select('id'); }
  catch { throw new LabelImageUnconfirmedError(); }
  if (!response || typeof response !== 'object') throw new LabelImageUnconfirmedError();
  const { data, error, status } = response;
  checkWriteError(error, status);
  if (Array.isArray(data) && data.length === 0) throw new Error('A imagem não está mais disponível. Recarregue a biblioteca.');
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.id !== values.id) throw new LabelImageUnconfirmedError();
}
