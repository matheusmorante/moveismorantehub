import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PostCampaign } from '../types/postCreator';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { postCampaignDeleteFormSchema } from '../../../../../../../shared-utils/postManagerFormSchemas';
import { marketingCampaignFormSchema } from '../../../../../../../shared-utils/campaignFormSchemas';
import { toast } from 'react-toastify';
import type { z } from 'zod';

type Props = {
  campaigns: PostCampaign[];
  onClose: () => void;
  onSave: (value: Partial<PostCampaign>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSavingChange: (saving: boolean) => void;
};

export function CampaignManagerModal({
  campaigns,
  onClose,
  onSave,
  onRemove,
  onSavingChange,
}: Props) {
  const [editing, setEditing] = useState<Partial<PostCampaign>>();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initialEdit = useRef(true), active = useRef(true), submissionRequested = useRef(false), deleting = useRef(false);
  const editingSource = useRef(editing); editingSource.current = editing;
  const deleteForm = useZodForm(postCampaignDeleteFormSchema, { id: '' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const values = { ...editing, name: editing?.name || '' };
  const form = useZodForm(marketingCampaignFormSchema, values);
  const { enqueueAndRun } = form;
  const persist = useCallback(async (data: z.output<typeof marketingCampaignFormSchema>, closeAfterSave = false) => {
    if (!active.current || !editingSource.current || editingSource.current.id !== data.id) return;
    setBusy(true);
    onSavingChange(true);
    setSaveError('');
    try {
      await onSave(data);
      if (closeAfterSave) setEditing(undefined);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a campanha.');
    } finally {
      setBusy(false);
      onSavingChange(false);
    }
  }, [onSave, onSavingChange]);
  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; }, [persist]);
  useEffect(() => {
    if (!editing?.id) {
      initialEdit.current = true;
      return;
    }
    if (initialEdit.current) {
      initialEdit.current = false;
      return;
    }
    const snapshot = { ...editing, name: editing.name || '' };
    const timeout = window.setTimeout(() => void enqueueAndRun(snapshot, (data) => persistRef.current(data), (errors) => setSaveError(Object.values(flattenFormErrors(errors))[0])), 700);
    return () => window.clearTimeout(timeout);
  }, [editing, enqueueAndRun]);
  const remove = async (id: string) => {
    if (busy || deleting.current || submissionRequested.current) return;
    deleting.current = true; setBusy(true); setSaveError(''); onSavingChange(true);
    try { await deleteForm.validateAndRun({ id }, async (values) => {
      if (!active.current) return false;
      const selected = campaigns.find((item) => item.id === values.id); if (!selected) throw new Error('A campanha selecionada mudou. Atualize a lista.');
      if (!window.confirm('Excluir a campanha "' + selected.name + '"?')) return false;
      await onRemove(values.id); return true;
    }, (errors) => setSaveError(Object.values(flattenFormErrors(errors))[0])); }
    catch (error) { if (active.current) setSaveError(error instanceof Error ? error.message : 'Não foi possível excluir a campanha.'); }
    finally { deleting.current = false; if (active.current) setBusy(false); onSavingChange(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-5">
          <div>
            <h2 className="font-bold">Gerenciar Campanhas</h2>
            <p className="mt-1 text-xs text-slate-400">
              Crie, edite, desative ou exclua campanhas.
            </p>
          </div>
          <button disabled={busy} onClick={() => { if (!busy && !submissionRequested.current && !deleting.current) onClose(); }}>✕</button>
        </header>
        <div className="max-h-[65vh] overflow-auto p-5">
          {saveError && <p role="alert" className="mb-3 text-sm text-red-300">{saveError}</p>}
          {editing ? (
            <form noValidate onSubmit={(event) => {
              event.preventDefault(); if (submissionRequested.current || deleting.current) return; submissionRequested.current = true;
              void form.submit((data) => persist(data, true), (errors) => { toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira a campanha.'); }, true)(event).finally(() => { submissionRequested.current = false; });
            }} className="space-y-3">
              <label className="block text-xs">
                Nome
                <input
                  required
                  value={editing.name || ''}
                  onChange={(event) =>
                    setEditing((value) => ({ ...value, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded bg-slate-950 p-2"
                />
              </label>
              <label className="block text-xs">
                Descrição
                <textarea
                  value={editing.description || ''}
                  onChange={(event) =>
                    setEditing((value) => ({ ...value, description: event.target.value }))
                  }
                  className="mt-1 w-full rounded bg-slate-950 p-2"
                  rows={3}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={(event) =>
                    setEditing((value) => ({ ...value, active: event.target.checked }))
                  }
                />{' '}
                Campanha ativa
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { if (!submissionRequested.current) setEditing(undefined); }}
                  className="px-3 py-2 text-xs"
                >
                  Cancelar
                </button>
                <button
                  disabled={busy}
                  className="rounded bg-indigo-600 px-3 py-2 text-xs font-bold"
                >
                  {editing.id ? 'Salvar agora' : 'Criar campanha'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                onClick={() => setEditing({ name: '', active: true })}
                className="mb-3 rounded border border-indigo-400 px-3 py-2 text-xs text-indigo-300"
              >
                + Criar campanha
              </button>
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <article
                    key={campaign.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 p-3"
                  >
                    <div>
                      <b className="text-sm">{campaign.name}</b>
                      {campaign.persistedRemotely === false && <p className="text-xs text-amber-300">Rascunho salvo somente neste navegador.</p>}
                      <p className="text-xs text-slate-400">
                        {campaign.active ? 'Ativa' : 'Desativada'}
                        {campaign.description ? ` · ${campaign.description}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button disabled={busy} onClick={() => setEditing(campaign)} className="text-indigo-300">
                        Editar
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void remove(campaign.id)}
                        className="text-rose-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
