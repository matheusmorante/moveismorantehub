import { supabase } from './supabaseClient';
import {
  evaluateDisconnectedState,
  DISCONNECT_THRESHOLD_MS,
  formatTeamMemberStatusLabel,
} from '../features/logistics/domain/teamLocationStatus';

export { evaluateDisconnectedState, DISCONNECT_THRESHOLD_MS, formatTeamMemberStatusLabel };

export interface TeamMemberLocation {
  userId: string;
  userName: string;
  role?: string;
  coords: { latitude: number; longitude: number };
  isGpsActive: boolean;
  lastSeen: string;
  isDisconnectedOrNoGps: boolean;
  isDelivering: boolean;
  activeOrderId?: string;
  activeOrderCode?: string;
}

/**
 * Busca todas as localizações de membros da equipe que estão EM ENTREGA ATIVA.
 * Se o usuário não iniciou uma entrega ou já finalizou, ele não aparece no mapa para os colegas.
 */
export async function fetchTeamLocations(excludeUserId?: string): Promise<TeamMemberLocation[]> {
  try {
    const { data, error } = await supabase
      .from('team_locations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) return [];

    return data
      .filter((row: any) => {
        if (excludeUserId && row.user_id === excludeUserId) return false;
        // PRIVACIDADE OPERACIONAL: Apenas membros com entrega em andamento ficam visíveis para outros
        if (!row.is_delivering) return false;
        return (
          typeof row.latitude === 'number' &&
          typeof row.longitude === 'number' &&
          !isNaN(row.latitude) &&
          !isNaN(row.longitude) &&
          (row.latitude !== 0 || row.longitude !== 0)
        );
      })
      .map((row: any) => ({
        userId: row.user_id,
        userName: row.user_name || 'Membro da Equipe',
        role: row.role || 'montador_entregador',
        coords: {
          latitude: row.latitude,
          longitude: row.longitude,
        },
        isGpsActive: Boolean(row.is_gps_active),
        lastSeen: row.last_seen || row.updated_at,
        isDisconnectedOrNoGps: evaluateDisconnectedState(row.is_gps_active, row.last_seen || row.updated_at),
        isDelivering: Boolean(row.is_delivering),
        activeOrderId: row.active_order_id || undefined,
        activeOrderCode: row.active_order_code || undefined,
      }));
  } catch (err) {
    console.warn('[TeamLocationService] Erro ao buscar localizações da equipe:', err);
    return [];
  }
}

/**
 * Transmite e persiste a localização do próprio usuário.
 * Se isDelivering for false, o registro fica marcado com is_delivering = false (ocultando dos outros).
 */
export async function broadcastMyLocation(
  user: { id: string; fullName?: string; role?: string },
  coords: { latitude: number; longitude: number } | null,
  isGpsActive: boolean,
  isDelivering: boolean = false,
  activeOrder?: { id: string; code?: string } | null,
): Promise<void> {
  if (!user?.id) return;

  try {
    const nowIso = new Date().toISOString();
    const userName = user.fullName || 'Usuário da Equipe';

    if (coords && isGpsActive) {
      await supabase.from('team_locations').upsert({
        user_id: user.id,
        user_name: userName,
        role: user.role || 'montador_entregador',
        latitude: coords.latitude,
        longitude: coords.longitude,
        is_gps_active: true,
        is_delivering: Boolean(isDelivering),
        active_order_id: isDelivering ? (activeOrder?.id || null) : null,
        active_order_code: isDelivering ? (activeOrder?.code || null) : null,
        last_seen: nowIso,
        updated_at: nowIso,
      });
    } else {
      // GPS desligado ou indisponível: mantém as últimas coordenadas e atualiza status
      await supabase
        .from('team_locations')
        .update({
          is_gps_active: false,
          is_delivering: Boolean(isDelivering),
          active_order_id: isDelivering ? (activeOrder?.id || null) : null,
          active_order_code: isDelivering ? (activeOrder?.code || null) : null,
          updated_at: nowIso,
        })
        .eq('user_id', user.id);
    }
  } catch (err) {
    console.warn('[TeamLocationService] Falha ao sincronizar localização no Supabase:', err);
  }
}

/**
 * Encerra imediatamente o compartilhamento de localização do usuário no Supabase
 * (chamado quando uma entrega é finalizada, cancelada ou marcada não atendida).
 */
export async function stopDeliveringBroadcast(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const nowIso = new Date().toISOString();
    await supabase
      .from('team_locations')
      .update({
        is_delivering: false,
        active_order_id: null,
        active_order_code: null,
        updated_at: nowIso,
      })
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[TeamLocationService] Falha ao encerrar compartilhamento no Supabase:', err);
  }
}

/**
 * Escuta atualizações de localização de outros membros da equipe em tempo real.
 */
export function subscribeToTeamLocations(
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel('team-locations-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'team_locations' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
