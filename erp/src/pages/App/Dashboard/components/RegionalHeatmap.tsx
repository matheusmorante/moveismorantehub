import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Order from '../../../types/order.type';
import { formatCurrency } from '../../../utils/formatters';
import { parseAddressString } from '../../../utils/addressParser';

interface RegionalHeatmapProps {
  orders: Order[];
}

type MetricType = 'profit' | 'value' | 'count';

// ─── EXTENDED NEIGHBORHOOD COORDINATES ───────────────────────────────────────
const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  // COLOMBO
  // COLOMBO
  GUARAITUBA: [-49.1725, -25.3614],
  MARACANÃ: [-49.1833, -25.3667],
  'ALTO MARACANÃ': [-49.18, -25.37],
  FÁTIMA: [-49.19, -25.375],
  'JARDIM AURORA': [-49.18, -25.355],
  'SÃO DIMAS': [-49.1911, -25.3475],
  PALMITAL: [-49.165, -25.345],
  'MONTE CASTELO': [-49.175, -25.35],
  ROESSNER: [-49.185, -25.36],
  'SÃO GABRIEL': [-49.2, -25.33],
  CABRAL: [-49.205, -25.335],
  'COLONIO FARIA': [-49.21, -25.32],
  ARRUDA: [-49.195, -25.34],
  CENTRO: [-49.2242, -25.2917],
  'RIO VERDE': [-49.188, -25.358],
  'CAMPO ALTO': [-49.178, -25.385],
  ATUBA: [-49.2, -25.38],
  'SÃO SEBASTIÃO': [-49.23, -25.31],
  OSASCO: [-49.195, -25.385],
  CASSAVERA: [-49.185, -25.34],

  // CURITIBA (Perto de Colombo)
  'SÍTIO CERCADO': [-49.2559, -25.539],
  'SÃO BRAZ': [-49.33, -25.42],
  'BOA VISTA': [-49.245, -25.39],
  BACACHERI: [-49.225, -25.4],
  BOQUEIRÃO: [-49.235, -25.5],
  'SANTA CÂNDIDA': [-49.22, -25.375],
  BARRERINHA: [-49.24, -25.375],
  ABRANCHES: [-49.26, -25.37],
  PILARZINHO: [-49.28, -25.385],
  CACHOEIRA: [-49.25, -25.35],
  TINGUI: [-49.22, -25.395],
  'BAIRRO ALTO': [-49.195, -25.41],
  TARUMÃ: [-49.21, -25.43],
  PINHEIRINHO: [-49.29, -25.51],

  // CIDADES VIZINHAS & BALSA NOVA
  'BALSA NOVA': [-49.6358, -25.5833],
  'BALSA NOVA - PR': [-49.6358, -25.5833],
  'BALSA NOVA CENTRO': [-49.6358, -25.5833],
  'MORADIAS IGUAÇO': [-49.63, -25.58],
  'MORADIAS IGUAÇU': [-49.63, -25.58],
  BUGRE: [-49.6333, -25.5333],
  'SÃO CAETANO': [-49.6583, -25.6033],
  SERRINHA: [-49.68, -25.62],
  RODEIOZINHO: [-49.7, -25.6],
  TAMANDUÁ: [-49.75, -25.55],
  'COLÔNIA MARIA JOSÉ': [-49.55, -25.52],
  'CAMPO LARGO': [-49.52, -25.45],
  'ÁGUAS CLARAS': [-49.53, -25.46],
  FERRARI: [-49.51, -25.44],
  ITAQUI: [-49.54, -25.47],

  // ALMIRANTE TAMANDARÉ & PINHAIS & OUTRAS
  'ALMIRANTE TAMANDARÉ': [-49.3, -25.32],
  'CACHOEIRA TAMANDARÉ': [-49.27, -25.33],
  PINHAIS: [-49.19, -25.43],
  'QUATRO BARRAS': [-49.07, -25.36],
  'CAMPINA GRANDE DO SUL': [-49.08, -25.3],
  ARAUCÁRIA: [-49.41, -25.59],
  'FAZENDA RIO GRANDE': [-49.3, -25.66],
  PIRAQUARA: [-49.06, -25.44],
  'SÃO JOSÉ DOS PINHAIS': [-49.2, -25.53],
  CIC: [-49.33, -25.5],
  'CIDADE INDUSTRIAL': [-49.33, -25.5],
  TATUQUARA: [-49.34, -25.57],
  GANCHINHO: [-49.28, -25.58],
  UMBARÁ: [-49.28, -25.58],

  // DEFAULT/FALLBACKS
  COLOMBO: [-49.2242, -25.2917],
  CURITIBA: [-49.2667, -25.4284],
};

