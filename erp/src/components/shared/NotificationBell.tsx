import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    subscribeToNotifications,
    markAllAsRead,
    markAsRead,
    AppNotification
} from '../../pages/utils/notificationService';

const severityColor: Record<string, string> = {
    critical: 'text-red-500 dark:text-red-400',
    warning: 'text-amber-500 dark:text-amber-400',
    info: 'text-blue-500 dark:text-blue-400',
};

const severityBg: Record<string, string> = {
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
};

const severityBadge: Record<string, string> = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
};

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [, forceUpdate] = useState(0); // force re-render on read changes
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = subscribeToNotifications((notifs) => {
            setNotifications(notifs);
        });
        return () => unsub?.();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = useCallback(() => {
        markAllAsRead(notifications.map(n => n.id));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, [notifications]);

    const handleClickNotification = useCallback((notif: AppNotification) => {
        markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        forceUpdate(n => n + 1);
        if (notif.link) {
            navigate(notif.link);
        }
        setIsOpen(false);
    }, [navigate]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                id="notification-bell-btn"
                onClick={() => setIsOpen(prev => !prev)}
                className="relative w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Notificações"
            >
                <i className={`bi bi-bell-fill text-base ${unreadCount > 0 ? 'text-amber-500 dark:text-amber-400' : ''}`} />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 animate-bounce shadow-sm shadow-red-500/50">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-[360px] max-h-[520px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-[99999] flex flex-col overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                                <i className="bi bi-bell-fill text-white text-sm" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Notificações</h3>
                                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                                    {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Tudo lido'}
                                </p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                Marcar como lidas
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                                <i className="bi bi-bell-slash text-4xl opacity-20" />
                                <p className="text-xs font-bold">Nenhuma notificação</p>
                                <p className="text-[10px] text-slate-400/80">Tudo em ordem por aqui! ✨</p>
                            </div>
                        ) : (
                            <div className="p-3 flex flex-col gap-2">
                                {notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleClickNotification(notif)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${severityBg[notif.severity]} ${notif.read ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 shrink-0 ${severityColor[notif.severity]}`}>
                                                <i className={`bi ${notif.icon} text-lg`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white ${severityBadge[notif.severity]}`}>
                                                        {notif.severity === 'critical' ? 'Crítico' : notif.severity === 'warning' ? 'Atenção' : 'Info'}
                                                    </span>
                                                    {!notif.read && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Não lida" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 mb-0.5">{notif.title}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">{notif.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                            <p className="text-[10px] font-bold text-slate-400 text-center">
                                {notifications.length} notificação(ões) no total
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
