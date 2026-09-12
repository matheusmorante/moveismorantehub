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
}

/**
 * Busca todas as últimas localizações de membros da equipe registradas no banco.
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
      }));
  } catch (err) {
    console.warn('[TeamLocationService] Erro ao buscar localizações da equipe:', err);
    return [];
  }
}

/**
 * Transmite e persiste a localização do próprio usuário.
 * Se o GPS for desligado, mantém a última latitude e longitude gravadas, atualizando is_gps_active = false.
 */
export async function broadcastMyLocation(
  user: { id: string; fullName?: string; role?: string },
  coords: { latitude: number; longitude: number } | null,
  isGpsActive: boolean
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
        last_seen: nowIso,
        updated_at: nowIso,
      });
    } else {
      // GPS desligado ou indisponível: marca is_gps_active = false mantendo a última coordenada intacta
      await supabase
        .from('team_locations')
        .update({
          is_gps_active: false,
          updated_at: nowIso,
        })
        .eq('user_id', user.id);
    }
  } catch (err) {
    console.warn('[TeamLocationService] Falha ao sincronizar localização no Supabase:', err);
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
