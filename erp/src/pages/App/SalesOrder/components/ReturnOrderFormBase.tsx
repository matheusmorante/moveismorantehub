import type { ReactNode } from 'react';
import { Tag } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  overlays?: ReactNode;
};

const ReturnOrderFormBase = ({ title, subtitle, onClose, children, footer, overlays }: Props) => {
  return (
    <div className="fixed inset-0 z-[999999] flex items-stretch justify-center p-0 xl:items-center xl:p-4">
      <button
        type="button"
        aria-label={`Fechar ${title} pelo fundo`}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-order-title"
        tabIndex={-1}
        className="relative z-10 flex h-full w-full max-w-none flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="return-order-title" className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar ${title}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
        </header>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">{children}</div>
        {footer}
      </div>
      {overlays}
    </div>
  );
};

export default ReturnOrderFormBase;
