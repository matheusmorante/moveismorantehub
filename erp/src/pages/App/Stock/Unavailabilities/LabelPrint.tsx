import React from 'react';

export default function LabelPrint({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded text-center w-80">
        <h2 className="text-xl font-bold mb-2">INDISPONÍVEL / AVARIADO</h2>
        <p>{item.products?.name}</p>
        <p>Motivo: {item.reason}</p>
        <div className="my-4 flex justify-center">
          {/* Placeholder for QR Code */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://app.morantehub.com/estoque/indisponibilidades/${item.id}`}
            alt="QR Code"
          />
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Imprimir
          </button>
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
