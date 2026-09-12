import { describe, it, expect } from 'vitest';

interface TeamLocationRecord {
  user_id: string;
  user_name: string;
  role?: string;
  latitude: number;
  longitude: number;
  is_gps_active: boolean;
  is_delivering: boolean;
  active_order_id?: string | null;
  active_order_code?: string | null;
}

/**
 * Função pura de filtragem de membros visíveis da equipe
 * Espelha a regra implementada em fetchTeamLocations
 */
function filterVisibleTeamMembers(
  records: TeamLocationRecord[],
  currentUserId?: string
): TeamLocationRecord[] {
  return records.filter((row) => {
    // Não exibe o próprio usuário logado (ele usa seu próprio GPS local)
    if (currentUserId && row.user_id === currentUserId) return false;

    // PRIVACIDADE OPERACIONAL: Somente visível se estiver com entrega em andamento (is_delivering = true)
    if (!row.is_delivering) return false;

    // Coordenadas válidas
    return (
      typeof row.latitude === 'number' &&
      typeof row.longitude === 'number' &&
      !isNaN(row.latitude) &&
      !isNaN(row.longitude) &&
      (row.latitude !== 0 || row.longitude !== 0)
    );
  });
}

describe('teamLocationPrivacy - Regra de Privacidade e Visibilidade da Equipe', () => {
  const mockMembers: TeamLocationRecord[] = [
    {
      user_id: 'user-1',
      user_name: 'Motorista Carlos',
      latitude: -25.352,
      longitude: -49.169,
      is_gps_active: true,
      is_delivering: true,
      active_order_id: 'order-101',
      active_order_code: '#002540',
    },
    {
      user_id: 'user-2',
      user_name: 'Montador Lucas',
      latitude: -25.360,
      longitude: -49.175,
      is_gps_active: true,
      is_delivering: false, // Não está em entrega ativa (no depósito ou em pausa)
      active_order_id: null,
      active_order_code: null,
    },
    {
      user_id: 'user-3',
      user_name: 'Entregador Marcos',
      latitude: -25.340,
      longitude: -49.180,
      is_gps_active: true,
      is_delivering: true,
      active_order_id: 'order-102',
      active_order_code: '#002541',
    },
  ];

  it('deve ocultar membros que NÃO estão com entrega ativa (is_delivering = false)', () => {
    const visible = filterVisibleTeamMembers(mockMembers, 'user-99');
    expect(visible.length).toBe(2);
    expect(visible.find(m => m.user_name === 'Montador Lucas')).toBeUndefined();
    expect(visible.map(m => m.user_name)).toEqual(['Motorista Carlos', 'Entregador Marcos']);
  });

  it('não deve exibir o próprio usuário logado na lista de outros membros', () => {
    const visible = filterVisibleTeamMembers(mockMembers, 'user-1');
    expect(visible.length).toBe(1);
    expect(visible[0].user_name).toBe('Entregador Marcos');
  });

  it('quando o motorista finaliza a entrega (is_delivering = false), ele deixa de ser visível', () => {
    const updated = mockMembers.map(m => m.user_id === 'user-1' ? { ...m, is_delivering: false } : m);
    const visible = filterVisibleTeamMembers(updated, 'user-99');
    expect(visible.length).toBe(1);
    expect(visible[0].user_name).toBe('Entregador Marcos');
  });
});
