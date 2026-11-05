import React from 'react';
import { Link } from 'react-router-dom';

export const NavigationRailFooter: React.FC = () => (
  <div className="flex flex-col items-center gap-2.5 w-full">
    <Link
      to="/system-docs"
      title="Guia da Central"
      aria-label="Guia da Central"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
    >
      <i className="bi bi-book-half text-sm" aria-hidden="true" />
    </Link>
  </div>
);
