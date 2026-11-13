import React, { memo } from 'react';

export interface NavigationRailItemProps {
  icon: string;
  imageSrc?: string;
  title: string;
  isActive?: boolean;
  activeAppearance?: 'filled' | 'circular-outline';
  badgeCount?: number;
  onClick?: () => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

export const NavigationRailItem: React.FC<NavigationRailItemProps> = memo(({
  icon,
  imageSrc,
  title,
  isActive = false,
  activeAppearance = 'filled',
  badgeCount = 0,
  onClick,
  ariaLabel,
  ariaExpanded,
  ariaControls,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`relative w-10 h-10 flex items-center justify-center transition-all cursor-pointer ${
        activeAppearance === 'circular-outline'
          ? `rounded-full border-2 ${isActive
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`
          : `rounded-xl ${isActive
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`
      }`}
    >
      {imageSrc ? (
        <div className="relative h-9 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-xs dark:border-slate-900">
          <img
            src={imageSrc}
            alt=""
            className="absolute left-1/2 top-1/2 h-[56px] w-[56px] max-w-none object-cover"
            style={{ transform: 'translate(-50%, -32.6%)' }}
            aria-hidden="true"
            onError={({ currentTarget }) => { currentTarget.src = '/lizandro.png'; }}
          />
        </div>
      ) : (
        <i className={`bi ${icon} text-base`} aria-hidden="true" />
      )}
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
});

NavigationRailItem.displayName = 'NavigationRailItem';
