import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

interface LabelDeleteConfirmModalProps {
  isOpen: boolean;
  modelToDelete: string | null;
  onClose: () => void;
  onConfirm: (stillCurrent?: () => boolean) => Promise<boolean>;
  isSaving?: boolean;
  error?: string;
  blocked?: boolean;
}

const LabelDeleteConfirmDialog: React.FC<LabelDeleteConfirmModalProps & { modelToDelete: string }> = ({
  modelToDelete,
  onClose,
  onConfirm,
  isSaving = false,
  error = '',
  blocked = false,
}) => {
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState('');
  const mounted = useRef(false), locked = useRef(false), closed = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const busy = pending || isSaving;
  const close = () => {
    if (!mounted.current || locked.current || isSaving || closed.current) return;
    closed.current = true;
    onClose();
  };
  const confirm = async () => {
    if (locked.current || isSaving || blocked || closed.current) return;
    locked.current = true; setPending(true); setLocalError('');
    try {
      const confirmed = await onConfirm(() => mounted.current);
      if (!mounted.current || closed.current) return;
      if (confirmed === true) { closed.current = true; onClose(); }
      else setLocalError('A alteração do modelo não foi confirmada. Confira os dados e tente novamente.');
    } catch (cause) {
      if (mounted.current) setLocalError(cause instanceof Error ? cause.message : 'Não foi possível excluir o modelo.');
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const isSystemDefault = DEFAULT_LAYOUT_MODELS.some((m) => m.id === modelToDelete);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar exclusão do modelo"
      aria-busy={busy}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cancelar exclusão"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={close}
        disabled={busy}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="px-10 py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto mb-6">
            <i className="bi bi-trash3-fill text-3xl" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-3">
            Excluir Modelo?
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-relaxed px-4">
            {isSystemDefault
              ? 'Este modelo é padrão. Deseja apenas ocultá-lo da sua lista?'
              : 'Esta ação não pode ser desfeita. O layout será removido permanentemente.'}
          </p>
        </div>

        {(error || localError) && <p role="alert" className="px-10 pb-5 text-sm text-red-600">{error || localError}</p>}
        {busy && <p role="status" className="flex items-center gap-2 px-10 pb-5 text-sm text-blue-600"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />{isSystemDefault ? 'Ocultando modelo…' : 'Excluindo modelo…'}</p>}

        <div className="flex border-t border-slate-50 dark:border-slate-800">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { void confirm(); }}
            disabled={busy || blocked}
            className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-l border-slate-50 dark:border-slate-800"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export const LabelDeleteConfirmModal: React.FC<LabelDeleteConfirmModalProps> = (props) => {
  if (!props.isOpen || !props.modelToDelete) return null;
  return <LabelDeleteConfirmDialog key={props.modelToDelete} {...props} modelToDelete={props.modelToDelete} />;
};

export default LabelDeleteConfirmModal;
