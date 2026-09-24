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
  dataType?: string;
  isGloballyRequired?: boolean;
  unit?: string;
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
      dataType: attr.data_type || attr.dataType || 'text_short',
      isGloballyRequired: Boolean(attr.is_globally_required ?? attr.isGloballyRequired),
      unit: attr.unit || '',
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

export const saveMobileAttribute = async (name: string, id?: string, metadata?: Partial<MobileAttribute>): Promise<string | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (id) {
    const { error } = await supabase.from('attributes').update({
      name: trimmed,
      ...(metadata?.dataType ? { data_type: metadata.dataType } : {}),
      ...(metadata?.unit !== undefined ? { unit: metadata.unit || null } : {}),
      ...(metadata?.isGloballyRequired !== undefined ? { is_globally_required: metadata.isGloballyRequired } : {}),
    }).eq('id', id);
    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase.from('attributes').insert([{
    name: trimmed,
    data_type: metadata?.dataType || 'text_short',
    unit: metadata?.unit || null,
    is_globally_required: Boolean(metadata?.isGloballyRequired),
    active: metadata?.active !== false,
  }]).select('id').single();
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
