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
  isDelivering?: boolean;
  activeOrder?: { id: string; code?: string } | null;
}

export function useTeamLocations({
  userProfile,
  myCoords,
  isGpsActive = true,
  isDelivering = false,
  activeOrder = null,
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

  // Transmissão da localização do usuário atual (incluindo se está em entrega ativa)
  const syncMyLocation = useCallback(async () => {
    if (!userProfile?.id) return;

    const lat = myCoords?.latitude;
    const lng = myCoords?.longitude;

    if (lat && lng && isGpsActive) {
      lastBroadcastCoordsRef.current = { lat, lng };
      await broadcastMyLocation(userProfile, { latitude: lat, longitude: lng }, true, isDelivering, activeOrder);
    } else if (!isGpsActive) {
      await broadcastMyLocation(userProfile, null, false, isDelivering, activeOrder);
    }
  }, [userProfile, myCoords?.latitude, myCoords?.longitude, isGpsActive, isDelivering, activeOrder]);

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
