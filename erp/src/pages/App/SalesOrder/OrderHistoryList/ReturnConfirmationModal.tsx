import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

const returnDraftConfirmationSchema = z.object({
  reviewSecondsLeft: z.number().int().min(0).max(0, 'Aguarde a revisão antes de continuar.'),
});
import { createPortal } from 'react-dom';

interface ReturnConfirmationModalProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void | boolean | Promise<void | boolean>;
}

const ReturnConfirmationModal = ({ onCancel, onConfirm }: ReturnConfirmationModalProps) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true), inFlight = useRef(false), completed = useRef(false), uncertain = useRef(false);
  const values = { reviewSecondsLeft: secondsLeft };
  const form = useZodForm(returnDraftConfirmationSchema, values);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const close = () => { if (!inFlight.current) onCancel(); };
  const confirm = async () => {
    if (inFlight.current || completed.current || uncertain.current) return;
    inFlight.current = true;
    setSaving(true); setError('');
    try {
      await form.validateAndRun(values, async (parsed) => {
        if (!active.current || parsed.reviewSecondsLeft !== 0) return false;
        const result = await withTimeout(Promise.resolve(onConfirm()).then((ack) => ({ ack })), 30_000, null, 'abertura do rascunho de devolução');
        if (!result) {
          uncertain.current = true;
          if (active.current) setError('A abertura não foi confirmada. Confira a devolução antes de repetir.');
          return false;
        }
        if (result.ack === false) {
          if (active.current) setError('Não foi possível abrir a devolução. Tente novamente.');
          return false;
        }
        completed.current = true;
        return true;
      }, (errors) => { if (active.current) setError(Object.values(flattenFormErrors(errors))[0]); });
    } catch {
      uncertain.current = true;
      if (active.current) setError('A abertura não foi confirmada. Confira a devolução antes de repetir.');
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inFlight.current) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar confirmação de devolução"
        className="fixed inset-0 bg-slate-950/55 transition-opacity"
        onClick={close}
        disabled={saving}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-confirmation-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/70 dark:bg-slate-900"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <i className="bi bi-arrow-return-left text-xl" />
        </div>
        <h2
          id="return-confirmation-title"
          className="text-base font-black text-slate-800 dark:text-slate-100"
        >
          Gerar devolução?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          A devolução cria um registro próprio. Nele você escolherá os itens e as quantidades
          devolvidos. O valor final e a quantidade definidos para cada item serão descontados desta
          venda nas análises e relatórios.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          A movimentação de saída original permanece preservada. Quando a devolução ficar como
          Devolvido, a entrada correspondente será registrada no estoque{' '}
          <strong>apenas para produtos cadastrados</strong>. Itens sem cadastro no sistema não geram
          movimentação de estoque.
        </p>
        {error && <p role="alert">{error}</p>}
        {saving && <p role="status">Abrindo rascunho de devolução...</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={secondsLeft > 0 || saving || completed.current || uncertain.current}
            onClick={() => void confirm()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-700"
          >
            {secondsLeft > 0 ? `Aguarde ${secondsLeft}s` : 'Sim, continuar'}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ReturnConfirmationModal;
