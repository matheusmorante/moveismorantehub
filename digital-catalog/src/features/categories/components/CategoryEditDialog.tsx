'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryFormData, CategoryItem } from '../types/categoryManager.types';

export interface CategoryEditDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly currentCategory: CategoryItem | null;
  readonly formData: CategoryFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  readonly isAutoSlug: boolean;
  readonly setIsAutoSlug: (auto: boolean) => void;
  readonly handleNameChange: (name: string) => void;
  readonly handleSave: (e: React.FormEvent) => Promise<void>;
  readonly isSaving: boolean;
  readonly errorMessage: string;
  readonly environments: readonly CategoryItem[];
  readonly productCategories: readonly CategoryItem[];
  readonly busy: boolean;
}

export function CategoryEditDialog({
  open,
  onOpenChange,
  currentCategory,
  formData,
  setFormData,
  isAutoSlug,
  setIsAutoSlug,
  handleNameChange,
  handleSave,
  isSaving,
  errorMessage,
  environments,
  productCategories,
  busy,
}: CategoryEditDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl z-[100]">
        <form noValidate onSubmit={handleSave}>
          <fieldset disabled={isSaving}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {currentCategory ? 'Editar Item' : 'Novo Item'}
              </DialogTitle>
            </DialogHeader>
            {errorMessage && (
              <p role="alert" className="text-sm text-red-700">
                {errorMessage}
              </p>
            )}
            {isSaving && (
              <p role="status" className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Confirmando alterações nas categorias...
              </p>
            )}
            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Tipo</label>
                <Select
                  aria-label="Tipo do cadastro"
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val, linkedIds: [] })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="environment">Ambiente</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  {formData.type === 'category'
                    ? 'Vincular a Ambientes'
                    : 'Vincular a Categorias'}
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border max-h-36 overflow-y-auto">
                  {(formData.type === 'category' ? environments : productCategories).map(
                    (item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`modal-link-${item.id}`}
                          checked={formData.linkedIds.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                linkedIds: [...formData.linkedIds, item.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                linkedIds: formData.linkedIds.filter((id) => id !== item.id),
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`modal-link-${item.id}`}
                          className="text-xs font-medium leading-none cursor-pointer capitalize"
                        >
                          {item.name}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Nome</label>
                <Input
                  aria-label="Nome do cadastro"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Slug (URL)</label>
                  <button
                    type="button"
                    onClick={() => setIsAutoSlug(!isAutoSlug)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5 ${
                      isAutoSlug
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {isAutoSlug ? 'Automático' : 'Manual'}
                  </button>
                </div>
                <Input
                  aria-label="Endereço do cadastro"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/ /g, '-'),
                    })
                  }
                  className="h-10 bg-gray-50/50"
                  required
                  readOnly={isAutoSlug}
                />
              </div>
            </div>
            <DialogFooter className="gap-1.5 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
