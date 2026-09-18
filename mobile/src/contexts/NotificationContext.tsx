import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { registerPushToken, triggerLocalNotification, initPushTokenListeners } from '../services/notificationService';

interface NotificationContextProps {
  notifications: any[];
  unreadCount: number;
  handleOpenNotificationsModal: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('id, order_id, title, message, type, schedule_text, read, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        const formatted = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.created_at,
          timestamp: new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          scheduleText: n.schedule_text,
          order: n.order_id ? { id: n.order_id, __notificationOrderReference: true } : null,
          read: n.read
        }));
        setNotifications(formatted);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (err) {}
  };

  const handleOpenNotificationsModal = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await supabase.from('app_notifications').update({ read: true }).eq('read', false);
    } catch (err) {}
  };

  useEffect(() => {
    // Registra e sincroniza o push token do aparelho na montagem
    registerPushToken();
    const cleanTokenListeners = initPushTokenListeners();

    fetchNotifications();

    // Listener Realtime
    const notifChannel = supabase
      .channel('realtime-app-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, async (payload) => {
        const newNotif = payload.new;
        if (!newNotif) return;

        setNotifications(prev => [{
          id: newNotif.id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          createdAt: newNotif.created_at || new Date().toISOString(),
          timestamp: new Date(newNotif.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          scheduleText: newNotif.schedule_text,
          order: newNotif.order_id ? { id: newNotif.order_id, __notificationOrderReference: true } : null,
          read: false
        }, ...prev]);
        setUnreadCount(prev => prev + 1);

        triggerLocalNotification(
          newNotif.title || 'Móveis Morante',
          newNotif.message || 'Nova notificação de pedido',
          newNotif
        );
      })
      .subscribe();

    const pollingInterval = setInterval(() => {
      fetchNotifications();
    }, 300000);

    return () => {
      cleanTokenListeners();
      notifChannel.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      handleOpenNotificationsModal,
      fetchNotifications
    }}>
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
