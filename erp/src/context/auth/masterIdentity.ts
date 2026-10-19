import type { Profile } from './auth.types';

export function isMasterEmail(emailStr: string): boolean {
  const email = (emailStr || '').toLowerCase().trim();
  return (
    email === 'matheusmorante002@gmail.com' ||
    email === 'matheusmorante0002@gmail.com' ||
    email === 'matheusmroante0002@gmail.com' ||
    (email.includes('matheus') && email.includes('morante'))
  );
}

export function createMasterProfile(
  userId: string,
  email: string,
  googleName?: string
): Profile {
  return {
    id: userId,
    email: email || '',
    role: 'administrator',
    roles: ['administrator'],
    full_name: googleName || 'Matheus Morante',
  };
}
