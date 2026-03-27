import React, { useEffect, useRef, useMemo, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Order from "@/pages/types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { getNeighborhoodCoords, geocodeAddress } from '@/pages/utils/maps';

interface DeliveryMapProps {
    orders: Order[];
    onOrderClick: (order: Order) => void;
    onOrderEdit?: (order: Order) => void;
}

interface RoutePoint {
    id: string;
    lat: number;
    lng: number;
    order: Order;
    isAssistance: boolean;
    isPrecision: boolean;
    distance?: string;
    duration?: string;
}

export default function DeliveryMap({ orders, onOrderClick, onOrderEdit }: DeliveryMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markers = useRef<maplibregl.Marker[]>([]);
    const settings = getSettings();
    const storeOrigin = useMemo(() => settings.storeOriginCoords || [-49.16928, -25.35203], [settings.storeOriginCoords?.[0], settings.storeOriginCoords?.[1]]); // [lng, lat]

    const [routeInfo, setRouteInfo] = useState<Record<string, { distance: string, duration: string }>>({});

    const [geocodedPoints, setGeocodedPoints] = useState<Record<string, { lat: number, lng: number, isPrecision?: boolean }>>({});

    // Geocoding effect
    useEffect(() => {
        const geocodeAll = async () => {
            const newGeocoded = { ...geocodedPoints };
            let changed = false;
            
            for (const order of orders) {
                if (order.id && !newGeocoded[order.id]) {
                    // 1. Coordenadas já salvas no pedido (Melhor opção)
                    if (order.shipping?.destinationCoords && order.shipping.destinationCoords[0] !== 0) {
                        newGeocoded[order.id] = { 
                            lng: order.shipping.destinationCoords[0], 
                            lat: order.shipping.destinationCoords[1],
                            isPrecision: true
                        };
                        changed = true;
                        continue;
                    }

                    // 2. Geocodificação Dinâmica (OSM Nominatim)
                    const address = order.shipping?.useCustomerAddress === false && order.shipping?.deliveryAddress 
                        ? order.shipping.deliveryAddress 
                        : order.customerData.fullAddress;

                    if (address.street && address.number) {
                        // Respeitar limites do Nominatim (1 req/sec recomendado)
                        await new Promise(r => setTimeout(r, 600));
                        
                        const geoRes = await geocodeAddress(address);
                        if (geoRes) {
                            newGeocoded[order.id] = { lng: geoRes.coords[0], lat: geoRes.coords[1], isPrecision: geoRes.isPrecision };
                            changed = true;
                            continue;
                        }
                    }

                    // 3. Fallback: Bairro (O que estava acontecendo)
                    const fallback = getNeighborhoodCoords(address.neighborhood, address.city);
                    if (fallback) {
                        newGeocoded[order.id] = { ...fallback, isPrecision: false };
                        changed = true;
                    }
                }
            }
            if (changed) setGeocodedPoints(newGeocoded);
        };
        geocodeAll();
    }, [orders]);

    const points = useMemo(() => {
        return orders.map(order => {
            const isAssistance = order.orderType === 'assistance';
            const coords = geocodedPoints[order.id || ""];
            
            if (!coords) return null;

            // Jittering apenas se for fallback de bairro (campos de lat/lng inteiros indicam baixa precisão)
            const isPrecision =  !!coords.isPrecision;
            let jitterLat = 0;
            let jitterLng = 0;
            
            if (!isPrecision) {
                const seed = parseInt(order.id?.slice(-4) || "0", 16);
                jitterLat = (seed % 100 - 50) * 0.0001;
                jitterLng = (seed % 100 - 50) * 0.0001;
            }

            return {
                id: order.id,
                lat: coords.lat + jitterLat,
                lng: coords.lng + jitterLng,
                order,
                isAssistance,
                isPrecision,
                distance: order.shipping?.distance ? `${order.shipping.distance.toFixed(1)} km` : undefined,
                duration: order.shipping?.durationMinutes ? `${order.shipping.durationMinutes} min` : undefined
            };
        }).filter(Boolean) as RoutePoint[];
    }, [orders, geocodedPoints]);

    // Fetch routing info from OSRM
    useEffect(() => {
        const fetchAllRoutes = async () => {
            const newInfo: Record<string, { distance: string, duration: string }> = {};
            const toFetch = points.filter(p => !p.distance || !p.duration);
            if (toFetch.length === 0) return;

            for (const p of toFetch) {
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${storeOrigin[0]},${storeOrigin[1]};${p.lng},${p.lat}?overview=false`;
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data.routes && data.routes[0]) {
                        const route = data.routes[0];
                        newInfo[p.id!] = {
                            distance: `${(route.distance / 1000).toFixed(1)} km`,
                            duration: `${Math.round(route.duration / 60)} min`
                        };
                    }
                } catch (e) {
                    console.warn(`Erro ao calcular rota para ${p.id}:`, e);
                }
            }
            setRouteInfo(prev => ({ ...prev, ...newInfo }));
        };

        if (points.length > 0) {
            fetchAllRoutes();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [points, storeOrigin[0], storeOrigin[1]]);

    useEffect(() => {
        if (!mapContainer.current) return;

        // 1. Initial Map Setup (Once)
        if (!map.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [storeOrigin[0], storeOrigin[1]],
                zoom: 12,
                attributionControl: false
            });

            map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

            // Add store marker on initial load
            map.current.on('load', () => {
                if (!map.current) return;
                new maplibregl.Marker({ color: '#2563eb' })
                    .setLngLat([storeOrigin[0], storeOrigin[1]])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div style="padding: 5px; font-weight: 900;">Loja Móveis Morante</div>'))
                    .addTo(map.current);
            });
        }

        const currentMap = map.current;

        // 2. Data Update Logic
        const updateAll = () => {
            if (!currentMap.loaded()) {
                currentMap.once('load', updateAll);
                return;
            }

            // Update markers
            updateMarkers();
        };

        if (currentMap.loaded()) updateAll();
        else currentMap.on('load', updateAll);

        return () => {
            // No removal here to prevent flick on every data update
        };
    }, [storeOrigin[0], storeOrigin[1], points, routeInfo]);

    // 3. Final Cleanup on Unmount
    useEffect(() => {
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);
    
    // Global handler for popup buttons
    useEffect(() => {
        (window as any).handleMapOrderClick = (orderId: string) => {
            const order = orders.find(o => o.id === orderId);
            if (order) onOrderClick(order);
        };
        (window as any).handleMapOrderEdit = (orderId: string) => {
            const order = orders.find(o => o.id === orderId);
            if (order && onOrderEdit) onOrderEdit(order);
        };
        return () => { 
            delete (window as any).handleMapOrderClick; 
            delete (window as any).handleMapOrderEdit;
        };
    }, [orders, onOrderClick, onOrderEdit]);

    // Update markers when points or routeInfo change
    useEffect(() => {
        if (!map.current?.loaded()) return;
        updateMarkers();
    }, [points, routeInfo]);

    const updateMarkers = () => {
        if (!map.current) return;

        // Clear existing markers
        markers.current.forEach(m => m.remove());
        markers.current = [];

        points.forEach((p) => {
            const info = routeInfo[p.id] || (p.distance ? { distance: p.distance, duration: p.duration } : null);
            const color = !p.isPrecision ? '#ef4444' : (p.isAssistance ? '#f59e0b' : '#3b82f6');
            
            const el = document.createElement('div');
            el.className = 'custom-marker';
            
            const rawDate = p.order.shipping?.scheduling?.date || (p.order as any).scheduledDate || "";
            
            // Priority: User friendly string (Morning/Afternoon/Fixed) > Start Time > Assistance Time
            const time = p.order.shipping?.scheduling?.time || p.order.shipping?.scheduling?.startTime || (p.order as any).scheduledTime || "";
            
            // Format date to DD/MM
            const date = rawDate.includes('-') 
                ? rawDate.split('-').reverse().slice(0, 2).join('/') 
                : rawDate.split('/').slice(0, 2).join('/');
            
            el.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; pointer-events: none;">
                    <div style="background-color: ${color}; min-width: 44px; width: 44px; height: 44px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); color: white; cursor: pointer; pointer-events: auto;">
                        <i class="bi bi-${p.isAssistance ? 'tools' : 'truck'}" style="font-size: 1.2rem;"></i>
                    </div>
                    <div style="background: white; padding: 6px 12px; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); white-space: nowrap; line-height: 1.3; transform: translateY(-2px);">
                        <p style="margin: 0; font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">${date}</p>
                        <p style="margin: 0; font-size: 13px; font-weight: 900; color: #1e293b;">${time}</p>
                    </div>
                </div>
            `;

            const gMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeOrigin[1]},${storeOrigin[0]}&destination=${p.lat},${p.lng}&travelmode=driving`;

            const popupHtml = `
                <div style="font-family: 'Inter', sans-serif; padding: 12px; min-width: 240px; border-radius: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="background: ${color}; color: white; padding: 3px 8px; border-radius: 6px; font-size: 8px; font-weight: 900; text-transform: uppercase; tracking: 0.1em;">
                            ${!p.isPrecision ? 'Localização Imprecisa' : (p.isAssistance ? 'Assistência' : 'Entrega')}
                        </span>
                        <span style="font-size: 10px; font-weight: 900; color: #94a3b8;">#${p.order.id?.slice(-5)}</span>
                    </div>
                    
                    <h4 style="margin: 0 0 4px; font-weight: 900; color: #1e293b; font-size: 14px;">${p.order.customerData?.fullName || 'Cliente'}</h4>
                    <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                        <i class="bi bi-geo-alt-fill" style="color: #ef4444; margin-right: 4px;"></i>
                        ${p.order.customerData?.fullAddress?.street}, ${p.order.customerData?.fullAddress?.number} - ${p.order.customerData?.fullAddress?.neighborhood}, ${p.order.customerData?.fullAddress?.city}
                    </p>
                    
                    ${info ? `
                        <div style="display: flex; gap: 12px; margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                            <div>
                                <p style="margin: 0; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Distância</p>
                                <p style="margin: 0; font-size: 11px; font-weight: 900; color: #334155;">${info.distance}</p>
                            </div>
                            <div style="width: 1px; background: #e2e8f0;"></div>
                            <div>
                                <p style="margin: 0; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Tempo Est.</p>
                                <p style="margin: 0; font-size: 11px; font-weight: 900; color: #334155;">${info.duration}</p>
                            </div>
                        </div>
                    ` : `
                        <div style="margin-top: 12px; font-size: 10px; color: #94a3b8; font-style: italic;">Calculando rota...</div>
                    `}

                    <a href="${gMapsUrl}" target="_blank" style="display: block; width: 100%; margin-top: 12px; padding: 10px; background: #1e293b; color: white; border-radius: 12px; text-align: center; text-decoration: none; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;">
                        Abrir no Google Maps
                    </a>

                    <button onclick="handleMapOrderClick('${p.id}')" style="display: block; width: 100%; margin-top: 8px; padding: 10px; background: #f1f5f9; color: #1e293b; border-radius: 12px; border: none; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.2s;">
                        Ver Detalhes
                    </button>

                    ${onOrderEdit ? `
                    <button onclick="handleMapOrderEdit('${p.id}')" style="display: block; width: 100%; margin-top: 8px; padding: 10px; background: white; color: #2563eb; border-radius: 12px; border: 2px solid #2563eb; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.2s;">
                        <i class="bi bi-pencil-square" style="margin-right: 4px;"></i> Editar Pedido
                    </button>
                    ` : ''}
                </div>
            `;

            const m = new maplibregl.Marker({ element: el })
                .setLngLat([p.lng, p.lat])
                .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml))
                .addTo(map.current!);
            
            markers.current.push(m);
        });
    };

    return (
        <div className="h-[450px] sm:h-[600px] md:h-[700px] w-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl relative animate-fade-in">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
