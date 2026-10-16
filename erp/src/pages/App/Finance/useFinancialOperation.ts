import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors } from '@/hooks/useZodForm';
import type { FieldErrors } from 'react-hook-form';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export class FinancialUnconfirmedError extends Error {
  constructor() { super('Não foi possível confirmar a gravação. Consulte a conta ou o histórico antes de repetir.'); }
}

/** One lock covers the different resolver intents of the same owner. */
export function useFinancialOperation() {
  const locked = useRef(false);
  const mounted = useRef(false);
  const uncertainRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current;
  const invalid = (errors: FieldErrors) => {
    const message = Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.';
    if (current()) setError(message);
    return message;
  };
  // Call this *inside* onValid so RHF also releases isSubmitting on timeout.
  const wait = async <T,>(promise: PromiseLike<T>): Promise<T> => {
    let response: { value: T } | null;
    try {
      response = await withTimeout(Promise.resolve(promise).then((value) => ({ value })), 30_000, null, 'financeiro:gravar');
    } catch (cause) {
      // A rejected transport is not evidence that the server rolled back.
      const remote = cause as { uncertain?: boolean; code?: string; message?: string } | null;
      if (cause instanceof TypeError || remote?.uncertain === true || remote?.code === ''
        || remote?.code === 'PGRST116'
        || (typeof remote?.message === 'string' && /fetch|network|timeout|abort|bad gateway|service unavailable|unexpected.*json/i.test(remote.message))) throw new FinancialUnconfirmedError();
      throw cause;
    }
    if (!response) throw new FinancialUnconfirmedError();
    return response.value;
  };
  const run = async (submit: () => Promise<unknown>) => {
    if (locked.current || uncertainRef.current || !current()) return;
    locked.current = true; setBusy(true); setError('');
    try { await submit(); }
    catch (cause) {
      if (!current()) return;
      const unknown = cause instanceof FinancialUnconfirmedError;
      if (unknown) { uncertainRef.current = true; setUncertain(true); }
      const code = (cause as { code?: string } | null)?.code;
      setError(unknown ? cause.message
        : code === '22023' ? 'A conta mudou ou precisa de conciliação. Atualize a consulta antes de repetir.'
          : code === '42501' ? 'Você não tem permissão para esta operação financeira.'
            : code === 'PGRST202' ? 'Esta operação financeira ainda não está disponível. Solicite a atualização ao administrador.'
              : 'Não foi possível salvar. Confira os dados e as permissões.');
    } finally {
      locked.current = false;
      if (current()) setBusy(false);
    }
  };
  return { run, wait, invalid, current, isBusy: () => locked.current, busy, error, uncertain, blocked: busy || uncertain };
}
