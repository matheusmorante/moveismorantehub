import React from 'react';
import { Package } from 'lucide-react';

interface ProductGridEmptyStateProps {
  isAdminMode: boolean;
}

/**
 * Exibe mensagem amigável de catálogo vazio ou sem resultados para os filtros selecionados.
 */
export const ProductGridEmptyState: React.FC<ProductGridEmptyStateProps> = ({ isAdminMode }) => {
  return (
    <div className="text-center py-20 border rounded-3xl bg-gray-50/50 border-dashed border-gray-200 animate-in fade-in zoom-in duration-500">
      <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Package className="h-10 w-10 text-gray-300" />
      </div>
      <p className="text-gray-600 font-bold text-lg">Nenhum produto encontrado</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {isAdminMode
          ? 'Certifique-se de que os produtos foram marcados como "Concluir Cadastro" no painel administrativo.'
          : 'Estamos preparando novidades incríveis para você! Tente selecionar outro filtro ou volte em alguns instantes.'}
      </p>
    </div>
  );
};
