import React from 'react';
import { Check } from 'lucide-react';
import type Item from '@/pages/types/items.type';
import type Shipping from '@/pages/types/Shipping.type';
import type { ValidationErrors } from '@/pages/utils/sales/validations';
import { AppointmentHandling, type AppointmentHandlingValue } from './AppointmentHandling';

type Appointment = NonNullable<Shipping['scheduling']['appointments']>[number];

interface Props {
  items: Item[];
  appointment: Appointment;
  deliveryMethod: Shipping['deliveryMethod'];
  errors: ValidationErrors;
  itemsError?: string;
  getAvailableQuantity: (item: Item) => number;
  getQuantity: (item: Item) => number;
  getHandling: (item: Item) => AppointmentHandlingValue;
  onToggleItem: (item: Item, checked: boolean) => void;
  onChangeQuantity: (item: Item, quantity: number) => void;
  onChangeHandling: (item: Item, value: AppointmentHandlingValue) => void;
}

export const AppointmentItemsTable: React.FC<Props> = ({
  items,
  appointment,
  deliveryMethod,
  errors,
  itemsError,
  getAvailableQuantity,
  getQuantity,
  getHandling,
  onToggleItem,
  onChangeQuantity,
  onChangeHandling,
}) => {
  if (items.length === 0) {
    return <p className="text-[13px] text-slate-500 dark:text-slate-400">Adicione itens ao pedido para selecioná-los.</p>;
  }

  return (
    <div className="min-w-0">
      <table className="block w-full border-collapse text-left md:table md:table-fixed">
        <colgroup className="hidden md:table-column-group">
          <col className="w-[46%]" />
          <col className="w-[12%]" />
          <col className="w-[42%]" />
        </colgroup>
        <thead className="hidden border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400 md:table-header-group">
          <tr>
            <th scope="col" className="px-3 py-2">Produto</th>
            <th scope="col" className="px-3 py-2">Quantidade</th>
            <th scope="col" className="px-3 py-2">Manuseio</th>
          </tr>
        </thead>
        <tbody className="block space-y-3 md:table-row-group md:space-y-0">
          {items.map((item) => {
            const itemId = item.orderItemId!;
            const selected = appointment.itemIds.includes(itemId);
            const available = getAvailableQuantity(item);
            const quantity = getQuantity(item);
            const itemPrefix = `shipping_appointment_${appointment.id}_`;
            const isService = item.itemType === 'service' || item.isComboItem;

            return (
              <tr
                key={itemId}
                className={`grid grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-3 rounded-xl border px-3 py-3 md:table-row md:rounded-none md:border-0 md:bg-white md:px-0 md:py-0 dark:md:bg-slate-900 ${
                  selected
                    ? 'border-slate-200 bg-white dark:border-slate-700'
                    : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/30'
                }`}
              >
                <td className="col-span-2 block min-w-0 md:table-cell md:align-bottom md:px-3 md:pt-3 md:pb-0">
                  <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 md:items-end md:py-0">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && available < 1}
                      aria-invalid={Boolean(itemsError)}
                      title={itemsError || undefined}
                      onChange={(event) => onToggleItem(item, event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600 disabled:cursor-not-allowed md:mt-0 md:self-center"
                    />
                    <span className={`min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug ${
                      itemsError
                        ? 'text-red-700 dark:text-red-300'
                        : selected
                          ? 'text-slate-800 dark:text-slate-100'
                          : 'text-slate-400 dark:text-slate-500'
                    }`} title={item.description}>
                      {item.description}
                    </span>
                    {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 md:mt-0 md:self-center" aria-hidden="true" />}
                  </label>
                  {!selected && available < 1 && (
                    <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
                      Todas as unidades já estão em outras operações
                    </p>
                  )}
                </td>
                <td className="block min-w-0 pt-1 md:table-cell md:px-3 md:pt-3 md:pb-0 md:align-bottom">
                  <label className={`flex w-fit min-w-0 max-w-full flex-col gap-1 text-xs font-medium ${
                    !selected
                      ? 'text-slate-400 dark:text-slate-500'
                      : itemsError
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="md:hidden">Quantidade</span>
                    <span className={`flex w-fit max-w-full items-center border-b-2 transition-colors ${
                      !selected
                        ? 'border-slate-200 dark:border-slate-700'
                        : itemsError
                          ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-200 focus-within:border-blue-600 dark:border-slate-700 dark:focus-within:border-blue-500'
                    }`}>
                      <input
                        type="number"
                        min={1}
                        max={available}
                        step={1}
                        value={selected ? quantity : ''}
                        disabled={!selected || available < 1 || (available === 1 && quantity <= 1)}
                        aria-label={`Quantidade de ${item.description} nesta operação`}
                        aria-invalid={Boolean(selected && itemsError)}
                        title={selected ? itemsError || undefined : undefined}
                        onChange={(event) => onChangeQuantity(item, Math.trunc(Number(event.target.value)))}
                        className="w-10 shrink-0 border-0 bg-transparent px-2 py-2 text-right text-[13px] font-semibold text-slate-800 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
                      />
                      <span className={`shrink-0 px-1.5 text-[11px] font-semibold ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'}`}>
                        UN
                      </span>
                    </span>
                  </label>
                </td>
                <td className="block min-w-0 pt-1 md:table-cell md:px-3 md:pt-3 md:pb-0 md:align-bottom">
                  {isService ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  ) : (
                    <AppointmentHandling
                      item={item}
                      deliveryMethod={deliveryMethod}
                      value={getHandling(item)}
                      disabled={!selected}
                      handlingError={errors[`${itemPrefix}handling_${itemId}`]}
                      assemblyError={errors[`${itemPrefix}assembly_${itemId}`]}
                      onChange={(value) => onChangeHandling(item, value)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
