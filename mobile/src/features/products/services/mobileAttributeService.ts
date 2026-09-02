import { supabase } from '../../../services/supabaseClient';

export interface MobileAttributeValue {
  id: string;
  value: string;
  attribute_id: string;
}

export interface MobileAttribute {
  id: string;
  name: string;
  active?: boolean;
  options: MobileAttributeValue[];
}

export const fetchMobileAttributes = async (): Promise<MobileAttribute[]> => {
  try {
    const [attrRes, valRes] = await Promise.all([
      supabase.from('attributes').select('*').order('name', { ascending: true }),
      supabase.from('attribute_values').select('*'),
    ]);

    if (attrRes.error) throw attrRes.error;
    const values = valRes.data || [];

    return (attrRes.data || []).map((attr: any) => ({
      id: String(attr.id),
      name: attr.name,
      active: attr.active ?? true,
      options: values
        .filter((v: any) => String(v.attribute_id) === String(attr.id))
        .map((v: any) => ({
          id: String(v.id),
          value: v.value,
          attribute_id: String(v.attribute_id),
        })),
    }));
  } catch (err) {
    console.error('[MobileAttributeService] Erro ao buscar atributos:', err);
    return [];
  }
};

export const saveMobileAttribute = async (name: string, id?: string): Promise<string | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (id) {
    const { error } = await supabase.from('attributes').update({ name: trimmed }).eq('id', id);
    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase.from('attributes').insert([{ name: trimmed }]).select('id').single();
  if (error) throw error;
  return data?.id || null;
};

export const deleteMobileAttribute = async (id: string): Promise<void> => {
  await supabase.from('attribute_values').delete().eq('attribute_id', id);
  const { error } = await supabase.from('attributes').delete().eq('id', id);
  if (error) throw error;
};

export const addMobileAttributeValue = async (attributeId: string, value: string): Promise<void> => {
  const trimmed = value.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from('attribute_values')
    .insert([{ attribute_id: attributeId, value: trimmed }]);
  if (error) throw error;
};

export const deleteMobileAttributeValue = async (valId: string): Promise<void> => {
  const { error } = await supabase.from('attribute_values').delete().eq('id', valId);
  if (error) throw error;
};
