import { UserRole } from '@/context/AuthContext';
import { roleLabel } from '@/pages/utils/accessRoles';

interface ActiveRoleBannerProps {
  activeRoleMode: UserRole | null;
  onExitRoleMode: () => void;
}

export default function ActiveRoleBanner({
  activeRoleMode,
  onExitRoleMode,
}: ActiveRoleBannerProps) {
  if (!activeRoleMode) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-14 xl:top-16 z-[99998] flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-bold">
        <i className="bi bi-person-badge-fill shrink-0 text-amber-600 dark:text-amber-300" />
        <span className="truncate">Modo {roleLabel(activeRoleMode)}</span>
      </div>
      <button
        type="button"
        onClick={onExitRoleMode}
        className="shrink-0 rounded-lg border border-amber-400/70 px-3 py-1.5 text-[11px] font-black transition-colors hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900 cursor-pointer"
      >
        Sair do modo
      </button>
    </div>
  );
}
