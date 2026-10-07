import React from 'react';

export interface LabelGridModelCanvasElementData {
  id: string;
  pos: { x: number; y: number };
  width: number;
  font?: number;
  isBarcode?: boolean;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  text?: React.ReactNode;
  bgColor?: string;
}

interface LabelGridModelCanvasElementProps {
  el: LabelGridModelCanvasElementData;
  draggingElement: string | null;
  resizingElement: string | null;
  selectedElement: string | null;
  editingTextElement: string | null;
  fontFamily: string;
  setDraggingElement: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElement: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingTextElement: React.Dispatch<React.SetStateAction<string | null>>;
  updateStyle: (key: string, value: any) => void;
  duplicateExtraField: (id: string) => void;
  removeExtraField: (id: string) => void;
  handleMouseDownResize: (
    event: React.MouseEvent,
    element: string,
    side: 'left' | 'right' | 'font',
    value: number,
    currentX: number,
    currentWidth: number
  ) => void;
}

export const LabelGridModelCanvasElement = ({
  el,
  draggingElement,
  resizingElement,
  selectedElement,
  editingTextElement,
  fontFamily,
  setDraggingElement,
  setSelectedElement,
  setEditingTextElement,
  updateStyle,
  duplicateExtraField,
  removeExtraField,
  handleMouseDownResize,
}: LabelGridModelCanvasElementProps) => {
  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        setDraggingElement(el.id);
        setSelectedElement(el.id);
      }}
      className={`absolute flex cursor-move border group/el ${draggingElement === el.id || resizingElement === el.id ? 'z-50' : 'transition-all duration-200 z-10'} ${selectedElement === el.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-slate-300'}`}
      style={{
        left: `${el.pos.x}%`,
        top: `${el.pos.y}%`,
        width: `${el.width}%`,
        height: el.isBarcode ? '15%' : 'max-content',
        transform: 'translate(-50%, -50%)',
        padding: el.isBarcode ? '0' : '4px',
        backgroundColor: el.bgColor || 'transparent',
        fontFamily: fontFamily || 'Inter',
        display: 'flex',
        alignItems:
          el.valign === 'bottom'
            ? 'flex-end'
            : el.valign === 'top'
              ? 'flex-start'
              : 'center',
        justifyContent:
          el.align === 'right'
            ? 'flex-end'
            : el.align === 'left'
              ? 'flex-start'
              : 'center',
        overflow: 'visible',
      }}
    >
      {el.id === 'barcode' ? (
        <div className="w-full flex items-center justify-center opacity-40">
          {' '}
          <i className="bi bi-barcode text-5xl" />{' '}
        </div>
      ) : (
        <div
          onDoubleClick={() => {
            if (el.id.startsWith('extra_') || el.id === 'name')
              setEditingTextElement(el.id);
          }}
          style={{
            fontSize: `calc( (${el.font} / 500) * 100cqh )`,
            fontWeight: el.bold ? '950' : '400',
            color: el.color,
            textAlign: el.align,
            width: '100%',
            lineHeight: '1.1',
            whiteSpace: el.id === 'name' ? 'normal' : 'nowrap',
            wordBreak: el.id === 'name' ? 'break-word' : 'normal',
          }}
        >
          {editingTextElement === el.id ? (
            <input
              autoFocus
              value={el.text}
              onChange={(e) => updateStyle('text', e.target.value)}
              onBlur={() => setEditingTextElement(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingTextElement(null);
              }}
              className="w-full bg-blue-500/10 border-none outline-none text-center rounded ring-4 ring-blue-500/20"
              style={{
                fontSize: 'inherit',
                color: 'inherit',
                fontWeight: 'inherit',
                textAlign: 'inherit',
              }}
            />
          ) : (
            el.text
          )}
        </div>
      )}

      {selectedElement === el.id && el.id.startsWith('extra_') && (
        <div className="absolute -top-4 -right-4 z-[200]">
          <div className="relative group/menu">
            <button className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
              {' '}
              <i className="bi bi-three-dots-vertical text-xs" />{' '}
            </button>
            <div className="absolute top-0 left-full ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl opacity-0 scale-90 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:scale-100 group-hover/menu:pointer-events-auto transition-all flex flex-col min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateExtraField(el.id);
                }}
                className="w-full px-4 py-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors flex items-center gap-3"
              >
                {' '}
                <i className="bi bi-copy text-[10px]" />{' '}
                <span className="text-[8px] font-black uppercase">
                  Duplicar
                </span>{' '}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeExtraField(el.id);
                }}
                className="w-full px-4 py-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors flex items-center gap-3"
              >
                {' '}
                <i className="bi bi-trash3-fill text-[10px]" />{' '}
                <span className="text-[8px] font-black uppercase">
                  Excluir
                </span>{' '}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedElement === el.id && el.id !== 'barcode' && (
        <>
          {/* Alças de Largura (Laterais Ampliadas) */}
          <div
            onMouseDown={(e) =>
              handleMouseDownResize(
                e,
                el.id,
                'right',
                el.font!,
                el.pos.x,
                el.width
              )
            }
            className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize z-50 flex items-center justify-center"
          >
            {' '}
            <div className="w-1.5 h-8 bg-blue-600 rounded-full border border-white" />{' '}
          </div>
          <div
            onMouseDown={(e) =>
              handleMouseDownResize(
                e,
                el.id,
                'left',
                el.font!,
                el.pos.x,
                el.width
              )
            }
            className="absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize z-50 flex items-center justify-center"
          >
            {' '}
            <div className="w-1.5 h-8 bg-blue-600 rounded-full border border-white" />{' '}
          </div>

          {/* NOVO: Alça de Fonte (Borda Inferior) */}
          <div
            onMouseDown={(e) =>
              handleMouseDownResize(
                e,
                el.id,
                'font',
                el.font!,
                el.pos.x,
                el.width
              )
            }
            className="absolute -bottom-2 left-0 right-0 h-4 cursor-ns-resize z-[51] flex flex-col items-center justify-center"
          >
            <div className="w-1/2 h-1 bg-blue-600 rounded-full" />
            <div className="text-[6px] font-black text-blue-600 uppercase mt-0.5 bg-white/80 px-1 rounded">
              Fonte
            </div>
          </div>

          {/* Alça de Canto */}
          <div
            onMouseDown={(e) =>
              handleMouseDownResize(
                e,
                el.id,
                'font',
                el.font!,
                el.pos.x,
                el.width
              )
            }
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-[3px] border-blue-600 rounded-full cursor-nwse-resize shadow-xl z-[52] flex items-center justify-center hover:scale-125 transition-transform"
          >
            {' '}
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />{' '}
          </div>
        </>
      )}
    </div>
  );
};
