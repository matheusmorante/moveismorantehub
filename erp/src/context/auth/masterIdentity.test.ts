import { describe, it, expect } from 'vitest';
import { isMasterEmail, createMasterProfile } from './masterIdentity';

describe('masterIdentity', () => {
  describe('isMasterEmail', () => {
    it('recognizes primary master emails', () => {
      expect(isMasterEmail('matheusmorante002@gmail.com')).toBe(true);
      expect(isMasterEmail('matheusmorante0002@gmail.com')).toBe(true);
      expect(isMasterEmail('matheusmroante0002@gmail.com')).toBe(true);
    });

    it('handles uppercase and trailing whitespace', () => {
      expect(isMasterEmail(' MATHEUSMORANTE002@GMAIL.COM ')).toBe(true);
      expect(isMasterEmail('MatheusMorante0002@Gmail.com')).toBe(true);
    });

    it('recognizes emails containing both matheus and morante', () => {
      expect(isMasterEmail('matheus.morante@company.com')).toBe(true);
      expect(isMasterEmail('contato-matheus-morante@hub.com')).toBe(true);
    });

    it('rejects non-master emails', () => {
      expect(isMasterEmail('joao.silva@example.com')).toBe(false);
      expect(isMasterEmail('matheus@example.com')).toBe(false);
      expect(isMasterEmail('morante@example.com')).toBe(false);
      expect(isMasterEmail('')).toBe(false);
    });
  });

  describe('createMasterProfile', () => {
    it('creates administrator profile with default full_name', () => {
      const profile = createMasterProfile('master-user-id', 'matheusmorante002@gmail.com');
      expect(profile).toEqual({
        id: 'master-user-id',
        email: 'matheusmorante002@gmail.com',
        role: 'administrator',
        roles: ['administrator'],
        full_name: 'Matheus Morante',
      });
    });

    it('preserves googleName if provided', () => {
      const profile = createMasterProfile(
        'master-user-id',
        'matheusmorante002@gmail.com',
        'Matheus M. Morante'
      );
      expect(profile.full_name).toBe('Matheus M. Morante');
    });
  });
});
