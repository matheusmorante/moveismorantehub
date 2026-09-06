import React, { useEffect, useMemo, useState } from 'react';
import { usePostEditor } from './usePostEditor';
import { environmentGuidance } from '../../services/environmentGuidance';

interface Props {
  editor: ReturnType<typeof usePostEditor>;
  savedPrompts?: Record<string, string>;
  onPromptChange: (key: string, prompt: string) => void;
}
export function ProductPostControls({ editor: e, savedPrompts = {}, onPromptChange }: Props) {
  const guidance = useMemo(() => environmentGuidance(e.product?.category || '', e.product?.name || ''), [e.product?.category, e.product?.name]);
  const [prompt, setPrompt] = useState('');
  useEffect(() => { setPrompt(savedPrompts[guidance.key] || guidance.prompt); }, [guidance.key, guidance.prompt, savedPrompts]);
  return <section className="space-y-2 text-sm">
    <div className="border-b border-slate-800 pb-2"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Template</h2>
      <p className="mt-1 text-xs text-slate-500">Defina regras gerais; a ambientação é um fluxo separado.</p></div>
    <details className="rounded border border-slate-800 bg-slate-900/60 p-2">
      <summary className="cursor-pointer text-xs font-medium">Orientação de ambientação</summary>
      <p className="mt-2 text-[11px] text-slate-500">Padrão para: {guidance.category}.</p>
      <textarea className="mt-2 min-h-32 w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs" value={prompt}
        onChange={event => { const value = event.target.value; setPrompt(value); onPromptChange(guidance.key, value); }} />
    </details>
    <details className="rounded border border-slate-800 bg-slate-900/60 p-2">
      <summary className="cursor-pointer text-xs font-medium">Texto de preview</summary>
      <label className="mt-2 block text-xs">Slogan de exemplo<input className="mt-1 w-full rounded bg-slate-950 p-2" maxLength={160}
        value={e.slogan} onChange={event => e.setSlogan(event.target.value)} placeholder="Usado somente na prévia" /></label>
    </details>
    <details className="rounded border border-slate-800 bg-slate-900/60 p-2"><summary className="cursor-pointer text-xs font-medium">Safe area e regras de layout</summary>
      <p className="mt-2 text-xs text-slate-500">As áreas seguras e regiões preferidas são respeitadas pela IA ao encaixar o post.</p></details>
  </section>;
}
