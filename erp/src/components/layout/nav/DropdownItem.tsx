import React from 'react';
import { Link } from 'react-router-dom';
import ReturnIcon from '../../shared/ReturnIcon';
import type { DropdownItemProps } from './navTypes';

export const DropdownItem: React.FC<DropdownItemProps> = ({
  to,
  href,
  icon,
  iconColor,
  title,
  description,
  beta,
  onClick,
}) => {
  const content = (
    <div className="flex items-center justify-between w-full group">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          {icon === 'bi-arrow-return-left' ? (
            <ReturnIcon className={`h-6 w-6 ${iconColor || 'text-orange-500'}`} />
          ) : (
            <i
              className={`${icon} text-[15px] ${iconColor || 'text-blue-500 dark:text-blue-400'} transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300`}
            />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
            {title}
            {beta && (
              <span className="text-[7px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded tracking-tighter uppercase">
                BETA
              </span>
            )}
          </span>
          {description && (
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
              {description}
            </span>
          )}
        </div>
      </div>
      <i className="bi bi-chevron-right text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" />
    </div>
  );

  const className =
    'p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300 min-h-[44px] cursor-pointer flex items-center select-none';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={to!} onClick={onClick} className={className}>
      {content}
    </Link>
  );
};

export default DropdownItem;
