import { supabase } from './supabaseClient';

type ChangeHandler = () => void;

/** Atualiza cronograma e montagens após qualquer alteração que afete a logística. */
export const subscribeToLogisticsChanges = (onChange: ChangeHandler) => {
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const requestRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(onChange, 250);
  };

  const channel = supabase
    .channel(`mobile-logistics-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, requestRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, requestRefresh)
    .subscribe();

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    supabase.removeChannel(channel);
  };
};
