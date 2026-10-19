import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import type { Profile, UserRole } from './auth.types';

export interface SyncEmployeeParams {
  userEmail: string;
  googleName?: string;
  profileData: Profile;
  isMaster: boolean;
  supabaseClient?: typeof supabase;
}

/**
 * Garante que o usuário autenticado sincronize seu registro de colaborador
 * na tabela people (1 registro por e-mail), sem duplicidades.
 */
export async function syncEmployeeRecord({
  userEmail,
  googleName,
  profileData,
  isMaster,
  supabaseClient = supabase,
}: SyncEmployeeParams): Promise<void> {
  if (!userEmail || !profileData) return;

  try {
    const { data: existingEmps } = await withTimeout(
      supabaseClient
        .from('people')
        .select('id,email,full_name')
        .eq('person_type', 'employees')
        .eq('deleted', false)
        .ilike('email', userEmail)
        .limit(1),
      4000,
      { data: null, error: null } as any,
      'people.select'
    );

    const empName =
      googleName ||
      profileData?.full_name ||
      userEmail.split('@')[0] ||
      (isMaster ? 'Matheus Morante' : 'Colaborador');

    if (existingEmps && existingEmps.length > 0) {
      // Colaborador já existe com esse e-mail: atualiza se nome não preenchido ou genérico
      const primaryEmp = existingEmps[0];
      if (
        googleName &&
        (!primaryEmp.full_name || primaryEmp.full_name === userEmail.split('@')[0])
      ) {
        await supabaseClient
          .from('people')
          .update({
            full_name: empName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', primaryEmp.id);
      }
    } else {
      // Nenhum colaborador usa esse e-mail: cria exatamente 1 colaborador inicial
      console.log(
        '[Auth] Criando colaborador para novo usuário logado via Google:',
        userEmail
      );
      const defaultRole: UserRole = isMaster ? 'administrator' : (profileData?.role || 'pending');
      const defaultRoles: UserRole[] = isMaster
        ? ['administrator']
        : profileData?.roles?.length
          ? profileData.roles
          : [defaultRole];

      await supabaseClient.from('people').insert([
        {
          person_type: 'employees',
          person_type_pf_pj: 'PF',
          full_name: empName,
          email: userEmail,
          position: profileData?.position || 'Sem Cargo Definido',
          active: true,
          is_draft: false,
          deleted: false,
          address: {
            noAddress: true,
            street: '',
            city: '',
            state: '',
            cep: '',
            role: defaultRole,
            roles: defaultRoles,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  } catch (empErr) {
    console.warn('[Auth] Aviso ao sincronizar colaborador para usuário:', empErr);
  }
}
