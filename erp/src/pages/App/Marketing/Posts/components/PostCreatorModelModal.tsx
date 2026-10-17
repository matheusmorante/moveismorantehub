import React, { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { toast } from 'react-toastify';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { postElementModelEditorFormSchema, postElementReferenceUploadFormSchema } from '../../../../../../../shared-utils/marketingFormSchemas';
import {
  defaultContentKind,
  ElementModel,
  ElementModelReference,
  ElementType,
  elementLabel,
} from '../types/postCreator';

type Props = {
  elementType: ElementType;
  value?: ElementModel;
  initialOpportunityId?: string;
  opportunities: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (model: ElementModel) => Promise<void>;
  onSavingChange: (saving: boolean) => void;
};
const fileToReference = (file: File): Promise<ElementModelReference> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timer = setTimeout(() => { reader.onload = null; reader.onerror = null; reader.abort(); reject(new Error('A leitura da imagem demorou demais. Selecione novamente.')); }, 10_000);
    const finish = () => { clearTimeout(timer); reader.onload = null; reader.onerror = null; };
    reader.onload = () => {
      const fileUrl = String(reader.result); finish();
      if (!fileUrl.startsWith('data:image/')) { reject(new Error('A imagem lida não foi confirmada.')); return; }
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        fileUrl,
        mimeType: file.type,
      });
    };
    reader.onerror = () => { finish(); reject(new Error('Não foi possível ler a imagem.')); };
    try { reader.readAsDataURL(file); } catch (error) { finish(); reject(error); }
  });

