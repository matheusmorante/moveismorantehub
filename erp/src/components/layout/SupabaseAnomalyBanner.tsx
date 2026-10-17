import { Link } from 'react-router-dom';
import { SupabaseAnomalyNotification } from './types';

interface SupabaseAnomalyBannerProps {
  anomaly: SupabaseAnomalyNotification | null;
  onDismiss: () => void;
}

export default function SupabaseAnomalyBanner({
  anomaly,
  onDismiss,
}: SupabaseAnomalyBannerProps) {
  if (!anomaly) return null;

  const isCritical = anomaly.level === 'CRITICAL';

  return (
    <div
      role="alert"
      className={`w-full ${
        isCritical ? 'bg-red-600' : 'bg-amber-500'
      } text-white px-4 py-2 flex items-center justify-between text-xs font-bold animate-slide-down z-[999999]`}
    >
      <div className="flex items-center gap-3">
        <i
          className={`bi ${
            isCritical ? 'bi-exclamation-octagon-fill' : 'bi-exclamation-triangle-fill'
          } text-lg`}
        ></i>
        <div>
          <span className="block font-black uppercase tracking-wide">{anomaly.title}</span>
          <span className="block opacity-90 font-medium">{anomaly.message}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/settings/supabase-monitor"
          onClick={onDismiss}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/20 backdrop-blur-sm shadow-sm whitespace-nowrap"
        >
          Ver Diagnóstico
        </Link>
        <button
          onClick={onDismiss}
          aria-label="Fechar alerta"
          className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  );
}
