import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSettings } from '@/pages/utils/settingsService';
import { autoCalculateRouteDistance, type RouteResult } from '@/pages/utils/maps';
import { formatCurrency } from '@/pages/utils/formatters';
import { AddressAutocompleteInput } from '@/components/shared/AddressAutocompleteInput';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { routeDistanceResultSchema, routeFreightFormSchema } from '../../../../../../shared-utils/routeFormSchemas';
import { mergeAddressSelection, changeAddressField, type SelectedAddress, type AddressSelectionBaseline } from '../../../../../../shared-utils/addressSelection';

const FreightCalculation = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<{ route: RouteResult; freight: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [addressForm, setAddressForm] = useState({ street: '', number: '', neighborhood: '', city: 'Colombo', state: 'PR', cep: '', complement: '', observation: '' });
  const routeResult = calculation?.route || null;
  const form = useZodForm(routeFreightFormSchema, addressForm);
  const latestValues = useRef(addressForm); latestValues.current = addressForm;
  const revision = useRef(0);
  const active = useRef<{ context: string; revision: number } | null>(null);
  const mounted = useRef(true);
  const context = JSON.stringify(addressForm);
  const previousContext = useRef(context);
  const settings = getSettings();
  const origin: [number, number] = settings.storeOriginCoords;
  useEffect(() => {
    if (previousContext.current === context) return;
    previousContext.current = context; revision.current += 1; active.current = null;
    setLoading(false); setCalculation(null); setError(null);
  }, [context]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; revision.current += 1; };
  }, []);
  const applyAddress = (data: SelectedAddress, baseline?: AddressSelectionBaseline) => setAddressForm((current) => mergeAddressSelection(current, data, baseline));
  const calculateFreight = async () => {
    const snapshot = latestValues.current;
    const context = JSON.stringify(snapshot);
    if (active.current?.context === context) return;
    const requestRevision = ++revision.current;
    active.current = { context, revision: requestRevision };
    setLoading(true); setError(null); setCalculation(null);
    try {
      const address = await form.validateValues(snapshot, (errors) => {
        if (mounted.current && requestRevision === revision.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira o endereço informado.');
      });
      if (!address || !mounted.current || requestRevision !== revision.current) return;
      const response = await withTimeout(autoCalculateRouteDistance(address), 15_000, null, 'frete:calcular-rota');
      if (!mounted.current || requestRevision !== revision.current) return;
      const result = routeDistanceResultSchema.safeParse(response);
      if (!result.success) { setError('Não foi possível obter uma rota válida. Confira o endereço ou tente novamente.'); return; }
      const freight = calculateFreightByDistance(result.data.distanceKm);
      if (!Number.isFinite(freight) || freight < 0) { setError('O cálculo retornou um frete inválido. Confira a configuração e tente novamente.'); return; }
      setCalculation({ route: { ...result.data, routeGeoJSON: result.data.routeGeoJSON ?? null }, freight });
    } catch {
      if (mounted.current && requestRevision === revision.current) setError('Não foi possível calcular a rota. Confira o endereço ou tente novamente.');
    } finally {
      if (active.current?.revision === requestRevision) active.current = null;
      if (mounted.current && requestRevision === revision.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: origin,
      zoom: 12,
      attributionControl: false,
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
              geometry: routeResult.routeGeoJSON,
            },
          });

          map.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });

          const bounds = new maplibregl.LngLatBounds();
          bounds.extend(origin);
          bounds.extend(routeResult.destinationCoords);
          routeResult.routeGeoJSON.coordinates.forEach((coord: [number, number]) =>
            bounds.extend(coord)
          );
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
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Cálculo de Frete
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Simulação de custos logísticos por distância
            </p>
          </div>

          {routeResult && (
            <div className="flex gap-4 animate-fade-in">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-0.5">
                  Distância
                </p>
                <p className="text-lg font-black text-blue-700 dark:text-blue-300 tracking-tight">
                  {routeResult.distanceKm} km
                </p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                  Valor Sugerido
                </p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                  {formatCurrency(calculation?.freight ?? 0)}
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
            <AddressAutocompleteInput
              value={searchText} addressValue={addressForm} onChange={setSearchText} onSelectAddress={applyAddress}
              cityHint={addressForm.city} stateHint={addressForm.state}
              label="Digite o Endereço para Pesquisa Rápida" placeholder="Ex: R. Cascavel, Colombo..."
              className="relative group"
              inputClassName="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <AddressAutocompleteInput
                value={addressForm.street}
                onChange={(val) => setAddressForm((current) => changeAddressField(current, 'street', val))}
                addressValue={addressForm}
                onSelectAddress={applyAddress}
                cityHint={addressForm.city}
                stateHint={addressForm.state || 'PR'}
                label="Rua"
                className="md:col-span-2"
                inputClassName="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100"
              />
              <div>
                <label htmlFor="route-number" className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                  Nº
                </label>
                <input
                  id="route-number"
                  type="text"
                  value={addressForm.number}
                  onChange={(e) => { const value = e.target.value; setAddressForm((current) => changeAddressField(current, 'number', value)); }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold"
                />
              </div>
              <div>
                <label htmlFor="route-neighborhood" className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                  Bairro
                </label>
                <input
                  id="route-neighborhood"
                  type="text"
                  value={addressForm.neighborhood}
                  onChange={(e) => { const value = e.target.value; setAddressForm((current) => changeAddressField(current, 'neighborhood', value)); }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Cidade:{' '}
                  </span>
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                    {addressForm.city}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    UF:{' '}
                  </span>
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                    {addressForm.state}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void calculateFreight()}
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
              <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-fade-in">
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
