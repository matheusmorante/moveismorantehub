import { supabase } from '@/pages/utils/supabaseConfig';
import type { CreateLabelImageInput, LabelImage } from '../types/LabelImage.types';

export async function fetchLabelImages(): Promise<LabelImage[]> {
  const { data, error } = await supabase
    .from('label_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createLabelImage(input: CreateLabelImageInput): Promise<LabelImage> {
  const { data, error } = await supabase
    .from('label_images')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('O banco não retornou a imagem de etiqueta criada.');
  return data;
}

export async function deleteLabelImage(id: number): Promise<void> {
  const { error } = await supabase.from('label_images').delete().eq('id', id);
  if (error) throw error;
}
