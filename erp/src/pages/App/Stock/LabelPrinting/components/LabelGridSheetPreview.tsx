import React, { useRef } from 'react';

export interface LabelGridSheetPreviewLayout {
  paperWidth: number;
  paperHeight: number;
  columns: number;
  rows: number;
  margins: { top: number; bottom: number; left: number; right: number };
  gaps: { horizontal: number; vertical: number };
  layoutType: 'round' | 'rect';
  backgroundColor: string;
  imageScale: number;
  previewImage: string | null;
  customPreviewImage: string | null;
}

interface LabelGridSheetPreviewProps {
  layout: LabelGridSheetPreviewLayout;
  onCustomPreviewImageChange: (image: string | null) => void;
}

export const LabelGridSheetPreview: React.FC<LabelGridSheetPreviewProps> = ({
  layout,
  onCustomPreviewImageChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aspect = layout.paperWidth / layout.paperHeight;
  const previewHeight = 1000;
  const previewWidth = previewHeight * aspect;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Conteúdo de Amostra
          </p>
          <p className="text-[7px] text-slate-400 italic">
            Escolha uma imagem para pré-visualizar o layout da folha.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {layout.customPreviewImage && (
            <button
              onClick={() => onCustomPreviewImageChange(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[8px] font-black uppercase transition-all"
            >
              <i className="bi bi-trash3 mr-2" /> Limpar
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (result) =>
                  onCustomPreviewImageChange(result.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-3"
          >
            <i className="bi bi-image-fill" />{' '}
            {layout.customPreviewImage ? 'Trocar Amostra' : 'Escolher Amostra'}
          </button>
        </div>
      </div>

      <div
        className="relative bg-white shadow-2xl border-4 border-white overflow-hidden flex flex-col"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          padding: `${layout.margins.top / 2}px ${layout.margins.right / 2}px ${layout.margins.bottom / 2}px ${layout.margins.left / 2}px`,
        }}
      >
        <div
          className="flex-1 grid"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            columnGap: `${layout.gaps.horizontal / 2}px`,
            rowGap: `${layout.gaps.vertical / 2}px`,
          }}
        >
          {Array.from({ length: layout.columns * layout.rows }).map((_, index) => (
            <div key={index} className="relative flex items-center justify-center overflow-visible">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: layout.backgroundColor || 'white',
                  zIndex: 0,
                }}
              >
                {layout.previewImage && (
                  <img
                    src={layout.previewImage}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `translate(-50%, -50%) scale(${layout.imageScale})`,
                      opacity: 1,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="absolute grid pointer-events-none"
          style={{
            inset: `${layout.margins.top / 2}px ${layout.margins.right / 2}px ${layout.margins.bottom / 2}px ${layout.margins.left / 2}px`,
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            columnGap: `${layout.gaps.horizontal / 2}px`,
            rowGap: `${layout.gaps.vertical / 2}px`,
          }}
        >
          {Array.from({ length: layout.columns * layout.rows }).map((_, index) => (
            <div key={index} className="relative flex items-center justify-center overflow-visible">
              <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 10 }} />
              <div
                className={`relative border border-slate-400 overflow-hidden ${layout.layoutType === 'round' ? 'rounded-full' : ''}`}
                style={{ width: '100%', height: '100%', zIndex: 5 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
