import React from 'react';

interface WarrantyPageSheetFooterProps {
  pageNumber: number;
  totalPages?: number;
  version?: number;
  subtitle?: string;
}

/**
 * Rodapé padronizado das folhas internas A4 no visualizador do Termo de Garantia.
 */
export const WarrantyPageSheetFooter: React.FC<WarrantyPageSheetFooterProps> = ({
  pageNumber,
  totalPages = 3,
  version,
  subtitle = 'Móveis Morante • Cuidando do seu lar com transparência e respeito ao consumidor',
}) => {
  return (
    <footer className="mt-8 pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
      <span>{subtitle}</span>
      <span>
        Página {pageNumber} de {totalPages}
        {version !== undefined ? ` • Versão ${version}` : ''}
      </span>
    </footer>
  );
};