export function PostCreatorModelModal({
  elementType,
  value,
  initialOpportunityId,
  opportunities,
  onClose,
  onSave,
  onSavingChange,
}: Props) {
  const [name, setName] = useState(value?.name || '');
  const [prompt, setPrompt] = useState(value?.prompt || '');
  const [references, setReferences] = useState<ElementModelReference[]>(
    value?.referenceFiles || []
  );
  const [opportunityId, setOpportunityId] = useState(
    value?.opportunityId || initialOpportunityId || ''
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const formValues = { name, prompt, elementType, opportunityId, referenceFiles: references.map((reference) => ({ ...reference })) };
  const form = useZodForm(postElementModelEditorFormSchema, formValues);
  const fileForm = useZodForm(postElementReferenceUploadFormSchema, { files: [] });
  const initialEdit = useRef(true);
  const active = useRef(true), requested = useRef(false), working = useRef(false), uncertain = useRef(false);
  const context = useRef({ id: value?.id, elementType, initialOpportunityId });
  if (context.current.id !== value?.id || context.current.elementType !== elementType || context.current.initialOpportunityId !== initialOpportunityId) context.current = { id: value?.id, elementType, initialOpportunityId };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const draftId = useRef(value?.id || crypto.randomUUID());
  const valueSource = useRef(value); valueSource.current = value;
  useEffect(() => {
    const selected = valueSource.current;
    initialEdit.current = true;
    uncertain.current = false;
    draftId.current = selected?.id || crypto.randomUUID();
    setName(selected?.name || '');
    setPrompt(selected?.prompt || '');
    setReferences(selected?.referenceFiles || []);
    setOpportunityId(selected?.opportunityId || initialOpportunityId || '');
  }, [value?.id, initialOpportunityId]);
  const modelValue = (): ElementModel => ({
    id: draftId.current,
    name: name.trim(),
    elementType,
    contentKind: value?.contentKind || defaultContentKind[elementType],
    opportunityId: elementType === 'BADGE' ? opportunityId : null,
    prompt,
    referenceFiles: references,
    generatedAssetUrl: value?.generatedAssetUrl,
    generationInputHash: value?.generationInputHash,
    generationVersion: value?.generationVersion || 1,
    status: value?.status || 'NO_PREVIEW',
    createdAt: value?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const persist = async (closeAfterSave = false) => {
    return form.enqueueAndRun(formValues, async (validated) => {
    if (!active.current || working.current) return false;
    if (uncertain.current) { setFormError('Há um salvamento sem confirmação. Confira antes de repetir.'); return false; }
    working.current = true;
    const scope = context.current, current = () => active.current && context.current === scope;
    setFormError('');
    setSaving(true);
    onSavingChange(true);
    try {
      const result = await withTimeout(Promise.resolve(onSave({ ...modelValue(), name: validated.name.trim(), prompt: validated.prompt, referenceFiles: validated.referenceFiles, opportunityId: validated.elementType === 'BADGE' ? validated.opportunityId : null })).then(() => true), 80_000, false, 'Salvar modelo da campanha');
      if (!current()) return false;
      if (!result) { uncertain.current = true; throw new Error('O salvamento não foi confirmado. Confira antes de repetir.'); }
      if (closeAfterSave) onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o modelo.';
      if (!current()) return false;
      if (error && typeof error === 'object' && 'uncertain' in error && error.uncertain) uncertain.current = true;
      setFormError(message);
      if (closeAfterSave) toast.error(message);
    } finally {
      working.current = false;
      if (active.current) setSaving(false);
      onSavingChange(false);
    }
    }, (errors) => {
      const message = Object.values(flattenFormErrors(errors))[0];
      setFormError(message);
      if (closeAfterSave) toast.error(message);
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requested.current || working.current) return; requested.current = true;
    try { await persist(true); } finally { requested.current = false; }
  };
  const persistCurrent = useRef(persist); persistCurrent.current = persist;
  const hasExistingModel = Boolean(value);
  useEffect(() => {
    if (!hasExistingModel) return;
    if (initialEdit.current) {
      initialEdit.current = false;
      return;
    }
    const timeout = window.setTimeout(() => void persistCurrent.current(), 700);
    return () => window.clearTimeout(timeout);
  }, [name, prompt, references, opportunityId, hasExistingModel]);
  const addReferences = async (files: FileList | null) => {
    if (!files || working.current || requested.current) return;
    working.current = true; setSaving(true);
    const scope = context.current, current = () => active.current && context.current === scope;
    try { return await fileForm.validateAndRun({ files: Array.from(files) }, async (values) => {
      try {
        const added = await Promise.all(values.files.map(fileToReference));
        if (!current()) return false;
        setReferences((items) => items.concat(added));
        setFormError('');
      } catch (error) { if (current()) setFormError(error instanceof Error ? error.message : 'Não foi possível ler as imagens selecionadas.'); }
    }, (errors) => { if (current()) setFormError(Object.values(flattenFormErrors(errors))[0]); }); }
    finally { working.current = false; if (active.current) setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <form noValidate
        onSubmit={submit}
        className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-700 p-5">
          <div>
            <h2 className="font-bold">{value ? 'Editar' : 'Configurar'} prompt do elemento</h2>
            <p className="mt-1 text-xs text-slate-400">
              Tipo: {elementLabel[elementType]}. Instruções visuais e diretrizes de arte para o
              post.
            </p>
          </div>
          <button type="button" disabled={saving} onClick={() => { if (!working.current && !requested.current) onClose(); }}>
            ✕
          </button>
        </header>
        <fieldset disabled={saving} className="min-w-0 space-y-4 p-5">
          {saving && <p role="status"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />Conferindo imagens e salvando o modelo...</p>}
          {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
          <label className="block text-xs font-semibold text-slate-300">
            Identificação / Nome
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm"
              placeholder={`Ex.: ${elementLabel[elementType]} Padrão`}
            />
          </label>
          {elementType === 'BADGE' && (
            <label className="block text-xs font-semibold text-slate-300">
              Oportunidade *
              <select
                required
                value={opportunityId}
                onChange={(event) => setOpportunityId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm"
              >
                <option value="">Selecionar oportunidade</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-300">
            Prompt do elemento
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm"
              placeholder="Descreva apenas o estilo, decoração e hierarquia visual; não fixe preço ou dados comerciais."
            />
          </label>
          <div>
            <p className="text-xs font-semibold text-slate-300">Anexos ({references.length})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {references.map((reference) => (
                <figure
                  key={reference.id}
                  className="relative w-20 overflow-hidden rounded border border-slate-700"
                >
                  <img
                    src={reference.fileUrl}
                    alt={reference.name}
                    className="h-16 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setReferences((items) => items.filter((item) => item.id !== reference.id))
                    }
                    className="absolute right-1 top-1 rounded bg-black/70 px-1 text-xs"
                  >
                    ×
                  </button>
                  <figcaption className="truncate p-1 text-[9px]">{reference.name}</figcaption>
                </figure>
              ))}
            </div>
            <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800">
              Adicionar anexo
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={(event) => void addReferences(event.target.files)}
              />
            </label>
          </div>
          {value?.generatedAssetUrl && (
            <img
              src={value.generatedAssetUrl}
              alt="Asset atual"
              className="max-h-40 rounded border border-slate-700 object-contain"
            />
          )}
        </fieldset>
        <footer className="flex justify-end gap-2 border-t border-slate-700 p-4">
          <button type="button" disabled={saving} onClick={() => { if (!working.current && !requested.current) onClose(); }} className="rounded-lg px-3 py-2 text-xs">
            Cancelar
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold"
          >
            Salvar prompt
          </button>
        </footer>
      </form>
    </div>
  );
}
