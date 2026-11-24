import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getProfileErrorMessage,
  updateProfileRecord,
  uploadProfileAvatar,
} from './profileService';

describe('profileService', () => {
  it('atualiza os campos esperados no registro de profiles', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;

    await updateProfileRecord(
      'user-1',
      {
        fullName: 'Maria',
        position: 'Gerente',
        phone: '41999999999',
        address: 'Rua 1',
        city: 'Colombo',
        state: 'PR',
      },
      client,
    );

    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Maria',
        position: 'Gerente',
        city: 'Colombo',
        state: 'PR',
      }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('faz upload no bucket avatars e salva avatar_url nos metadados Auth', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/a.png' } });
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn().mockReturnValue({ upload, getPublicUrl }) },
      auth: { updateUser },
    } as unknown as SupabaseClient;

    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    const url = await uploadProfileAvatar('user-1', file, client);

    expect(url).toBe('https://cdn.example/a.png');
    expect(upload).toHaveBeenCalledWith('user-1.png', file, { upsert: true });
    expect(updateUser).toHaveBeenCalledWith({ data: { avatar_url: 'https://cdn.example/a.png' } });
  });

  it('extrai mensagem de erro segura sem usar any', () => {
    expect(getProfileErrorMessage(new Error('Falha real'), 'Fallback')).toBe('Falha real');
    expect(getProfileErrorMessage({ message: 'Erro Supabase' }, 'Fallback')).toBe('Erro Supabase');
    expect(getProfileErrorMessage('unexpected', 'Fallback')).toBe('Fallback');
  });
});
