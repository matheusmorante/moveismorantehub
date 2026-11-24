import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  getPasswordAuthErrorMessage,
  isCurrentPasswordRequired,
  isPasswordReauthenticationRequired,
  requestPasswordChangeReauthentication,
  updateAuthenticatedPassword,
} from '@/services/authPasswordRecovery';

export interface ProfileUpdateInput {
  fullName: string;
  position: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

export type PasswordUpdateOutcome =
  | { status: 'updated' }
  | { status: 'reauth_sent' }
  | { status: 'current_password_required' }
  | { status: 'error'; message: string };

export function getProfileErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export async function updateProfileRecord(
  userId: string | undefined,
  data: ProfileUpdateInput,
  client: SupabaseClient = supabase,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from('profiles')
    .update({
      full_name: data.fullName,
      position: data.position,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      updated_at: now,
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function uploadProfileAvatar(
  userId: string,
  file: File,
  client: SupabaseClient = supabase,
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}.${fileExt}`;

  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = client.storage.from('avatars').getPublicUrl(filePath);

  // Persist the avatar in the authenticated user's metadata. The profiles
  // table intentionally does not own this field.
  const { error: updateError } = await client.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  if (updateError) throw updateError;
  return publicUrl;
}

export async function changeProfilePassword(params: {
  password: string;
  reauthRequired: boolean;
  reauthenticationCode?: string;
  currentPasswordRequired: boolean;
  currentPassword?: string;
  client?: SupabaseClient;
}): Promise<PasswordUpdateOutcome> {
  const client = params.client ?? supabase;
  const { error } = await updateAuthenticatedPassword(
    client,
    params.password,
    params.reauthRequired ? params.reauthenticationCode : undefined,
    params.currentPasswordRequired ? params.currentPassword : undefined,
  );

  if (error && !params.reauthRequired && isPasswordReauthenticationRequired(error)) {
    const { error: reauthError } = await requestPasswordChangeReauthentication(client);
    if (reauthError) {
      return {
        status: 'error',
        message: getPasswordAuthErrorMessage(reauthError, 'reauth-send'),
      };
    }
    return { status: 'reauth_sent' };
  }

  if (error && !params.currentPasswordRequired && isCurrentPasswordRequired(error)) {
    return { status: 'current_password_required' };
  }

  if (error) {
    return {
      status: 'error',
      message: getPasswordAuthErrorMessage(
        error,
        params.reauthRequired ? 'recovery-verify' : 'password-update',
      ),
    };
  }

  return { status: 'updated' };
}

export async function resendProfileReauthCode(
  client: SupabaseClient = supabase,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await requestPasswordChangeReauthentication(client);
  if (error) {
    return { ok: false, message: getPasswordAuthErrorMessage(error, 'reauth-send') };
  }
  return { ok: true };
}
