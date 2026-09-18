import { useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';

export const useDashboardRealtime = (onUpdate: () => void) => {
  // Guarda a referência mais atual da função de update para evitar re-inscrições no canal
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let ordersDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const triggerUpdate = () => {
      if (ordersDebounceTimer) clearTimeout(ordersDebounceTimer);
      ordersDebounceTimer = setTimeout(() => {
        onUpdateRef.current();
      }, 1000); // Aumentamos o debounce para 1s para não sobrecarregar
    };

    // Usando NOME ESTÁTICO do canal para evitar vazamento de memória e sobrecarga do Realtime
    const ordersChannel = supabase
      .channel('mobile-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, triggerUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, triggerUpdate)
      .subscribe();

    return () => {
      if (ordersDebounceTimer) clearTimeout(ordersDebounceTimer);
      supabase.removeChannel(ordersChannel);
    };
  }, []); // Passamos array vazio para que ele crie o canal APENAS 1 vez no mount
};
