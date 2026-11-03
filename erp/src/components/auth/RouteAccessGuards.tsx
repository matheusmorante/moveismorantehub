import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PendingApproval from '../../pages/PendingApproval';
import { canPerform } from '../../pages/utils/permissionService';
import { getProfileRoles } from '../../pages/utils/accessRoles';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isPending } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileAuth =
    searchParams.has('auth_email') ||
    searchParams.has('user_id') ||
    window.location.search.includes('auth_email') ||
    Boolean((window as any).ReactNativeWebView);

  if (loading && !isMobileAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10">
        <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">
          Sincronizando Sessão...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && !isMobileAuth) {
    return <Navigate to="/login" replace />;
  }

  if (isPending && !isMobileAuth) {
    return <PendingApproval />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileAuth =
    searchParams.has('auth_email') ||
    searchParams.has('user_id') ||
    window.location.search.includes('auth_email') ||
    Boolean((window as any).ReactNativeWebView);

  if (loading && !isMobileAuth) return null;

  if (!isAdmin && !isMobileAuth) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PermissionRoute = ({
  action,
  children,
}: {
  action: string;
  children?: React.ReactNode;
}) => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!canPerform(action, profile ? getProfileRoles(profile) : [])) {
    return <Navigate to="/" replace />;
  }

  return <>{children || <Outlet />}</>;
};

export { AdminRoute, PermissionRoute, ProtectedRoute };
