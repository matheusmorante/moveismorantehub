import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSettings } from '@/pages/utils/settingsService';
import { autoCalculateRouteDistance, searchAddressSuggestions, RouteResult } from '../../utils/maps';
import { formatCurrency } from '../../utils/formatters';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { calculateFreightByDistance } from '../../utils/shippingPricing';

const FreightCalculation = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const [addressForm, setAddressForm] = useState({
        street: '',
        number: '',
        neighborhood: '',
        city: 'Colombo',
        state: 'PR',
        cep: '',
        complement: '',
        observation: ''
    });

    const settings = getSettings();
    const origin: [number, number] = settings.storeOriginCoords;

    const handleSearch = async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }
        const results = await searchAddressSuggestions(query);
        setSuggestions(results);
    };

    const handleSelectSuggestion = (suggestion: any) => {
        const addr = suggestion.address;
        setAddressForm({
            street: addr.road || addr.pedestrian || '',
            number: addr.house_number || '',
            neighborhood: addr.suburb || addr.neighbourhood || '',
            city: addr.city || addr.town || addr.village || 'Colombo',
            state: addr.state || 'PR',
            cep: addr.postcode || '',
            complement: '',
            observation: ''
        });
        setSuggestions([]);
    };

    const calculateFreight = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await autoCalculateRouteDistance(addressForm);
            if (result) {
                setRouteResult(result);
            } else {
                setError("Não foi possível calcular a rota para este endereço. Verifique os dados.");
            }
        } catch (err) {
            setError("Erro ao processar cálculo. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!mapContainer.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            center: origin,
            zoom: 12,
            attributionControl: false
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
            // Store marker (red)
            const storeEl = document.createElement('div');
            storeEl.innerHTML = `<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#dc2626"/>
                 <circle cx="16" cy="16" r="6" fill="white"/>
             </svg>`;
            new maplibregl.Marker({ element: storeEl, anchor: 'bottom' })
                .setLngLat(origin)
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Nossa Loja</strong>'))
                .addTo(map);

            if (routeResult) {
                // Destination marker (blue)
                const destEl = document.createElement('div');
                destEl.innerHTML = `<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#2563eb"/>
                    <circle cx="16" cy="16" r="6" fill="white"/>
                </svg>`;
                new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
                    .setLngLat(routeResult.destinationCoords)
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Entrega</strong>'))
                    .addTo(map);

                // Add route line
                if (routeResult.routeGeoJSON) {
                    map.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: routeResult.routeGeoJSON
                        }
                    });

                    map.addLayer({
                        id: 'route-layer',
                        type: 'line',
                        source: 'route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': '#3b82f6',
                            'line-width': 5,
                            'line-opacity': 0.8
                        }
                    });

                    const bounds = new maplibregl.LngLatBounds();
                    bounds.extend(origin);
                    bounds.extend(routeResult.destinationCoords);
                    routeResult.routeGeoJSON.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
                    map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
                }
            }
        });

        return () => {
            if (mapRef.current) mapRef.current.remove();
        };
    }, [routeResult, origin]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Cálculo de Frete</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Simulação de custos logísticos por distância</p>
                    </div>

                    {routeResult && (
                        <div className="flex gap-4 animate-fade-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Distância</p>
                                <p className="text-lg font-black text-blue-700 dark:text-blue-300 tracking-tight">{routeResult.distanceKm} km</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Valor Sugerido</p>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                                    {formatCurrency(calculateFreightByDistance(routeResult.distanceKm))}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Fixed Search Form */}
                <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-20">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="relative group" ref={searchContainerRef}>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-500 transition-colors mb-2 block">
                                Digite o Endereço para Pesquisa Rápida
                            </label>
                            <div className="relative">
                                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Ex: R. Cascavel, Colombo..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                <DropdownPortal anchorRef={searchContainerRef} isOpen={suggestions.length > 0}>
                                    <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
                                        {suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectSuggestion(s)}
                                                className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 last:border-0"
                                            >
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                                                    <i className="bi bi-geo-alt-fill text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{s.display_name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.address.suburb || s.address.city}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </DropdownPortal>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Rua</label>
                                <input
                                    type="text"
                                    value={addressForm.street}
                                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nº</label>
                                <input
                                    type="text"
                                    value={addressForm.number}
                                    onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Bairro</label>
                                <input
                                    type="text"
                                    value={addressForm.neighborhood}
                                    onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                            <div className="flex gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade: </span>
                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">{addressForm.city}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">UF: </span>
                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">{addressForm.state}</span>
                                </div>
                            </div>

                            <button
                                onClick={calculateFreight}
                                disabled={loading || !addressForm.street}
                                className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Calculando...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-calculator" />
                                        Calcular Valor
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-fade-in">
                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                    <i className="bi bi-exclamation-circle-fill" /> {error}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 relative">
                    <div ref={mapContainer} className="w-full h-full" />
                </div>
            </div>
        </div>
    );
};

export default FreightCalculation;
