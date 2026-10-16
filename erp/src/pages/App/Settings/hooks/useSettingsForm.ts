import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { AppSettingsFormSchema } from '../../../../../../shared-utils/appSettingsFormSchema';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getSettings, saveSettings, subscribeToSettings, type AppSettings } from '@/pages/utils/settingsService';

const themeFormSchema = AppSettingsFormSchema.pick({ defaultTheme: true });

function editPath(settings: AppSettings, path: string, value: unknown): AppSettings {
  const parts = path.split('.');
  if (parts.some((part) => !part || ['__proto__', 'constructor', 'prototype'].includes(part))) throw new Error('Campo de configuração inválido.');
  const next = { ...settings };
  let current: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) {
    const original = current[part];
    current[part] = Array.isArray(original) ? [...original] : original && typeof original === 'object' ? { ...original } : {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts.at(-1)!] = value;
  return next;
}

export function useSettingsForm(ownerId: string | null, setTheme: (theme: 'light' | 'dark') => void) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const latest = useRef(settings), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(new Map<string, unknown>());
  const mounted = useRef(false), ready = useRef<object | null>(null), revision = useRef(0);
  const scope = useRef({ ownerId, generation: 0 });
  if (scope.current.ownerId !== ownerId) scope.current = { ownerId, generation: scope.current.generation + 1 };
  const uncertainOwners = useRef(new Set<string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRevisions = useRef(new Set<number>());
  const themeCallback = useRef(setTheme); themeCallback.current = setTheme;
  const { enqueueAndRun: previewTheme } = useZodForm(themeFormSchema, { defaultTheme: settings.defaultTheme });
  const { validateAndRun } = useZodForm(AppSettingsFormSchema, settings as unknown as z.input<typeof AppSettingsFormSchema>);

  useEffect(() => {
    mounted.current = true; ready.current = null;
    dirty.current.clear(); revision.current++;
    const generation = scope.current;
    setIsLoading(true); setIsSaving(false); setValidationError(null);
    const current = () => mounted.current && scope.current === generation;
    const unsubscribe = subscribeToSettings((incoming) => {
      if (!current()) return;
      let merged = incoming;
      for (const [path, value] of dirty.current) merged = editPath(merged, path, value);
      latest.current = merged; setSettings(merged);
      if (['light', 'dark'].includes(merged.defaultTheme)) themeCallback.current(merged.defaultTheme);
    }, { onRemoteLoad: (result) => {
      if (!current()) return;
      const valid = AppSettingsFormSchema.safeParse(latest.current).success;
      ready.current = result.confirmed && valid && ownerId ? generation : null;
      setIsLoading(false);
      if (!ready.current) setValidationError(result.message || 'As configurações ou a sessão não foram confirmadas. Carregue novamente.');
      else if (uncertainOwners.current.has(ownerId!)) setValidationError('Há uma gravação sem confirmação. Recarregue a página e confira antes de repetir.');
    } });
    return () => {
      mounted.current = false; ready.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null; unsubscribe();
    };
  }, [ownerId, reloadCount]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const submittedScope = scope.current, submittedRevision = revision.current;
    if (!mounted.current || ready.current !== submittedScope || !submittedScope.ownerId || !dirty.current.size) return Promise.resolve(false);
    if (uncertainOwners.current.has(submittedScope.ownerId)) {
      setValidationError('Há uma gravação sem confirmação. Recarregue a página e confira antes de repetir.');
      setIsSaving(false); return Promise.resolve(false);
    }
    if (pendingRevisions.current.has(submittedRevision)) return Promise.resolve(false);
    pendingRevisions.current.add(submittedRevision);
    const edits = new Map(dirty.current);
    const current = () => mounted.current && scope.current === submittedScope;
    setIsSaving(true);
    const pending = queue.current.then(async () => {
      if (!current() || submittedRevision !== revision.current || uncertainOwners.current.has(submittedScope.ownerId!)) {
        if (current() && submittedRevision === revision.current) setIsSaving(false);
        return false;
      }
      const snapshot = latest.current;
      let writing = false;
      try {
        return await validateAndRun(snapshot as unknown as z.input<typeof AppSettingsFormSchema>, async (values) => {
          if (!current()) return false;
          writing = true;
          const result = await saveSettings(values as unknown as AppSettings, { confirm: true, isCurrent: current });
          if (!current()) return false;
          if (!result.confirmed) throw Object.assign(new Error('A configuração não foi confirmada. Confira antes de repetir.'), { uncertain: true });
          for (const [path, value] of edits) if (Object.is(dirty.current.get(path), value)) dirty.current.delete(path);
          setValidationError(result.cached ? null : 'Configuração salva na nuvem; o cache local não foi atualizado.');
          return true;
        }, (errors) => {
          if (!current()) return;
          const [path, message] = Object.entries(flattenFormErrors(errors))[0] || ['configuração', 'Valor inválido.'];
          setValidationError(`Confira ${path}: ${message}`);
        });
      } catch (error) {
        if (writing && error && typeof error === 'object' && 'uncertain' in error && error.uncertain === true) uncertainOwners.current.add(submittedScope.ownerId!);
        if (current()) setValidationError(error instanceof Error ? error.message : 'Não foi possível salvar. Confira a configuração antes de repetir.');
        return false;
      } finally { if (current() && submittedRevision === revision.current) setIsSaving(false); }
    });
    const completed = pending.finally(() => { pendingRevisions.current.delete(submittedRevision); });
    queue.current = completed.catch(() => undefined);
    return completed;
  }, [validateAndRun]);
  const flushRef = useRef(flush); flushRef.current = flush;
  const handleChange = useCallback((path: string, value: unknown) => {
    if (ready.current !== scope.current || !scope.current.ownerId || uncertainOwners.current.has(scope.current.ownerId)) return;
    try {
      latest.current = editPath(latest.current, path, value);
      dirty.current.set(path, value); revision.current++;
      setSettings(latest.current); setIsSaving(true); setValidationError(null);
      if (path === 'defaultTheme') {
        const generation = scope.current;
        void previewTheme({ defaultTheme: value as 'light' | 'dark' }, (parsed) => {
          if (mounted.current && scope.current === generation && latest.current.defaultTheme === parsed.defaultTheme) themeCallback.current(parsed.defaultTheme);
        }).catch(() => { if (mounted.current && scope.current === generation) setValidationError('Não foi possível aplicar o tema.'); });
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void flushRef.current(); }, 1000);
    } catch (error) { setValidationError(error instanceof Error ? error.message : 'Campo inválido.'); }
  }, [previewTheme]);
  return { settings, handleChange, isSaving, isLoading, validationError, flush,
    uncertain: Boolean(ownerId && uncertainOwners.current.has(ownerId)),
    hasPendingEdits: dirty.current.size > 0,
    blocked: isLoading || ready.current !== scope.current || !ownerId || uncertainOwners.current.has(ownerId),
    reload: () => { if (!isSaving) setReloadCount((count) => count + 1); },
  };
}
