import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { hmlCsosnConfigurationSchema, hmlCsosnFormSchema } from '../../../../../../../shared-utils/fiscalOperationFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { CSOSN_OPTIONS } from '../../../../utils/nfe/fiscalConstants';
import {
  getHmlCsosnConfiguration,
  saveHmlCsosnConfiguration,
} from '../../../../utils/nfe/csosnConfigurationService';

export function HmlCsosnSettings() {
  const [csosn, setCsosn] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const form = useZodForm(hmlCsosnFormSchema, { csosn });
  const active = useRef(true), inFlight = useRef(false), uncertain = useRef(false);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<'load' | 'save'>('load');
  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setPhase('load'); setError('');
    try {
      const response = await withTimeout(getHmlCsosnConfiguration(), 15_000, null, 'Leitura do CSOSN de homologação');
      if (!active.current) return;
      const parsed = hmlCsosnConfigurationSchema.safeParse(response);
      if (!parsed.success) throw new Error('A configuração de homologação não foi confirmada. Tente carregar novamente.');
      setCsosn(parsed.data.csosn); setSaved(parsed.data.csosn); setReady(true);
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a configuração.'); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  };
  useEffect(() => {
    active.current = true; void load();
    return () => { active.current = false; };
    // The initial query belongs to this mounted settings panel.
  }, []);
  const save = async () => {
    if (inFlight.current || !ready || uncertain.current) return;
    inFlight.current = true; setBusy(true); setPhase('save'); setError('');
    let writing = false;
    try {
      await form.validateAndRun({ csosn }, async (values) => {
        if (!active.current) return false;
        writing = true;
        const response = await withTimeout(saveHmlCsosnConfiguration(values.csosn), 20_000, null, 'Salvar CSOSN de homologação');
        const parsed = hmlCsosnConfigurationSchema.safeParse(response);
        if (!parsed.success || parsed.data.csosn !== values.csosn) {
          uncertain.current = true;
          throw new Error('O salvamento não foi confirmado. Recarregue a página e confira o padrão antes de repetir.');
        }
        if (active.current) { setCsosn(parsed.data.csosn); setSaved(parsed.data.csosn); }
        return true;
      }, (errors) => { if (active.current) setError(Object.values(flattenFormErrors(errors))[0]); });
    } catch (reason) {
      if (writing) uncertain.current = true;
      if (active.current) setError(reason instanceof Error ? reason.message : 'Falha ao salvar. Confira o padrão antes de repetir.');
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  };
  return (
    <div className="p-8 border-b border-slate-100 dark:border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 max-w-lg">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            CSOSN padrão da NF-e — Homologação
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Aplicado aos itens sem escolha explícita ou exceção fiscal. Somente NF-e 55, Simples
            Nacional (CRT 1), em homologação.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            A configuração de produção permanece separada. CSOSN 103 corresponde à isenção por faixa
            de receita bruta.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-96">
          <select
            aria-label="CSOSN padrão da NF-e em homologação"
            value={csosn}
            disabled={busy || !ready || uncertain.current}
            onChange={(event) => setCsosn(event.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border rounded-2xl px-5 py-3 text-sm dark:text-slate-200"
          >
            <option value="">{busy ? 'Carregando configuração…' : 'Selecione o CSOSN'}</option>
            {CSOSN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={save}
            disabled={busy || !ready || !csosn || uncertain.current}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? phase === 'load' ? 'Carregando…' : 'Salvando…' : 'Salvar padrão de homologação'}
          </button>
          {busy && <p role="status" className="text-xs text-slate-500"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />{phase === 'load' ? 'Carregando configuração de homologação...' : 'Confirmando o padrão de homologação...'}</p>}
          {!busy && !ready && <button type="button" onClick={() => void load()}>Tentar carregar novamente</button>}
          {!busy && csosn && saved === csosn && !error && (
            <p role="status" className="text-xs text-slate-500">
              Padrão atual: {saved}
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
