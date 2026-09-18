import { useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

export const useDashboardRealtime = (onUpdate: () => void) => {
  useEffect(() => {
    let ordersDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const triggerUpdate = () => {
      if (ordersDebounceTimer) clearTimeout(ordersDebounceTimer);
      ordersDebounceTimer = setTimeout(() => {
        onUpdate();
      }, 400);
    };

    const ordersChannel = supabase
      .channel(`mobile-orders-sync-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, triggerUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, triggerUpdate)
      .subscribe();

    return () => {
      if (ordersDebounceTimer) clearTimeout(ordersDebounceTimer);
      ordersChannel.unsubscribe();
    };
  }, [onUpdate]);
};
