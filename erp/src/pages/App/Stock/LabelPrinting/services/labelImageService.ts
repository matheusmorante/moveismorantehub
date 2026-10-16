import { supabase } from '@/pages/utils/supabaseConfig';
import type { CreateLabelImageInput, LabelImage } from '../types/LabelImage.types';
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

export async function fetchLabelImages(options: { sort: 'newest' | 'oldest' } = { sort: 'newest' }): Promise<LabelImage[]> {
  const query = labelImageQueryFormSchema.parse(options);
  const { data, error } = await supabase
    .from('label_images')
    .select('*')
    .order('created_at', { ascending: query.sort === 'oldest' });

  if (error) throw error;
  return labelImageRecordSchema.array().parse(data);
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
