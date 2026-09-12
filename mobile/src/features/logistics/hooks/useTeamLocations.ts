import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TeamMemberLocation,
  fetchTeamLocations,
  broadcastMyLocation,
  subscribeToTeamLocations,
} from '../../../services/teamLocationService';
import { DriverCoordinates } from '../../../services/locationService';

interface UseTeamLocationsOptions {
  userProfile?: { id: string; fullName?: string; role?: string } | null;
  myCoords?: DriverCoordinates | null;
  isGpsActive?: boolean;
}

export function useTeamLocations({
  userProfile,
  myCoords,
  isGpsActive = true,
}: UseTeamLocationsOptions = {}) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const myUserId = userProfile?.id;
  const lastBroadcastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const loadLocations = useCallback(async () => {
    const list = await fetchTeamLocations(myUserId);
    setTeamMembers(list);
    setLoading(false);
  }, [myUserId]);

  // Transmissão da localização do usuário atual
  const syncMyLocation = useCallback(async () => {
    if (!userProfile?.id) return;

    const lat = myCoords?.latitude;
    const lng = myCoords?.longitude;

    // Só envia se mudou de posição significativa ou se o estado do GPS mudou
    if (lat && lng && isGpsActive) {
      lastBroadcastCoordsRef.current = { lat, lng };
      await broadcastMyLocation(userProfile, { latitude: lat, longitude: lng }, true);
    } else if (!isGpsActive) {
      await broadcastMyLocation(userProfile, null, false);
    }
  }, [userProfile, myCoords?.latitude, myCoords?.longitude, isGpsActive]);

  // Broadcast imediato quando as coordenadas mudarem
  useEffect(() => {
    syncMyLocation();
  }, [syncMyLocation]);

  // Intervalo periódico de sincronização e atualização de estado (a cada 20 segundos)
  useEffect(() => {
    loadLocations();

    const interval = setInterval(() => {
      syncMyLocation();
      loadLocations();
    }, 20000);

    // Escuta em tempo real via Supabase
    const unsubscribe = subscribeToTeamLocations(() => {
      loadLocations();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadLocations, syncMyLocation]);

  return {
    teamMembers,
    loading,
    refreshTeamLocations: loadLocations,
  };
}
