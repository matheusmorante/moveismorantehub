import { useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export function useConversationsRealtime(onTriggerReload: () => void) {
  useEffect(() => {
    let active = true;
    let channelGeneration = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const setupChannel = () => {
      if (!active) return;
      const generation = ++channelGeneration;
      const isCurrent = () => active && generation === channelGeneration;
      if (channel) void supabase.removeChannel(channel);

      channel = supabase
        .channel(`whatsapp-conversations-realtime-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapp_conversations' },
          () => {
            if (!isCurrent()) return;
            onTriggerReload();
          }
        )
        .subscribe((status) => {
          if (!isCurrent()) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = null;
          if (status === 'SUBSCRIBED') onTriggerReload();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            reconnectTimer = setTimeout(setupChannel, 3000);
          }
        });
    };

    setupChannel();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [onTriggerReload]);
}
