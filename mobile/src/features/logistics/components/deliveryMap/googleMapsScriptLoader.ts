declare global {
  interface Window {
    google?: any;
    __googleMapsScriptPromise?: Promise<void> | null;
  }
}

/**
 * Carregador resiliente do script da Google Maps JavaScript API na Web
 */
export async function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.maps) return;
  if (window.__googleMapsScriptPromise) return window.__googleMapsScriptPromise;

  window.__googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      window.__googleMapsScriptPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return window.__googleMapsScriptPromise;
}
