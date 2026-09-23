import { supabase } from './supabaseClient';

type ChangeHandler = () => void;

type LogisticsChannel = ReturnType<typeof supabase.channel>;

const subscribers = new Map<ChangeHandler, number>();
let channel: LogisticsChannel | null = null;
let channelRemoval: Promise<unknown> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const requestRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    subscribers.forEach((_count, onChange) => onChange());
  }, 3000);
};

const startChannel = () => {
  if (channel || subscribers.size === 0) return;
  if (channelRemoval) {
    const pendingRemoval = channelRemoval;
    void pendingRemoval.then(() => {
      if (channelRemoval === pendingRemoval) channelRemoval = null;
      startChannel();
    });
    return;
  }

  channel = supabase
    .channel('mobile-logistics-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, requestRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, requestRefresh)
    .subscribe();
};

/** Compartilha um único canal e distribui mudanças aos consumidores ativos. */
export const subscribeToLogisticsChanges = (onChange: ChangeHandler) => {
  subscribers.set(onChange, (subscribers.get(onChange) ?? 0) + 1);
  startChannel();

  return () => {
    const count = subscribers.get(onChange) ?? 0;
    if (count > 1) {
      subscribers.set(onChange, count - 1);
      return;
    }
    subscribers.delete(onChange);

    if (subscribers.size > 0 || !channel) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;

    const channelToRemove = channel;
    channel = null;
    const pendingRemoval = supabase.removeChannel(channelToRemove);
    channelRemoval = pendingRemoval;
    void pendingRemoval.then(() => {
      if (channelRemoval === pendingRemoval) channelRemoval = null;
      startChannel();
    });
  };
};
