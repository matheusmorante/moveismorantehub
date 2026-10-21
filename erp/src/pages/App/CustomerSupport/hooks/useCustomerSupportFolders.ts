import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  CustomerSupportFolder,
  CustomerSupportFolderCriteria,
} from '../types';
import {
  deleteCustomerSupportFolder,
  fetchCustomerSupportFolders,
  saveCustomerSupportFolder,
} from '@/pages/utils/customerSupport/customerSupportInboxService';

export function useCustomerSupportFolders(userId?: string) {
  const [folders, setFolders] = useState<CustomerSupportFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CustomerSupportFolder | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const contextRef = useRef({ userId });
  if (contextRef.current.userId !== userId) contextRef.current = { userId };
  const context = contextRef.current;
  const mounted = useRef(false);
  const loadSequence = useRef(0);
  const isCurrent = useCallback(() => mounted.current && contextRef.current === context, [context]);

  const loadFolders = useCallback(async () => {
    if (!userId) {
      setIsLoadingFolders(false);
      return;
    }
    const sequence = ++loadSequence.current;
    const current = () => isCurrent() && sequence === loadSequence.current;
    setIsLoadingFolders(true);
    setFoldersError(null);
    try {
      const rows = await fetchCustomerSupportFolders(supabase);
      if (!current()) return;
      setFolders(rows);
      setSelectedFolder((selected) => selected ? rows.find((folder) => folder.id === selected.id) || null : null);
    } catch {
      if (current()) setFoldersError('Não foi possível carregar as pastas. Tente atualizar.');
    } finally {
      if (current()) setIsLoadingFolders(false);
    }
  }, [isCurrent, userId]);

  useEffect(() => {
    mounted.current = true;
    setFolders([]);
    setSelectedFolder(null);
    setFoldersError(null);
    void loadFolders();
    return () => {
      mounted.current = false;
      loadSequence.current++;
    };
  }, [loadFolders]);

  const saveFolder = useCallback(async (
    input: { id?: string; name: string; criteria: CustomerSupportFolderCriteria }
  ): Promise<string | null> => {
    if (!userId) return 'Não foi possível identificar o atendente atual.';
    const result = await saveCustomerSupportFolder(supabase, { ...input, userId });
    if (!isCurrent()) return 'A sessão mudou. Atualize as pastas antes de continuar.';
    if (!result.folder) return result.error || 'Não foi possível salvar a pasta.';
    loadSequence.current++;
    setIsLoadingFolders(false);
    setFoldersError(null);
    setFolders((current) => {
      const withoutSaved = current.filter((folder) => folder.id !== result.folder?.id);
      return [result.folder as CustomerSupportFolder, ...withoutSaved];
    });
    if (!input.id) setSelectedFolder(result.folder);
    else setSelectedFolder((current) => current?.id === result.folder?.id ? result.folder : current);
    return null;
  }, [isCurrent, userId]);

  const removeFolder = useCallback(async (id: string): Promise<string | null> => {
    if (!userId) return 'Não foi possível identificar o atendente atual.';
    const result = await deleteCustomerSupportFolder(supabase, id);
    if (!isCurrent()) return 'A sessão mudou. Atualize as pastas antes de continuar.';
    if (!result.success) return result.error;
    loadSequence.current++;
    setIsLoadingFolders(false);
    setFoldersError(null);
    setFolders((current) => current.filter((folder) => folder.id !== id));
    setSelectedFolder((current) => current?.id === id ? null : current);
    return null;
  }, [isCurrent, userId]);

  return {
    folders,
    selectedFolder,
    setSelectedFolder,
    isLoadingFolders,
    foldersError,
    loadFolders,
    saveFolder,
    removeFolder,
  };
}
