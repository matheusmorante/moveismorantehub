import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';

export async function handleListarCategoriasECaracteristicasProduto(
  supabase: SupabaseClient,
  _args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  try {
    const { data: catRows, error } = await supabase
      .from('categories')
      .select('name, type')
      .in('type', ['category', 'environment'])
      .order('name', { ascending: true })
      .limit(50);
    if (error) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        erro: 'Não consegui carregar as categorias agora. Tente novamente mais tarde.',
      };
    }

    const categorias = (catRows || [])
      .filter((row: any) => row.type === 'category')
      .map((row: any) => ({ nome: row.name }));
    const ambientes = (catRows || [])
      .filter((row: any) => row.type === 'environment')
      .map((row: any) => row.name);

    return {
      success: true,
      categorias,
      ambientesPrincipais: ambientes,
    };
  } catch {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      erro: 'Não consegui carregar as categorias agora. Tente novamente mais tarde.',
    };
  }
}
