import { useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import {
  supportFolderDeleteSchema,
  type SupportFolderDeleteInput,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { CustomerSupportFolder } from '../../types';
import { useCustomerSupportFolders } from '../index';

export function useCustomerSupportFolderManagement(userId?: string) {
  const folderDeleteLock = useRef(false);
  const folderDeleteForm = useForm<SupportFolderDeleteInput>({
    resolver: zodResolver(supportFolderDeleteSchema),
  });

  const {
    folders,
    selectedFolder,
    setSelectedFolder,
    saveFolder,
    removeFolder,
    isLoadingFolders,
    foldersError,
    loadFolders,
  } = useCustomerSupportFolders(userId);

  const handleDeleteFolder = useCallback(
    async (folder: CustomerSupportFolder) => {
      if (folderDeleteLock.current) return;
      folderDeleteLock.current = true;
      folderDeleteForm.reset({
        folderId: folder?.id || '',
        createdBy: folder?.createdBy,
        currentUserId: userId || '',
      });
      try {
        await folderDeleteForm.handleSubmit(
          async (data) => {
            if (!window.confirm(`Excluir a pasta compartilhada "${folder.name}"?`)) return;
            const error = await removeFolder(data.folderId);
            if (error) toast.error(error);
            else toast.success(`Pasta "${folder.name}" excluída.`);
          },
          () => toast.error('Não foi possível validar a pasta e seu autor para exclusão.')
        )();
      } catch {
        toast.error('Não foi possível excluir a pasta. Tente novamente.');
      } finally {
        folderDeleteLock.current = false;
      }
    },
    [removeFolder, userId, folderDeleteForm]
  );

  return {
    folders,
    selectedFolder,
    setSelectedFolder,
    saveFolder,
    removeFolder,
    isLoadingFolders,
    foldersError,
    loadFolders,
    handleDeleteFolder,
  };
}
