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
    };
}

const AddressVerificationMap = ({ address }: AddressVerificationMapProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const marker = useRef<maplibregl.Marker | null>(null);
    const routeLayerRef = useRef<boolean>(false);
    
    const settings = getSettings();
    const storeOrigin = useMemo(() => settings.storeOriginCoords || [-49.16928, -25.35203], [settings.storeOriginCoords?.[0], settings.storeOriginCoords?.[1]]);

    const [coords, setCoords] = useState<[number, number] | null>(null);
    const [isPrecision, setIsPrecision] = useState(true);
    const [loading, setLoading] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);

    // Debounced geocoding
    useEffect(() => {
        if (!address.street || !address.city) {
            setCoords(null);
            setRouteInfo(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await geocodeAddress(address as any);
                if (result) {
                    setCoords(result.coords);
                    setIsPrecision(result.isPrecision);
                    
                    // Fetch route info
                    const url = `https://router.project-osrm.org/route/v1/driving/${storeOrigin[0]},${storeOrigin[1]};${result.coords[0]},${result.coords[1]}?overview=full&geometries=geojson`;
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data.routes && data.routes[0]) {
                        const route = data.routes[0];
                        setRouteInfo({
                            distance: `${(route.distance / 1000).toFixed(1)} km`,
                            duration: `${Math.round(route.duration / 60)} min`
                        });
                        
                        // Update map route
                        if (map.current) {
                            if (map.current.getSource('route')) {
                                (map.current.getSource('route') as maplibregl.GeoJSONSource).setData(route.geometry);
                            } else {
                                map.current.addSource('route', {
                                    type: 'geojson',
                                    data: {
                                        type: 'Feature',
                                        properties: {},
                                        geometry: route.geometry
                                    }
                                });
                                map.current.addLayer({
                                    id: 'route',
                                    type: 'line',
                                    source: 'route',
                                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                                    paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.6 }
                                });
                            }
                        }
                    }
                } else {
                    setCoords(null);
                    setIsPrecision(false);
                    setRouteInfo(null);
                }
            } catch (e) {
                console.error("Erro na verificação de endereço:", e);
            } finally {
                setLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [address.street, address.number, address.neighborhood, address.city, storeOrigin]);

    // Map initialization
    useEffect(() => {
        if (!mapContainer.current) return;

        if (!map.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [storeOrigin[0], storeOrigin[1]],
                zoom: 12,
                attributionControl: false
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
    }, []);

    // Update dynamic marker and view
    useEffect(() => {
        if (!map.current || !coords) {
            if (marker.current) {
                marker.current.remove();
                marker.current = null;
            }
            if (map.current?.getLayer('route')) {
                map.current.removeLayer('route');
                map.current.removeSource('route');
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

            {routeInfo && (
                <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg flex gap-4 transition-all animate-slide-up">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400">Distância</span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">{routeInfo.distance}</span>
                    </div>
                    <div className="w-[1px] bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400">Tempo Est.</span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">{routeInfo.duration}</span>
                    </div>
                </div>
            )}

            {(!isPrecision || !coords) && !loading && address.street && (
                <div className="absolute top-3 left-3 right-3 bg-red-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg animate-fade-in z-10">
                    <i className="bi bi-exclamation-triangle-fill mr-2" />
                    {!coords ? 'Endereço não localizado' : 'Rua não encontrada - Marcador no Bairro/Cidade'}
                </div>
            )}
        </div>
    );
};

export default AddressVerificationMap;
