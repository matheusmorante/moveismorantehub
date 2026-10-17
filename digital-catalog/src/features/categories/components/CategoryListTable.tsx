'use client';

import React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryItem, CategoryLink } from '../types/categoryManager.types';

export interface CategoryListTableProps {
  readonly data: readonly CategoryItem[];
  readonly onEdit: (category: CategoryItem) => void;
  readonly onDelete: (id: string) => void;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly categories: readonly CategoryItem[];
  readonly relationships: readonly CategoryLink[];
  readonly isEnv?: boolean;
}

export function CategoryListTable({
  data,
  onEdit,
  onDelete,
  loading,
  disabled,
  categories,
  relationships,
  isEnv,
}: CategoryListTableProps) {
  if (loading) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border text-muted-foreground text-xs italic">
        Nenhum item cadastrado.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="font-bold text-xs py-2">Nome</TableHead>
            <TableHead className="font-bold text-xs py-2">
              {isEnv ? 'Filhos' : 'Ambientes'}
            </TableHead>
            <TableHead className="font-bold text-xs py-2 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const rels = isEnv
              ? relationships.filter((r) => r.parent_id === item.id)
              : relationships.filter((r) => r.child_id === item.id);

            const relatedNames = rels
              .map((r) => {
                const target = categories.find(
                  (c) => c.id === (isEnv ? r.child_id : r.parent_id)
                );
                return target?.name;
              })
              .filter((name): name is string => Boolean(name));

            return (
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell className="font-medium text-gray-700 capitalize text-xs py-2">
                  {item.name}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-0.5">
                    {relatedNames.length > 0 ? (
                      relatedNames.map((name: string, i: number) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[9px] bg-primary/5 text-primary border-none capitalize py-0 px-1"
                        >
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">Nenhum</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right py-1.5 space-x-0.5">
                  <Button
                    disabled={disabled}
                    aria-label={`Editar ${item.name}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="h-7 w-7 text-blue-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    disabled={disabled}
                    aria-label={`Excluir ${item.name}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    className="h-7 w-7 text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
