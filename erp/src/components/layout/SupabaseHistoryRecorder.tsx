import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import {
  recordSupabaseAnomaly,
  startMassLoadHistorySync,
} from '@/services/monitoring/massLoadHistoryService';
import type { SupabaseAnomalyNotification } from './types';

/** Records alerts for every authenticated ERP route, independently of banner visibility. */
export function SupabaseHistoryRecorder() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const onAnomaly = (event: Event) =>
      recordSupabaseAnomaly((event as CustomEvent<SupabaseAnomalyNotification>).detail, user.id);
    const onStorageError = () =>
      toast.error('Não foi possível guardar o alerta neste navegador para sincronização.');

    window.addEventListener('SUPABASE_ANOMALY', onAnomaly);
    window.addEventListener('SUPABASE_ANOMALY_HISTORY_STORAGE_ERROR', onStorageError);
    const stopSync = startMassLoadHistorySync(user.id);
    return () => {
      window.removeEventListener('SUPABASE_ANOMALY', onAnomaly);
      window.removeEventListener('SUPABASE_ANOMALY_HISTORY_STORAGE_ERROR', onStorageError);
      stopSync();
    };
  }, [user?.id]);

  return null;
}
