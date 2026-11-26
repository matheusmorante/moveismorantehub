import React from 'react';
import Item from '../../../types/items.type';
import { HandlingOption } from '@/pages/utils/settingsService';
import { HandlingSelect } from './HandlingSelect';
import { StockOriginSelect } from './StockOriginSelect';

interface BodyRowDesktopCompactFooterRowProps {
  item: Item;
  displayNumber: string;
  isService: boolean;
  isCompositionComponent: boolean;
  shouldHideHandling: boolean;
  shouldShowStockOrigin: boolean;
  isLinkedProduct: boolean;
  highlightAsTemporary?: boolean;
  itemHasError: boolean;
  handlingOptions: HandlingOption[];
  handlingError?: string | boolean;
  stockOriginError?: string | boolean;
  tempObservation: string;
  onObservationChange: (value: string) => void;
  onObservationBlur: () => void;
  onHandlingChange: (handlingType: string) => void;
  onStockOriginChange: (rawCondition: string) => void;
}

export const BodyRowDesktopCompactFooterRow: React.FC<BodyRowDesktopCompactFooterRowProps> = ({
  item,
  displayNumber,
  isService,
  isCompositionComponent,
  shouldHideHandling,
  shouldShowStockOrigin,
  isLinkedProduct,
  highlightAsTemporary,
  itemHasError,
  handlingOptions,
  handlingError,
  stockOriginError,
  tempObservation,
  onObservationChange,
  onObservationBlur,
  onHandlingChange,
  onStockOriginChange,
}) => (
  <tr
    className={`border-b border-slate-100 dark:border-slate-800 ${
      highlightAsTemporary
        ? 'bg-amber-50/50 dark:bg-amber-950/20'
        : itemHasError
          ? 'bg-red-50/30 dark:bg-red-950/10'
          : 'bg-white dark:bg-slate-900'
    }`}
  >
    <td colSpan={7} className="px-3 pb-2 pt-0">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {!shouldHideHandling && (
          <div className="flex min-w-0 max-w-[55%] flex-none items-center">
            <div className="min-w-0 max-w-full flex-none">
              <HandlingSelect
                options={handlingOptions}
                value={item.handlingType}
                error={handlingError}
                placeholder="Manuseio"
                fitContent
                className={`appearance-none border-b-2 bg-transparent px-2 py-1 pr-6 text-[11px] font-bold outline-none transition-colors dark:bg-slate-900 ${
                  handlingError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'
                }`}
                onChange={onHandlingChange}
              />
            </div>
          </div>
        )}
        {shouldShowStockOrigin && (
          <div className={`relative flex shrink-0 items-center gap-1 ${isLinkedProduct ? 'cursor-not-allowed' : ''}`}>
            <StockOriginSelect
              value={item.condition}
              isLinkedProduct={isLinkedProduct}
              error={stockOriginError}
              ariaLabel="Origem do estoque (obrigatória)"
              selectClassName={`${isLinkedProduct ? 'w-[140px]' : 'w-[120px]'} shrink-0 bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 px-2 py-1 rounded-none text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                stockOriginError
                  ? 'border-b-red-500 focus:border-b-red-500'
                  : 'border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500'
              } ${isLinkedProduct ? 'cursor-not-allowed opacity-60 !bg-slate-100 !pr-8 dark:!bg-slate-800' : ''}`}
              onChange={onStockOriginChange}
            />
            <span className="text-[10px] font-black text-red-500" aria-hidden="true">
              *
            </span>
          </div>
        )}
        <input
          type="text"
          value={tempObservation}
          onChange={(event) => onObservationChange(event.target.value)}
          onBlur={onObservationBlur}
          placeholder={isService ? 'Observação...' : 'Observação (ex: salvados, peça do mostruário com avaria)...'}
          aria-label={isCompositionComponent ? `Observação do componente ${displayNumber}` : undefined}
          className="min-w-[220px] flex-1 bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500 px-2 py-1 rounded-none text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
        />
      </div>
      {stockOriginError && (
        <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
          {stockOriginError}
        </span>
      )}
    </td>
  </tr>
);
