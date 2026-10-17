import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSettings } from '@/pages/utils/settingsService';
import { geocodeAddress } from '@/pages/utils/maps';

interface AddressVerificationMapProps {
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    cep?: string;
    complement?: string;
    observation?: string;
    coords?: [number, number];
    placeId?: string;
  };
}

const AddressVerificationMap = ({ address }: AddressVerificationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const { street, number, neighborhood, city, coords: directCoords, placeId } = address;

  const settings = getSettings();
  const originLongitude = settings.storeOriginCoords?.[0] ?? -49.16948;
  const originLatitude = settings.storeOriginCoords?.[1] ?? -25.35205;
  const storeOrigin = useMemo(
    () => [originLongitude, originLatitude] as [number, number],
    [originLongitude, originLatitude]
  );

  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [isPrecision, setIsPrecision] = useState(true);
  const [loading, setLoading] = useState(false);
  // Geocodifica para posicionar o marcador. O cálculo de rota/frete ocorre após
  // selecionar/salvar o endereço do cliente ou por ação explícita no pedido.
  useEffect(() => {
    // Se as coordenadas exatas já foram resolvidas pelo autocomplete do Places ou GPS, utiliza diretamente sem chamar Geocoding API
    if (
      Array.isArray(directCoords) &&
      directCoords.length === 2 &&
      Number.isFinite(directCoords[0]) &&
      Number.isFinite(directCoords[1]) &&
      (directCoords[0] !== 0 || directCoords[1] !== 0)
    ) {
      setCoords([Number(directCoords[0]), Number(directCoords[1])]);
      setIsPrecision(true);
      setLoading(false);
      return;
    }

    if (!street || !city) {
      setCoords(null);
      setIsPrecision(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const geoResult = await geocodeAddress({ street, number, neighborhood, city, placeId });
        if (geoResult) {
          setCoords(geoResult.coords);
          setIsPrecision(geoResult.isPrecision);
        } else {
          setCoords(null);
          setIsPrecision(false);
        }
      } catch (e) {
        console.error('Erro na verificação de endereço via Google Maps:', e);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [street, number, neighborhood, city, directCoords, placeId]);

  // Map initialization
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [storeOrigin[0], storeOrigin[1]],
        zoom: 12,
        attributionControl: false,
      });

      map.current.on('load', () => {
        if (!map.current) return;
        // Store marker
        new maplibregl.Marker({ color: '#2563eb' })
          .setLngLat([storeOrigin[0], storeOrigin[1]])
          .addTo(map.current);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [storeOrigin]);

  // Update dynamic marker and view
  useEffect(() => {
    if (!map.current || !coords) {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      return;
    }

    if (!marker.current) {
      marker.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(coords)
        .addTo(map.current);
    } else {
      marker.current.setLngLat(coords);
    }

    // Fit bounds
    const bounds = new maplibregl.LngLatBounds()
      .extend([storeOrigin[0], storeOrigin[1]])
      .extend(coords);

    map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
  }, [coords, storeOrigin]);

  return (
    <div className="relative w-full h-[200px] md:h-[250px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner group">
      <div ref={mapContainer} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {(!isPrecision || !coords) && !loading && street && (
        <div className="absolute top-3 left-3 right-3 bg-red-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg animate-fade-in z-10">
          <i className="bi bi-exclamation-triangle-fill mr-2" />
          {!coords ? 'Endereço não localizado' : 'Rua não encontrada - Marcador no Bairro/Cidade'}
        </div>
      )}
    </div>
  );
};

export default AddressVerificationMap;
