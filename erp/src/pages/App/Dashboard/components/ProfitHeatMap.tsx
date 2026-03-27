import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Order from '@/pages/types/order.type';
import { geocodeAddress, getNeighborhoodCoords } from '@/pages/utils/maps';

interface ProfitHeatMapProps {
    orders: Order[];
}

type MetricType = 'profit' | 'value' | 'count';

export const ProfitHeatMap: React.FC<ProfitHeatMapProps> = ({ orders }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [metric, setMetric] = useState<MetricType>('profit');
    const [opacity, setOpacity] = useState(0.8);
    const [isLoaded, setIsLoaded] = useState(false);
    const [ordersWithCoords, setOrdersWithCoords] = useState<Record<string, [number, number]>>({});

    // Efeito para Geocodificação em Segundo Plano
    useEffect(() => {
        const fetchMissingCoords = async () => {
            const newCoords = { ...ordersWithCoords };
            let updated = false;

            // Filtra pedidos que não tem coordenadas e ainda não foram processados nesta sessão
            const toGeocode = orders.filter(o => 
                o.id && 
                !o.shipping?.destinationCoords && 
                !newCoords[o.id]
            ).slice(0, 50); // Aumentado limite para 50 para cobrir mais do período

            if (toGeocode.length === 0) return;

            for (const order of toGeocode) {
                if (!order.id) continue;
                const fullAddr = order.customerData?.fullAddress;
                // Exige rua para tentar geocodificar
                if (!fullAddr?.street) continue;

                try {
                    // Tenta geocodificar usando Rua, Número, Bairro e Cidade
                    const geoRes = await geocodeAddress(fullAddr);
                    if (geoRes) {
                        newCoords[order.id] = geoRes.coords;
                        updated = true;
                    }
                } catch (e) {
                    console.warn(`Erro ao geocodificar pedido ${order.id}:`, e);
                }
                
                // Delay reduzido para processar mais rápido, Nominatim permite pequenos picos
                await new Promise(r => setTimeout(r, 250));
            }

            if (updated) {
                setOrdersWithCoords(newCoords);
            }
        };

        // Inicia após carregar o mapa
        const timer = setTimeout(fetchMissingCoords, 2500);
        return () => clearTimeout(timer);
    }, [orders, ordersWithCoords]);

    // Converte ordens em GeoJSON para MapLibre
    const geoJsonData = useMemo(() => {
        const features = orders.map(order => {
            const fullAddr = order.customerData?.fullAddress;
            const neighborhood = (fullAddr?.neighborhood || '').toUpperCase().trim();
            const city = (fullAddr?.city || '').toUpperCase().trim();
            
            // Ordem de prioridade de Coordenadas:
            // 1. Coordenadas salvas no pedido
            // 2. Coordenadas encontradas pela geocodificação dinâmica
            // 3. Fallback de bairro/cidade via utilitário global
            let finalCoords: [number, number];
            
            if (order.shipping?.destinationCoords && order.shipping.destinationCoords[0] !== 0) {
                finalCoords = order.shipping.destinationCoords;
            } else if (ordersWithCoords[order.id || '']) {
                const c = ordersWithCoords[order.id || ''];
                finalCoords = [c[0], c[1]];
            } else {
                const fall = getNeighborhoodCoords(neighborhood, city);
                finalCoords = fall ? [fall.lng, fall.lat] : [-49.2671, -25.4290];
            }
            
            // Jittering inteligente (evita sobreposição total de pontos no mesmo local)
            const addrNumber = fullAddr?.number ? parseInt(fullAddr.number.replace(/\D/g, '')) : 0;
            const seed = (order.id || '').length + addrNumber + (fullAddr?.street || '').length;
            
            // Jittering ultra-reduzido para pontos precisos, mantendo o ponto na rua correta
            const isPrecision = (order.shipping?.destinationCoords || ordersWithCoords[order.id || '']);
            const jitterScale = isPrecision ? 0.00005 : 0.0006;
            const jitterLat = ((seed % 20) - 10) * jitterScale;
            const jitterLng = ((Math.floor(seed / 5) % 20) - 10) * jitterScale;

            const totalValue = order.itemsSummary?.itemsTotalValue || 0;
            const totalCost = order.itemsSummary?.totalItemsCost || 0;
            const profitValue = totalValue - totalCost;

            return {
                type: 'Feature',
                properties: {
                    profit: Math.max(0, profitValue),
                    value: totalValue,
                    count: 1
                },
                geometry: {
                    type: 'Point',
                    coordinates: [finalCoords[0] + jitterLng, finalCoords[1] + jitterLat]
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features
        } as any;
    }, [orders, ordersWithCoords]);

    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [-49.2671, -25.4290], // Curitiba
            zoom: 11,
            attributionControl: false
        });

        map.current.on('load', () => {
            if (!map.current) return;

            map.current.addSource('heat-source', {
                type: 'geojson',
                data: geoJsonData
            });

            map.current.addLayer({
                id: 'heat-layer',
                type: 'heatmap',
                source: 'heat-source',
                maxzoom: 15,
                paint: {
                    'heatmap-weight': ['interpolate', ['linear'], ['get', metric], 0, 0, 1000, 1],
                    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(0,0,0,0)',
                        0.2, '#fde047', // Amarelo
                        0.5, metric === 'profit' ? '#22c55e' : '#f97316', // Verde (Lucro) vs Laranja (Venda)
                        0.8, metric === 'profit' ? '#166534' : '#dc2626', // Verde Escuro vs Vermelho
                        1.0, metric === 'profit' ? '#052e16' : '#7f1d1d'
                    ],
                    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20, 15, 40],
                    'heatmap-opacity': opacity
                }
            });

            setIsLoaded(true);
        });

        return () => {
            map.current?.remove();
        };
    }, []);

    // Atualiza dados e estilos quando mudam
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const source = map.current.getSource('heat-source') as maplibregl.GeoJSONSource;
        if (source) source.setData(geoJsonData);

        const maxValue = Math.max(...geoJsonData.features.map((f: any) => f.properties[metric]), 1);

        map.current.setPaintProperty('heat-layer', 'heatmap-weight', [
            'interpolate', ['linear'], ['get', metric], 0, 0, maxValue, 1
        ]);

        map.current.setPaintProperty('heat-layer', 'heatmap-color', [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#fde047',
            0.5, metric === 'profit' ? '#22c55e' : '#f97316',
            0.8, metric === 'profit' ? '#166534' : '#dc2626',
            1.0, metric === 'profit' ? '#052e16' : '#7f1d1d'
        ]);

        map.current.setPaintProperty('heat-layer', 'heatmap-opacity', opacity);
    }, [geoJsonData, metric, opacity, isLoaded]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <i className="bi bi-geo-alt-fill text-green-500"></i>
                        Radar Geográfico de Lucro
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">
                        Mapeamento Térmico de Performance - Curitiba e RMC
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {(['profit', 'value', 'count'] as MetricType[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    metric === m 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-105' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {m === 'profit' ? 'Lucro' : m === 'value' ? 'Venda' : 'Pedidos'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opacidade</span>
                        <input 
                            type="range" 
                            min="0.1" max="1" step="0.1" 
                            value={opacity} 
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>
                </div>
            </div>

            <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner z-0">
                <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
                
                {/* Legend Overlay */}
                <div className="absolute bottom-6 right-6 z-10 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex h-2 w-32 rounded-full overflow-hidden">
                                <div className="flex-1 bg-yellow-300"></div>
                                <div className="flex-1 bg-orange-500"></div>
                                <div className="flex-1 bg-red-600"></div>
                                <div className="flex-1 bg-red-900"></div>
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-white uppercase tracking-tighter">
                                <span>Baixo</span>
                                <span>{metric === 'profit' ? 'Lucro' : 'Volume'}</span>
                                <span>Alto</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitHeatMap;

