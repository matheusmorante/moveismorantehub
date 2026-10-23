if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    console.error(
      '🚨 [Google Maps API Error] Falha de autenticação! Verifique se a chave de API é válida e possui as APIs (Maps JS, Places, Geocoding, Directions) ativadas no Google Cloud Console.'
    );
  };
}

export const isGoogleQuotaError = (status: unknown): boolean => {
  const normalized = String(status || '').toUpperCase();
  return normalized.includes('OVER_QUERY_LIMIT') || normalized.includes('OVER_DAILY_LIMIT');
};

export const loadGoogleMapsApi = async (): Promise<void> => {
  const keyToUse = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string)?.trim() || '';

  if (!keyToUse || keyToUse.includes('REDACTED')) {
    throw new Error('Chave da API do Google Maps não configurada.');
  }

  if (
    (window as any).google?.maps?.places &&
    (window as any).google?.maps?.Geocoder &&
    typeof (window as any).google?.maps?.importLibrary === 'function'
  ) {
    return Promise.resolve();
  }
  if ((window as any).__googleMapsPromise) return (window as any).__googleMapsPromise;

  (window as any).__googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${keyToUse}&libraries=places&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const googleMaps = (window as any).google?.maps;
      if (
        googleMaps?.places &&
        googleMaps?.Geocoder &&
        typeof googleMaps?.importLibrary === 'function'
      ) {
        resolve();
        return;
      }

      (window as any).__googleMapsPromise = null;
      script.remove();
      reject(
        new Error(
          'A API do Google Maps carregou sem os serviços necessários. Verifique as APIs habilitadas para esta chave.'
        )
      );
    };
    script.onerror = (err) => {
      (window as any).__googleMapsPromise = null;
      script.remove();
      console.error('[loadGoogleMapsApi] Falha ao carregar script do Google Maps:', err);
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });
  return (window as any).__googleMapsPromise;
};