const RegionalHeatmap = ({ orders = [] }: RegionalHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [metric, setMetric] = useState<MetricType>('value');
  const [opacity, setOpacity] = useState(0.8);
  const [isLoaded, setIsLoaded] = useState(false);

  const geoJsonData = useMemo(() => {
    const features: any[] = [];
    const neighborhoodStats: Record<
      string,
      { count: number; value: number; profit: number; coords: [number, number] }
    > = {};

    orders.forEach((order) => {
      let neighborhood = (order.customerData?.fullAddress?.neighborhood || '').trim();
      if (
        !neighborhood &&
        typeof order.customerData?.fullAddress?.street === 'string' &&
        order.customerData.fullAddress.street.includes(',')
      ) {
        const parsed = parseAddressString(order.customerData.fullAddress.street);
        neighborhood = parsed.neighborhood;
      }

      const cleanNeighborhood = neighborhood.toUpperCase().replace(/[-.,]/g, '').trim();
      if (!cleanNeighborhood) return;

      let coords = NEIGHBORHOOD_COORDS[cleanNeighborhood];
      if (!coords) {
        const match = Object.keys(NEIGHBORHOOD_COORDS).find(
          (key) => cleanNeighborhood.includes(key) || key.includes(cleanNeighborhood)
        );
        if (match) coords = NEIGHBORHOOD_COORDS[match];
      }

      if (!coords) return;

      if (!neighborhoodStats[cleanNeighborhood]) {
        neighborhoodStats[cleanNeighborhood] = { count: 0, value: 0, profit: 0, coords };
      }

      const orderValue = order.paymentsSummary?.totalOrderValue || 0;
      const orderCost = order.itemsSummary?.totalItemsCost || 0;

      neighborhoodStats[cleanNeighborhood].count += 1;
      neighborhoodStats[cleanNeighborhood].value += orderValue;
      neighborhoodStats[cleanNeighborhood].profit += orderValue - orderCost;
    });

    Object.entries(neighborhoodStats).forEach(([name, stats]) => {
      features.push({
        type: 'Feature',
        properties: {
          name,
          count: stats.count,
          value: stats.value,
          profit: stats.profit,
        },
        geometry: {
          type: 'Point',
          coordinates: stats.coords,
        },
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [orders]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-49.2671, -25.429], // Centralizado em Curitiba conforme pedido
      zoom: 11,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('orders-data', {
        type: 'geojson',
        data: geoJsonData,
      });

      // Camada de Heatmap Estilo Meteorológico
      map.current.addLayer({
        id: 'orders-heat',
        type: 'heatmap',
        source: 'orders-data',
        maxzoom: 15,
        paint: {
          // Peso baseado na métrica
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', metric],
            0,
            0,
            1000,
            1, // Normalização básica, será ajustada dinamicamente
          ],
          // Intensidade do heatmap com o zoom
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          // Paleta de Cores Meteorológica
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.2,
            metric === 'profit' ? '#fde047' : '#fde047', // Amarelo
            0.4,
            metric === 'profit' ? '#84cc16' : '#f97316', // Lima vs Laranja
            0.6,
            metric === 'profit' ? '#22c55e' : '#ea580c', // Verde vs Laranja Escuro
            0.8,
            metric === 'profit' ? '#166534' : '#dc2626', // Verde Escuro vs Vermelho
            1.0,
            metric === 'profit' ? '#052e16' : '#991b1b', // Lucro Máximo vs Vermelho Dark
          ],
          // Raio do Heatmap (Visual de Nuvem)
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20, 15, 40],
          // Opacidade controlada pelo usuário
          'heatmap-opacity': opacity,
        },
      });

      setIsLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const source = map.current.getSource('orders-data') as maplibregl.GeoJSONSource;
    if (source) source.setData(geoJsonData);

    // Atualiza gradiente e peso com base na métrica
    const maxValue = Math.max(...geoJsonData.features.map((f) => f.properties[metric]), 1);

    map.current.setPaintProperty('orders-heat', 'heatmap-weight', [
      'interpolate',
      ['linear'],
      ['get', metric],
      0,
      0,
      maxValue,
      1,
    ]);

    map.current.setPaintProperty('orders-heat', 'heatmap-color', [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(0,0,0,0)',
      0.2,
      '#fde047', // Amarelo (Início)
      0.5,
      metric === 'profit' ? '#84cc16' : '#f97316', // Lima vs Laranja
      0.8,
      metric === 'profit' ? '#166534' : '#dc2626', // Verde Escuro vs Vermelho
      1.0,
      metric === 'profit' ? '#052e16' : '#7f1d1d', // Lucro Máximo vs Vermelho Dark
    ]);

    map.current.setPaintProperty('orders-heat', 'heatmap-opacity', opacity);
  }, [geoJsonData, metric, opacity, isLoaded]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl h-[650px] flex flex-col relative">
      <div className="absolute top-8 left-8 z-10 space-y-4 pointer-events-none">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl pointer-events-auto max-w-xs">
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic leading-none">
            Radar de <span className="text-emerald-500">Lucro</span>
          </h3>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2 opacity-80">
            Mapa de Performance Térmica
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {(['value', 'profit', 'count'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${metric === m ? 'bg-slate-800 dark:bg-emerald-500 text-white shadow-xl scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:scale-102'}`}
              >
                <span>
                  {m === 'value'
                    ? 'Faturamento'
                    : m === 'profit'
                      ? 'Lucro Bruto'
                      : 'Volume Pedidos'}
                </span>
                {metric === m && <i className="bi bi-check-circle-fill"></i>}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
              <span>Opacidade da Nuvem</span>
              <span>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
          <i className="bi bi-geo-alt-fill text-emerald-500"></i>
          <span>{geoJsonData.features.length} Regiões Ativas</span>
        </div>
      </div>

      {geoJsonData.features.length === 0 && (
        <div className="absolute inset-0 z-20 bg-slate-100/10 dark:bg-slate-950/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-md animate-bounce-slow">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
              <i className="bi bi-geo-alt-fill text-3xl text-slate-400"></i>
            </div>
            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
              Nenhum Bairro Localizado
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Não encontramos bairros mapeados nos pedidos deste período. Verifique se os endereços
              estão cadastrados corretamente.
            </p>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="flex-1 w-full filter grayscale-[0.2] brightness-110 contrast-110"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .marker-disk:hover {
                    transform: scale(1.4);
                    z-index: 100 !important;
                    background: white !important;
                    color: black !important;
                }
                .marker-disk:hover span {
                    color: black !important;
                    text-shadow: none !important;
                }
                .premium-popup .maplibregl-popup-content {
                    background: transparent !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
                    border-top-color: #0f172a !important;
                }
            `,
        }}
      />
    </div>
  );
};

export default RegionalHeatmap;
