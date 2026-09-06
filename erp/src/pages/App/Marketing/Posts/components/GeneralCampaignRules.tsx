import React, { useEffect, useRef, useState } from 'react';

type Props = { load: () => Promise<string>; save: (value: string) => Promise<void>; onSavingChange: (saving: boolean) => void };

export function GeneralCampaignRules({ load, save, onSavingChange }: Props) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const initialValue = useRef(true);

  const persist = async () => {
    if (!loaded) return;
    setSaving(true); onSavingChange(true);
    try { await save(value); } finally { setSaving(false); onSavingChange(false); }
  };

  useEffect(() => { void load().then(text => { setValue(text); setLoaded(true); }); }, [load]);
  useEffect(() => {
    if (!loaded || initialValue.current) { initialValue.current = false; return; }
    const timeout = window.setTimeout(() => void persist(), 700);
    return () => window.clearTimeout(timeout);
  }, [value, loaded]);

  return <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70">
    <button type="button" onClick={() => setOpen(current => !current)} className="flex w-full items-center justify-between p-4 text-left">
      <span><b className="block text-sm uppercase tracking-wider">Regras gerais para campanhas</b><span className="mt-1 block text-xs text-slate-400">Diretrizes globais de composição, posicionamento e fotos para todas as campanhas.</span></span>
      <span className="text-indigo-300">{open ? '▾' : '▸'}</span>
    </button>
    {open && <form onSubmit={event => { event.preventDefault(); void persist(); }} className="border-t border-slate-800 p-4 pt-3">
      <textarea disabled={!loaded} value={value} onChange={event => setValue(event.target.value)} rows={11} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-white outline-none focus:border-indigo-400" placeholder="Descreva as regras globais de posicionamento..." />
      <div className="mt-2 flex justify-end"><button disabled={saving || !loaded} className="rounded border border-indigo-400 px-3 py-2 text-xs font-bold text-indigo-300 disabled:opacity-50">Salvar agora</button></div>
    </form>}
  </section>;
}
