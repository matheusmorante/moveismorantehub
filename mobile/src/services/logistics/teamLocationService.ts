import { supabase } from '../supabaseClient';
import {
  evaluateDisconnectedState,
  DISCONNECT_THRESHOLD_MS,
  formatTeamMemberStatusLabel,
} from '../../features/logistics/domain/teamLocationStatus';

export { evaluateDisconnectedState, DISCONNECT_THRESHOLD_MS, formatTeamMemberStatusLabel };

const INITIAL_STATUS_BROADCAST_SKIP_WINDOW_MS = 10_000;
const successfulInitialStatusBroadcasts = new Map<
  string,
  { userId: string; expiresAt: number }
>();
const initialStatusBroadcastsInFlight = new Map<
  string,
  { userId: string; promise: Promise<boolean>; token: object }
>();

function getStatusBroadcastKey(userId: string, orderId: string): string {
  return JSON.stringify([userId, orderId]);
}

function markSuccessfulInitialStatusBroadcast(userId: string, orderId: string): void {
  if (!userId || !orderId) return;
  const now = Date.now();
  for (const [key, statusBroadcast] of successfulInitialStatusBroadcasts) {
    if (statusBroadcast.expiresAt < now) successfulInitialStatusBroadcasts.delete(key);
  }
  successfulInitialStatusBroadcasts.set(getStatusBroadcastKey(userId, orderId), {
    userId,
    expiresAt: now + INITIAL_STATUS_BROADCAST_SKIP_WINDOW_MS,
  });
}

/** Aguarda o aviso inicial em andamento e consome uma única repetição confirmada. */
export async function consumeSuccessfulInitialStatusBroadcast(
  userId: string,
  orderId: string
): Promise<boolean> {
  if (!userId || !orderId) return false;

  const key = getStatusBroadcastKey(userId, orderId);
  const inFlightBroadcast = initialStatusBroadcastsInFlight.get(key)?.promise;
  if (inFlightBroadcast && !(await inFlightBroadcast)) return false;

  const statusBroadcast = successfulInitialStatusBroadcasts.get(key);
  successfulInitialStatusBroadcasts.delete(key);

  return statusBroadcast !== undefined && statusBroadcast.expiresAt >= Date.now();
}

/** Remove uma supressão pendente quando o estado recebe uma posição real. */
export function clearSuccessfulInitialStatusBroadcast(userId: string, orderId: string): void {
  if (!userId || !orderId) return;
  const key = getStatusBroadcastKey(userId, orderId);
  successfulInitialStatusBroadcasts.delete(key);
  initialStatusBroadcastsInFlight.delete(key);
}

function clearSuccessfulInitialStatusBroadcastsForUser(userId: string): void {
  for (const [key, statusBroadcast] of successfulInitialStatusBroadcasts) {
    if (statusBroadcast.userId === userId) successfulInitialStatusBroadcasts.delete(key);
  }
  for (const [key, statusBroadcast] of initialStatusBroadcastsInFlight) {
    if (statusBroadcast.userId === userId) {
      initialStatusBroadcastsInFlight.delete(key);
    }
  }
}

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

/** Busca a localização ativa do responsável principal vinculada a um pedido específico. */
export async function fetchTeamLocations(
  excludeUserId: string | undefined,
  activeOrder: { id: string; responsibleId: string }
): Promise<TeamMemberLocation[]> {
  if (!excludeUserId || !activeOrder?.id || !activeOrder?.responsibleId) return [];
  if (activeOrder.responsibleId === excludeUserId) return [];

  try {
    const { data, error } = await supabase
      .from('team_locations')
      .select(
        'user_id, user_name, role, latitude, longitude, is_gps_active, is_delivering, active_order_id, active_order_code, last_seen, updated_at'
      )
      .eq('is_delivering', true)
      .eq('user_id', activeOrder.responsibleId)
      .eq('active_order_id', activeOrder.id)
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
        isDisconnectedOrNoGps: evaluateDisconnectedState(
          row.is_gps_active,
          row.last_seen || row.updated_at
        ),
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
  activeOrder?: { id: string; code?: string } | null
): Promise<boolean> {
  if (!user?.id) return false;

  try {
    const nowIso = new Date().toISOString();
    const userName = user.fullName || 'Usuário da Equipe';

    if (coords && isGpsActive) {
      if (activeOrder?.id) {
        clearSuccessfulInitialStatusBroadcast(user.id, activeOrder.id);
      }
      const { error } = await supabase.from('team_locations').upsert({
        user_id: user.id,
        user_name: userName,
        role: user.role || 'montador_entregador',
        latitude: coords.latitude,
        longitude: coords.longitude,
        is_gps_active: true,
        is_delivering: Boolean(isDelivering),
        active_order_id: isDelivering ? activeOrder?.id || null : null,
        active_order_code: isDelivering ? activeOrder?.code || null : null,
        last_seen: nowIso,
        updated_at: nowIso,
      });
      if (error) {
        console.warn(
          '[TeamLocationService] Falha ao atualizar localização no Supabase:',
          error
        );
        return false;
      }
    } else {
      // GPS desligado ou indisponível: mantém as últimas coordenadas e atualiza status
      const { data, error } = await supabase
        .from('team_locations')
        .update({
          is_gps_active: false,
          is_delivering: Boolean(isDelivering),
          active_order_id: isDelivering ? activeOrder?.id || null : null,
          active_order_code: isDelivering ? activeOrder?.code || null : null,
          updated_at: nowIso,
        })
        .eq('user_id', user.id)
        .select('user_id')
        .maybeSingle();
      if (error || !data) {
        console.warn(
          '[TeamLocationService] Falha ao atualizar status de localização no Supabase:',
          error || 'Nenhum registro foi atualizado.'
        );
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[TeamLocationService] Falha ao sincronizar localização no Supabase:', err);
    return false;
  }
}

/** Inicia o aviso de rota e permite que a sincronização seguinte aguarde esse resultado. */
export function broadcastInitialDeliveryStatus(
  user: { id: string; fullName?: string; role?: string },
  activeOrder: { id: string; code?: string }
): Promise<boolean> {
  if (!user?.id || !activeOrder?.id) return Promise.resolve(false);

  clearSuccessfulInitialStatusBroadcast(user.id, activeOrder.id);
  const key = getStatusBroadcastKey(user.id, activeOrder.id);
  const token = {};
  const initialBroadcast = broadcastMyLocation(user, null, true, true, activeOrder).then(
    (succeeded) => {
      if (initialStatusBroadcastsInFlight.get(key)?.token === token) {
        initialStatusBroadcastsInFlight.delete(key);
        if (succeeded) markSuccessfulInitialStatusBroadcast(user.id, activeOrder.id);
      }
      return succeeded;
    }
  );
  initialStatusBroadcastsInFlight.set(key, { userId: user.id, promise: initialBroadcast, token });

  return initialBroadcast;
}

/**
 * Encerra imediatamente o compartilhamento de localização do usuário no Supabase
 * (chamado quando uma entrega é finalizada, cancelada ou marcada não atendida).
 */
export async function stopDeliveringBroadcast(userId: string): Promise<void> {
  if (!userId) return;
  clearSuccessfulInitialStatusBroadcastsForUser(userId);
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
  responsibleUserId: string,
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel('team-locations-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'team_locations',
        filter: `user_id=eq.${responsibleUserId}`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
