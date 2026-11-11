import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  registerPushToken,
  triggerLocalNotification,
  initPushTokenListeners,
} from '../services/notificationService';
import { fetchAppNotificationSummaries } from '../services/appNotificationQuery';
import { AppState } from 'react-native';
import {
  APP_NOTIFICATION_REALTIME_EVENT,
  APP_NOTIFICATION_REALTIME_TOPIC,
} from '../../../shared-utils/appNotificationRealtime';

interface NotificationContextProps {
  notifications: any[];
  unreadCount: number;
  handleOpenNotificationsModal: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter((entry) => !entry.read).length;
  const pendingFetch = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const readRevision = useRef(0);
  const inserts = useRef(new Map<string, any>());
  const seen = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  const signedOut = useRef(false);
  const format = (n: any) => ({
    id: n.id, title: n.title, message: n.message, type: n.type, createdAt: n.created_at,
    timestamp: new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    scheduleText: n.schedule_text,
    order: n.order_id ? { id: n.order_id, __notificationOrderReference: true } : null,
    read: Boolean(n.read),
  });

  const fetchNotifications = async () => {
    if (signedOut.current) return;
    if (pendingFetch.current) return pendingFetch.current;
    const current = generation.current, readAtStart = readRevision.current;
    const requestController = new AbortController(); controller.current = requestController;
    inserts.current.clear();
    const request = (async () => {
      try {
        const visible = await fetchAppNotificationSummaries(requestController.signal);
        if (current !== generation.current || requestController.signal.aborted) return;
        const rows = new Map(visible.map((row) => [String(row.id), format(row)]));
        inserts.current.forEach((row, id) => rows.set(id, row));
        const formatted = [...rows.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.id).localeCompare(String(a.id))).slice(0, 50);
        formatted.forEach((row) => seen.current.add(String(row.id)));
        setNotifications(formatted.map((row) => readAtStart === readRevision.current ? row : { ...row, read: true }));
      } catch { /* Preserve the current list until reconnect or the next refresh. */ }
    })();
    pendingFetch.current = request;
    try { await request; } finally { if (pendingFetch.current === request) pendingFetch.current = null; }
  };

  const handleOpenNotificationsModal = async () => {
    readRevision.current++;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await supabase.from('app_notifications').update({ read: true }).eq('read', false);
    } catch (err) {}
  };

  useEffect(() => {
    // Registra e sincroniza o push token do aparelho na montagem
    registerPushToken();
    const cleanTokenListeners = initPushTokenListeners();

    fetchNotifications();

    // Broadcast compacto evita transportar order_data; o pedido completo é lido ao abrir.
    const notifChannel = supabase
      .channel(APP_NOTIFICATION_REALTIME_TOPIC, { config: { private: true } })
      .on(
        'broadcast',
        { event: APP_NOTIFICATION_REALTIME_EVENT },
        ({ payload }) => {
          const newNotif = payload;
          if (signedOut.current || !newNotif?.id) return;

          if (seen.current.has(String(newNotif.id))) return;
          seen.current.add(String(newNotif.id));
          if (seen.current.size > 500) seen.current = new Set([...seen.current].slice(-100));
          const formatted = format(newNotif);
          inserts.current.set(String(newNotif.id), formatted);
          setNotifications((prev) => [formatted, ...prev.filter((row) => row.id !== formatted.id)].slice(0, 50));

          triggerLocalNotification(
            newNotif.title || 'Móveis Morante',
            newNotif.message || 'Nova notificação de pedido',
            newNotif
          );
        }
      )
      .subscribe((status) => { if (status === 'SUBSCRIBED') void fetchNotifications(); });

    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void fetchNotifications(); });
    const auth = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        signedOut.current = event === 'SIGNED_OUT';
        generation.current++; controller.current?.abort(); pendingFetch.current = null;
        inserts.current.clear(); seen.current.clear(); setNotifications([]);
        if (event === 'SIGNED_IN') void fetchNotifications();
      }
    });
    return () => {
      generation.current++; controller.current?.abort();
      foreground.remove(); auth.data.subscription.unsubscribe();
      cleanTokenListeners();
      notifChannel.unsubscribe();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        handleOpenNotificationsModal,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useAppNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useAppNotifications must be used within a NotificationProvider');
  }
  return context;
};
