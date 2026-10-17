import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { campaignRulesFormSchema } from '../../../../../../../shared-utils/campaignFormSchemas';
import { toast } from 'react-toastify';
import type { z } from 'zod';

type Props = {
  load: () => Promise<string>;
  save: (value: string) => Promise<void>;
  onSavingChange: (saving: boolean) => void;
};

export function GeneralCampaignRules({ load, save, onSavingChange }: Props) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initialValue = useRef(true);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const form = useZodForm(campaignRulesFormSchema, { content: value });
  const { enqueueAndRun } = form;

  const persist = useCallback(async (data: z.output<typeof campaignRulesFormSchema>) => {
    if (!loaded || !active.current) return;
    setSaving(true);
    onSavingChange(true);
    setSaveError('');
    try {
      await save(data.content);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar as regras.');
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }, [loaded, save, onSavingChange]);
  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; }, [persist]);

  useEffect(() => {
    initialValue.current = true;
    let current = true;
    setLoaded(false);
    void load().then((text) => {
      if (!current || !active.current) return;
      setValue(text);
      setLoaded(true);
    }).catch(() => { if (current && active.current) setSaveError('Não foi possível carregar as regras.'); });
    return () => { current = false; };
  }, [load]);
  useEffect(() => {
    if (!loaded) return;
    if (initialValue.current) {
      initialValue.current = false;
      return;
    }
    const timeout = window.setTimeout(() => void enqueueAndRun({ content: value }, (data) => persistRef.current(data), (errors) => setSaveError(Object.values(flattenFormErrors(errors))[0])), 700);
    return () => window.clearTimeout(timeout);
  }, [value, loaded, enqueueAndRun]);

  return (
    <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70">
      {saveError && <p role="alert" className="p-4 text-sm text-red-300">{saveError}</p>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span>
          <b className="block text-sm uppercase tracking-wider">Regras gerais para campanhas</b>
          <span className="mt-1 block text-xs text-slate-400">
            Diretrizes globais de composição, posicionamento e fotos para todas as campanhas.
          </span>
        </span>
        <span className="text-indigo-300">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <form
          noValidate
          onSubmit={form.submit(persist, (errors) => {
            toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira as regras da campanha.');
          }, true)}
          className="border-t border-slate-800 p-4 pt-3"
        >
          <textarea
            disabled={!loaded}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={11}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-white outline-none focus:border-indigo-400"
            placeholder="Descreva as regras globais de posicionamento..."
          />
          <div className="mt-2 flex justify-end">
            <button
              disabled={saving || !loaded}
              className="rounded border border-indigo-400 px-3 py-2 text-xs font-bold text-indigo-300 disabled:opacity-50"
            >
              Salvar agora
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
