// Limite de tolerância: 3 minutos (180.000 ms) sem atualização é considerado sem sinal/desligado
export const DISCONNECT_THRESHOLD_MS = 3 * 60 * 1000;

/**
 * Avalia se o membro da equipe está sem sinal de GPS ou com o aparelho desligado.
 * Retorna true se o GPS foi desligado explicitamente ou se a última atualização tem mais de 3 minutos.
 */
export function evaluateDisconnectedState(isGpsActive: boolean, lastSeenIso: string): boolean {
  if (!isGpsActive) return true;
  if (!lastSeenIso) return true;
  const elapsed = Date.now() - new Date(lastSeenIso).getTime();
  return elapsed > DISCONNECT_THRESHOLD_MS;
}

/**
 * Formata o texto de status do membro da equipe para exibição no popup ou lista.
 */
export function formatTeamMemberStatusLabel(isDisconnectedOrNoGps: boolean, lastSeenIso: string): {
  badge: 'active' | 'disconnected';
  title: string;
  subtitle: string;
} {
  const timeStr = lastSeenIso
    ? new Date(lastSeenIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (isDisconnectedOrNoGps) {
    return {
      badge: 'disconnected',
      title: 'Sem sinal de GPS / Desligado',
      subtitle: timeStr ? `Visto pela última vez às ${timeStr}` : 'Sinal indisponível',
    };
  }

  return {
    badge: 'active',
    title: 'GPS Ativo em Rota',
    subtitle: timeStr ? `Atualizado às ${timeStr}` : 'Em rota',
  };
}
