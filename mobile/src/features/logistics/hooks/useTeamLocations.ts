import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TeamMemberLocation,
  fetchTeamLocations,
  broadcastMyLocation,
  subscribeToTeamLocations,
} from '../../../services/teamLocationService';
import { DriverCoordinates, calculateDistanceInMeters } from '../../../services/locationService';

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
  const lastBroadcastTimeRef = useRef<number>(0);

  const loadLocations = useCallback(async () => {
    const list = await fetchTeamLocations(myUserId);
    setTeamMembers(list);
    setLoading(false);
  }, [myUserId]);

  // Transmissão inteligente da localização do usuário atual
  const syncMyLocation = useCallback(async () => {
    if (!userProfile?.id) return;

    const lat = myCoords?.latitude;
    const lng = myCoords?.longitude;
    const accuracy = myCoords?.accuracy;

    if (!lat || !lng || !isGpsActive) {
      await broadcastMyLocation(userProfile, null, false, isDelivering, activeOrder);
      return;
    }

    // Se não está em entrega ativa, não consumimos banda atualizando a posição no mapa
    if (!isDelivering) {
      return;
    }

    // Ignorar coordenadas com precisão muito ruim (margem de erro > 50 metros)
    if (accuracy && accuracy > 50) {
      return;
    }

    const now = Date.now();
    let shouldBroadcast = false;

    if (!lastBroadcastCoordsRef.current) {
      shouldBroadcast = true;
    } else {
      const distance = calculateDistanceInMeters(
        lastBroadcastCoordsRef.current.lat,
        lastBroadcastCoordsRef.current.lng,
        lat,
        lng
      );
      const timeElapsed = now - lastBroadcastTimeRef.current;

      // Otimização de Egress:
      // Transmite se moveu mais de 100 metros OU se passou 3 minutos (Heartbeat para quem está parado)
      if (distance >= 100 || timeElapsed >= 180000) {
        shouldBroadcast = true;
      }
    }

    if (shouldBroadcast) {
      lastBroadcastCoordsRef.current = { lat, lng };
      lastBroadcastTimeRef.current = now;
      await broadcastMyLocation(userProfile, { latitude: lat, longitude: lng }, true, isDelivering, activeOrder);
    }
  }, [userProfile, myCoords, isGpsActive, isDelivering, activeOrder]);

  // Broadcast imediato quando as coordenadas mudarem
  useEffect(() => {
    syncMyLocation();
  }, [syncMyLocation]);

  // Escuta em tempo real via Supabase para atualizar a visão dos colegas no mapa
  useEffect(() => {
    loadLocations();

    const unsubscribe = subscribeToTeamLocations(() => {
      loadLocations();
    });

    return () => {
      unsubscribe();
    };
  }, [loadLocations]);

  return {
    teamMembers,
    loading,
    refreshTeamLocations: loadLocations,
  };
}
