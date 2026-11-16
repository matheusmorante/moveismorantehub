import Item from '../../types/items.type';
import CurrencyDisplay from '../../../components/CurrencyDisplay';
import UnitDisplay from '../../../components/UnitDisplay';
import { getSettings } from '@/pages/utils/settingsService';
import { getFixedDiscount } from '@/pages/utils/calculations';

interface Props {
  items: Item[];
  compact?: boolean;
}

const Body = ({ items, compact = false }: Props) => {
  const settings = getSettings();
  const allOptions = [
    ...(settings.deliveryHandlingOptions || []),
    ...(settings.pickupHandlingOptions || []),
  ];

  return (
    <tbody className={`divide-y divide-slate-100 ${compact ? '' : 'italic'}`}>
      {items.map((item, index) => {
        const fixedDiscount = getFixedDiscount(item);
        const total = (item.unitPrice - (fixedDiscount || 0)) * item.quantity;
        const handlingLabel = (item.handlingType || item.condition || '').trim();
        const handlingOpt = allOptions.find((o) => o.label === handlingLabel);
        const bgColor = handlingOpt?.color || '#3b82f6';
        const handlingTextColor = bgColor !== 'transparent' ? bgColor : '#64748b';

        return (
          <tr key={index} className={compact ? 'text-[11px]' : 'text-sm'}>
            <td className={compact
              ? 'px-2 py-1 font-semibold text-slate-800 uppercase leading-tight'
              : 'px-3 py-1.5 font-bold text-slate-700 uppercase leading-tight text-[13px]'}>
              <div>
                {item.description}
                {item.observation?.trim() ? ` - ${item.observation.trim()}` : ''}
                {compact && handlingLabel && handlingLabel !== '-' && (
                  <span
                    className="font-medium not-italic normal-case"
                    style={{ color: handlingTextColor }}
                  >
                    {' - '}{handlingLabel}
                  </span>
                )}
              </div>
              {!compact && handlingLabel && handlingLabel !== '-' && (
                <div className="mt-1">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border print-exact-bg"
                    style={{
                      backgroundColor: bgColor !== 'transparent' ? `${bgColor}18` : '#f1f5f9',
                      color: bgColor !== 'transparent' ? bgColor : '#475569',
                      borderColor: bgColor !== 'transparent' ? `${bgColor}40` : '#cbd5e1',
                    }}
                  >
                    {handlingLabel}
                  </span>
                </div>
              )}
            </td>
            <td className={compact
              ? 'px-2 py-1 text-center font-semibold text-slate-700 whitespace-nowrap'
              : 'px-1 py-0.5 text-right font-bold text-slate-600 whitespace-nowrap'}>
              <UnitDisplay value={item.quantity} />
            </td>
            <td className={compact
              ? 'px-2 py-1 text-right text-slate-600 font-medium whitespace-nowrap'
              : 'px-2 py-0.5 text-right text-slate-500 font-medium whitespace-nowrap'}>
              <CurrencyDisplay value={item.unitPrice} />
            </td>
            <td className={compact
              ? 'px-2 py-1 text-right text-slate-600 font-medium whitespace-nowrap'
              : 'px-2 py-0.5 text-right text-slate-500 font-medium whitespace-nowrap'}>
              <CurrencyDisplay value={fixedDiscount || 0} />
            </td>
            <td className={compact
              ? 'px-2 py-1 text-right font-bold text-slate-900 whitespace-nowrap'
              : 'px-2 py-0.5 text-right font-black text-slate-900 bg-slate-50/10 whitespace-nowrap'}>
              <CurrencyDisplay value={total} />
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};
export default Body;
