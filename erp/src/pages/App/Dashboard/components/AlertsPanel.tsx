import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  AppNotification,
  NotificationSeverity,
} from '../../../../pages/utils/notificationService';

const severityConfig: Record<
  NotificationSeverity,
  {
    bg: string;
    border: string;
    icon: string;
    badge: string;
    badgeText: string;
    label: string;
  }
> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-900/30',
    icon: 'text-red-500 dark:text-red-400',
    badge: 'bg-red-500 text-white',
    badgeText: 'Crítico',
    label: 'Crítico',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-900/30',
    icon: 'text-amber-500 dark:text-amber-400',
    badge: 'bg-amber-500 text-white',
    badgeText: 'Atenção',
    label: 'Atenção',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-900/30',
    icon: 'text-blue-500 dark:text-blue-400',
    badge: 'bg-blue-500 text-white',
    badgeText: 'Info',
    label: 'Info',
  },
};

interface Props {
  maxItems?: number;
}

const AlertsPanel: React.FC<Props> = ({ maxItems = 5 }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToNotifications((notifs: AppNotification[]) => {
      setNotifications(notifs);
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const unread = notifications.filter((n) => !n.read);
  const criticalCount = unread.filter((n) => n.severity === 'critical').length;
  const warningCount = unread.filter((n) => n.severity === 'warning').length;

  const handleRead = (id: string) => {
    markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleReadAll = () => {
    markAllAsRead(notifications.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) return null;
  if (notifications.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${criticalCount > 0 ? 'bg-red-500 shadow-red-200/50 dark:shadow-red-900/30' : warningCount > 0 ? 'bg-amber-500 shadow-amber-200/50 dark:shadow-amber-900/30' : 'bg-blue-500 shadow-blue-200/50 dark:shadow-blue-900/30'}`}
          >
            <i className="bi bi-exclamation-circle-fill text-white text-lg" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
              Alertas do Sistema
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {criticalCount > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {criticalCount} Crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  {warningCount} Atenção
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
            <button
              onClick={handleReadAll}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Limpar
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
          >
            <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'} text-sm`} />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      {!collapsed && (
        <div className="p-4 flex flex-col gap-2.5">
          {notifications.slice(0, maxItems).map((notif) => {
            const cfg = severityConfig[notif.severity];
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${cfg.bg} ${cfg.border} ${notif.read ? 'opacity-50' : ''}`}
              >
                <i className={`bi ${notif.icon} text-xl mt-0.5 shrink-0 ${cfg.icon}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}
                    >
                      {cfg.badgeText}
                    </span>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                    {notif.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      onClick={() => handleRead(notif.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
                      title="Ver"
                    >
                      <i className="bi bi-arrow-right text-sm" />
                    </Link>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => handleRead(notif.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
                      title="Marcar como lida"
                    >
                      <i className="bi bi-check-lg text-sm" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {notifications.length > maxItems && (
            <Link
              to="/registrations/products"
              className="flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <i className="bi bi-arrow-right" />
              Ver todas ({notifications.length - maxItems} restantes)
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
