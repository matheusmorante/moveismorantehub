'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Loader2, LayoutGrid, ListTree } from 'lucide-react';
import { useCategoriesManager } from '../hooks/useCategoriesManager';
import { CategoryListTable } from './CategoryListTable';
import { CategoryEditDialog } from './CategoryEditDialog';

export interface CategoriesManagerModalProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSuccess?: () => void | Promise<void>;
}

export function CategoriesManagerModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CategoriesManagerModalProps) {
  const {
    categories,
    relationships,
    environments,
    productCategories,
    loading,
    dataReady,
    isSaving,
    errorMessage,
    isEditingDialogOpen,
    setIsEditingDialogOpen,
    currentCategory,
    formData,
    setFormData,
    isAutoSlug,
    setIsAutoSlug,
    busy,
    fetchData,
    openEditDialog,
    handleNameChange,
    handleSave,
    handleDelete,
  } = useCategoriesManager({ isOpen, onSuccess });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!busy) onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-6xl w-[95vw] md:w-full max-h-[90vh] md:max-h-[85vh] p-4 sm:p-6 md:p-8 overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Gerenciar Ambientes e Categorias
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione, edite ou exclua os ambientes e categorias da loja. Suas alterações refletirão
            na seleção de categorias do produto imediatamente.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && !isEditingDialogOpen && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        {isSaving && !isEditingDialogOpen && (
          <p role="status" className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Confirmando alterações nas categorias...
          </p>
        )}
        {!loading && !dataReady && (
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => {
              void fetchData();
            }}
          >
            Tentar carregar novamente
          </Button>
        )}

        <div className="space-y-6 my-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AMBIENTES */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <LayoutGrid className="h-4.5 w-4.5 text-primary" />
                  Ambientes
                </h3>
                <Button
                  disabled={isSaving || loading || !dataReady}
                  size="sm"
                  onClick={() => openEditDialog(null, 'environment')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Novo Ambiente
                </Button>
              </div>
              <CategoryListTable
                data={environments}
                onEdit={(c) => openEditDialog(c)}
                onDelete={handleDelete}
                loading={loading}
                disabled={isSaving || !dataReady}
                categories={categories}
                relationships={relationships}
                isEnv
              />
            </div>

            {/* CATEGORIAS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <ListTree className="h-4.5 w-4.5 text-primary" />
                  Categorias
                </h3>
                <Button
                  disabled={isSaving || loading || !dataReady}
                  size="sm"
                  onClick={() => openEditDialog(null, 'category')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova Categoria
                </Button>
              </div>
              <CategoryListTable
                data={productCategories}
                onEdit={(c) => openEditDialog(c)}
                onDelete={handleDelete}
                loading={loading}
                disabled={isSaving || !dataReady}
                categories={categories}
                relationships={relationships}
              />
            </div>
          </div>
        </div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO DETALHADA */}
        <CategoryEditDialog
          open={isEditingDialogOpen}
          onOpenChange={(open) => {
            if (!busy) setIsEditingDialogOpen(open);
          }}
          currentCategory={currentCategory}
          formData={formData}
          setFormData={setFormData}
          isAutoSlug={isAutoSlug}
          setIsAutoSlug={setIsAutoSlug}
          handleNameChange={handleNameChange}
          handleSave={handleSave}
          isSaving={isSaving}
          errorMessage={errorMessage}
          environments={environments}
          productCategories={productCategories}
          busy={busy}
        />
      </DialogContent>
    </Dialog>
  );
}
