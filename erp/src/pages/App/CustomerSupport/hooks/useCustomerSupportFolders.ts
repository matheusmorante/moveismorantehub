import { useCallback, useEffect, useState } from 'react';
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

  const loadFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    try {
      const rows = await fetchCustomerSupportFolders(supabase);
      setFolders(rows);
      setSelectedFolder((selected) => selected ? rows.find((folder) => folder.id === selected.id) || null : null);
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const saveFolder = useCallback(async (
    input: { id?: string; name: string; criteria: CustomerSupportFolderCriteria }
  ): Promise<string | null> => {
    if (!userId) return 'Não foi possível identificar o atendente atual.';
    const result = await saveCustomerSupportFolder(supabase, { ...input, userId });
    if (!result.folder) return result.error || 'Não foi possível salvar a pasta.';
    setFolders((current) => {
      const withoutSaved = current.filter((folder) => folder.id !== result.folder?.id);
      return [result.folder as CustomerSupportFolder, ...withoutSaved];
    });
    if (!input.id) setSelectedFolder(result.folder);
    else setSelectedFolder((current) => current?.id === result.folder?.id ? result.folder : current);
    return null;
  }, [userId]);

  const removeFolder = useCallback(async (id: string): Promise<string | null> => {
    const result = await deleteCustomerSupportFolder(supabase, id);
    if (!result.success) return result.error;
    setFolders((current) => current.filter((folder) => folder.id !== id));
    setSelectedFolder((current) => current?.id === id ? null : current);
    return null;
  }, []);

  return {
    folders,
    selectedFolder,
    setSelectedFolder,
    isLoadingFolders,
    loadFolders,
    saveFolder,
    removeFolder,
  };
}
