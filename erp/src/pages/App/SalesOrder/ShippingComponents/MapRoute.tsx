import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSettings } from '@/pages/utils/settingsService';

interface MapRouteProps {
    destinationCoords: [number, number]; // [lng, lat]
    routeGeoJSON?: any;
    className?: string;
    onIdle?: () => void;
}

const MapRoute = ({ destinationCoords, routeGeoJSON, className = "", onIdle }: MapRouteProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const storeMarkerRef = useRef<maplibregl.Marker | null>(null);

    const settings = getSettings();
    const origin: [number, number] = settings.storeOriginCoords;

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize map only once
        if (!mapRef.current) {
            const map = new maplibregl.Map({
                container: mapContainer.current,
                style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
                center: destinationCoords,
                zoom: 12,
                attributionControl: false,
                preserveDrawingBuffer: true
            });

            mapRef.current = map;
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
            map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
        }

        const map = mapRef.current;

        const updateMap = () => {
            if (!map.loaded()) {
                map.once('load', updateMap);
                return;
            }

            // Clear old markers if we had any (store marker is in storeMarkerRef)
            // For print, we usually only have one pair ever, but let's be safe.

            const currentOrigin = getSettings().storeOriginCoords;

            // Store marker (red)
            if (storeMarkerRef.current) storeMarkerRef.current.remove();
            
            const storeEl = document.createElement('div');
            storeEl.innerHTML = `<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#dc2626"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>`;
            storeMarkerRef.current = new maplibregl.Marker({ element: storeEl, anchor: 'bottom' })
                .setLngLat(currentOrigin)
                .addTo(map);

            // Destination marker (blue)
            const destEl = document.createElement('div');
            destEl.innerHTML = `<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#2563eb"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>`;
            new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
                .setLngLat(destinationCoords)
                .addTo(map);

            // Handle Route
            if (map.getSource('route')) {
                (map.getSource('route') as maplibregl.GeoJSONSource).setData({
                    type: 'Feature',
                    properties: {},
                    geometry: routeGeoJSON
                });
            } else if (routeGeoJSON && routeGeoJSON.coordinates?.length > 0) {
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: routeGeoJSON
                    }
                });
                map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.8 }
                });
            }

            // Fit Bounds
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend(currentOrigin);
            bounds.extend(destinationCoords);
            if (routeGeoJSON?.coordinates) {
                routeGeoJSON.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
            }
            map.fitBounds(bounds, { padding: 50, maxZoom: 15, animate: false });

            // Signal ready
            if (onIdle) {
                const checkIdle = () => {
                    if (map.loaded()) onIdle();
                    else map.once('idle', checkIdle);
                };
                map.once('idle', checkIdle);
            }
        };

        if (map.loaded()) updateMap();
        else map.on('load', updateMap);

        return () => {
            // No removal here to avoid flicker, only on real unmount
        };
    }, [destinationCoords[0], destinationCoords[1], JSON.stringify(routeGeoJSON), origin[0], origin[1]]);

    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <div className={`w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-0 ${className}`}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
        </div>
    );
};

export default MapRoute;
