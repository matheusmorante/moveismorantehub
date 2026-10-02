import type { StockUnavailability } from '@/pages/utils/stockUnavailabilityService';

interface LabelPrintProps {
  item: StockUnavailability | null;
  onClose: () => void;
}

export default function LabelPrint({ item, onClose }: LabelPrintProps) {
  if (!item) return null;

  const productName = item.products?.name || 'Produto';
  const variationName = item.product_variations?.name;
  const variationSku = item.product_variations?.sku;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-print-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:p-0 print:bg-transparent print:static"
    >
      <div className="bg-white p-6 rounded-xl text-center w-80 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:w-full">
        <h2
          id="label-print-title"
          className="text-lg font-black text-red-700 uppercase tracking-wider mb-2 print:text-black"
        >
          INDISPONÍVEL / AVARIADO
        </h2>
        <p className="font-bold text-slate-900 leading-tight">{productName}</p>
        {variationName && (
          <p className="text-sm text-slate-600 mt-0.5">
            {variationName}
            {variationSku ? ` (${variationSku})` : ''}
          </p>
        )}

        <div className="text-xs text-slate-500 mt-2 space-y-0.5">
          <p>
            <span className="font-semibold text-slate-700">Motivo:</span> {item.reason}
          </p>
          {item.treatment && (
            <p>
              <span className="font-semibold text-slate-700">Tratativa:</span> {item.treatment}
            </p>
          )}
          {item.physical_location && (
            <p>
              <span className="font-semibold text-slate-700">Local:</span> {item.physical_location}
            </p>
          )}
          <p className="font-bold text-red-600 pt-0.5">Qtd Bloqueada: -{item.quantity}</p>
        </div>

        <div className="my-4 flex justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://app.morantehub.com/estoque/indisponibilidades/${item.id}`}
            alt={`QR Code da indisponibilidade ${item.id}`}
            width={150}
            height={150}
            className="rounded border border-slate-100"
          />
        </div>

        <p className="text-[10px] text-slate-400 font-mono mb-4 break-all select-all">
          ID: {item.id}
        </p>

        <div className="flex justify-between gap-2 mt-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
