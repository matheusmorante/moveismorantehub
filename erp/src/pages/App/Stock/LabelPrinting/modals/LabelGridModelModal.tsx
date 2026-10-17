import React from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelGridModelSaveFormSchema } from '../../../../../../../shared-utils/labelLayoutFormSchemas';
import { LabelGridSheetPreview } from '../components/LabelGridSheetPreview';
import { createGridModelFromEditorState } from '../services/labelGridModelFactory';
import { LabelGridModelToolbar } from './label-grid-model-editor/LabelGridModelToolbar';
import { LabelGridModelSettingsPanel } from './label-grid-model-editor/LabelGridModelSettingsPanel';
import { LabelGridModelHeader } from './label-grid-model-editor/LabelGridModelHeader';
import { LabelGridModelDesignCanvas } from './label-grid-model-editor/LabelGridModelDesignCanvas';
import {
  useLabelGridModelSession,
  PAPER_OPTIONS,
} from './label-grid-model-editor/useLabelGridModelSession';
import { useLabelGridModelInteractions } from './label-grid-model-editor/useLabelGridModelInteractions';

const BOOTSTRAP_ICONS_URL =
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Libre+Barcode+128&display=swap';

import type { GridModel } from '../types/LabelGridModelTypes';
export type { GridModel } from '../types/LabelGridModelTypes';

interface LabelGridModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: GridModel, stillCurrent?: () => boolean) => Promise<boolean>;
  isPersisting?: boolean;
  error?: string;
  blocked?: boolean;
  editingModel?: GridModel | null;
  currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
  currentType?: 'round' | 'rect';
  previewImage?: string | null;
}

const LabelGridModelDialog: React.FC<LabelGridModelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingModel,
  currentCategory,
  currentType,
  previewImage,
  isPersisting = false,
  error = '',
  blocked = false,
}) => {
  const session = useLabelGridModelSession({
    isOpen,
    editingModel,
    currentCategory,
    currentType,
    previewImage,
  });

  const interactions = useLabelGridModelInteractions(session);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [saveBlocked, setSaveBlocked] = React.useState(false);

  const saveLocked = React.useRef(false);
  const mounted = React.useRef(false);
  const closed = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const busy = isSaving || isPersisting;
  const current = () => mounted.current && !closed.current;

  const close = () => {
    if (current() && !saveLocked.current && !isPersisting) {
      closed.current = true;
      onClose();
    }
  };

  const modelForm = useZodForm(labelGridModelSaveFormSchema, {
    id: '',
    name: '',
    columns: 1,
    rows: 1,
    marginT: 0,
    marginB: 0,
    marginL: 0,
    marginR: 0,
    gapH: 0,
    gapV: 0,
    paperSize: 'A4',
    icon: '',
  });

  const handleSave = async () => {
    if (!current() || saveLocked.current || isPersisting || saveBlocked || blocked) return;
    saveLocked.current = true;
    setIsSaving(true);
    setSaveError('');

    try {
      const editorState = session.buildEditorState();
      const newModel = createGridModelFromEditorState(editorState);

      await modelForm.validateAndRun(
        { ...newModel },
        async (values) => {
          if (!current()) return;
          const confirmed = await onSave(values, current);
          if (!current()) return;
          if (confirmed === true) {
            closed.current = true;
            onClose();
          } else {
            setSaveError(
              'A gravação do modelo não foi confirmada. Confira os dados antes de repetir.'
            );
          }
        },
        (errors) => {
          const message = Object.values(flattenFormErrors(errors))[0] || 'Confira o modelo.';
          if (current()) {
            setSaveError(message);
            toast.error(message);
          }
        }
      );
    } catch (cause) {
      if (current()) {
        const message =
          cause instanceof Error ? cause.message : 'Não foi possível salvar o modelo.';
        setSaveError(message);
        toast.error(message);
        if ((cause as { uncertain?: boolean })?.uncertain) setSaveBlocked(true);
      }
    } finally {
      saveLocked.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const settingsPanelState = {
    name: session.name,
    generatedName: session.generatedName,
    paperSize: session.paperSize,
    paperOptions: PAPER_OPTIONS,
    customWidth: session.customWidth,
    customHeight: session.customHeight,
    columns: session.columns,
    rows: session.rows,
    imageScale: session.imageScale,
    gapH: session.gapH,
    gapV: session.gapV,
    marginT: session.marginT,
    marginB: session.marginB,
    marginL: session.marginL,
    marginR: session.marginR,
  };

  const settingsPanelHandlers = {
    onNameChange: session.setName,
    onPaperSizeChange: (value: string) => {
      const option = PAPER_OPTIONS.find((candidate) => candidate.id === value);
      if (option) {
        session.setPaperSize(option.id);
        if (option.id !== 'Custom') {
          session.setCustomWidth(option.w);
          session.setCustomHeight(option.h);
        }
      }
    },
    onCustomWidthChange: session.setCustomWidth,
    onCustomHeightChange: session.setCustomHeight,
    onColumnsChange: session.setColumns,
    onRowsChange: session.setRows,
    onDecreaseImageScale: () =>
      session.setImageScale((prev) => Math.max(0.1, parseFloat((prev - 0.01).toFixed(2)))),
    onImageScaleChange: session.setImageScale,
    onIncreaseImageScale: () =>
      session.setImageScale((prev) => Math.min(10, parseFloat((prev + 0.01).toFixed(2)))),
    onGapHChange: session.setGapH,
    onGapVChange: session.setGapV,
    onMarginTChange: session.setMarginT,
    onMarginBChange: session.setMarginB,
    onMarginLChange: session.setMarginL,
    onMarginRChange: session.setMarginR,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={busy}
      aria-labelledby="label-grid-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
    >
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <link rel="stylesheet" href={BOOTSTRAP_ICONS_URL} />
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-500 border-0 cursor-default"
        onClick={close}
        disabled={busy}
        aria-label="Fechar editor de grade de etiqueta"
      />
      <fieldset
        disabled={busy}
        onMouseDownCapture={(event) => {
          if (busy) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerDownCapture={(event) => {
          if (busy) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDownCapture={(event) => {
          if (busy) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        className={`relative m-0 min-w-0 p-0 bg-white dark:bg-slate-900 w-full ${
          interactions.isDesignMode ? 'max-w-7xl' : 'max-w-5xl'
        } h-[95vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500`}
      >
        {(error || saveError) && (
          <p role="alert" className="px-8 pt-4 text-sm text-red-600">
            {error || saveError}
          </p>
        )}
        {busy && (
          <p role="status" className="flex items-center gap-2 px-8 pt-4 text-sm text-blue-600">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
            />
            Salvando modelo…
          </p>
        )}
        <LabelGridModelHeader
          isDesignMode={interactions.isDesignMode}
          setIsDesignMode={interactions.setIsDesignMode}
          marginT={session.marginT}
          marginB={session.marginB}
          marginL={session.marginL}
          marginR={session.marginR}
          gapH={session.gapH}
          gapV={session.gapV}
          displayName={session.name.trim() || session.generatedName}
          onSave={handleSave}
          busy={busy}
          saveBlocked={saveBlocked}
          blocked={blocked}
          isSaving={isSaving}
        />

        {interactions.isDesignMode ? (
          <>
            <LabelGridModelToolbar
              state={interactions.toolbarState}
              handlers={interactions.toolbarHandlers}
            />
            <LabelGridModelDesignCanvas
              customWidth={session.customWidth}
              customHeight={session.customHeight}
              columns={session.columns}
              rows={session.rows}
              gapH={session.gapH}
              gapV={session.gapV}
              marginL={session.marginL}
              marginR={session.marginR}
              marginT={session.marginT}
              marginB={session.marginB}
              bgColor={session.bgColor}
              effectivePreviewImage={session.effectivePreviewImage}
              imageScale={session.imageScale}
              setPreviewRef={interactions.setPreviewRef}
              handleMouseMove={interactions.handleMouseMove}
              handleMouseUp={interactions.handleMouseUp}
              showGuides={interactions.showGuides}
              isPromoPreview={interactions.isPromoPreview}
              promoNamePos={session.promoNamePos}
              namePos={session.namePos}
              promoNameWidth={session.promoNameWidth}
              nameWidth={session.nameWidth}
              promoNameHeight={session.promoNameHeight}
              nameHeight={session.nameHeight}
              promoNameFontSize={session.promoNameFontSize}
              nameFontSize={session.nameFontSize}
              promoNameColor={session.promoNameColor}
              nameColor={session.nameColor}
              promoNameBold={session.promoNameBold}
              nameBold={session.nameBold}
              promoNameAlign={session.promoNameAlign}
              nameAlign={session.nameAlign}
              promoNameVAlign={session.promoNameVAlign}
              nameVAlign={session.nameVAlign}
              promoNameBgColor={session.promoNameBgColor}
              nameBgColor={session.nameBgColor}
              promoPos={session.promoPos}
              pricePos={session.pricePos}
              promoWidth={session.promoWidth}
              priceWidth={session.priceWidth}
              promoHeight={session.promoHeight}
              priceHeight={session.priceHeight}
              promoPriceFontSize={session.promoPriceFontSize}
              priceFontSize={session.priceFontSize}
              priceFontSizeThousands={session.priceFontSizeThousands}
              promoPriceColor={session.promoPriceColor}
              priceColor={session.priceColor}
              promoPriceBold={session.promoPriceBold}
              priceBold={session.priceBold}
              promoPriceAlign={session.promoPriceAlign}
              priceAlign={session.priceAlign}
              promoPriceVAlign={session.promoPriceVAlign}
              priceVAlign={session.priceVAlign}
              promoBgColor={session.promoBgColor}
              priceBgColor={session.priceBgColor}
              oldPricePos={session.oldPricePos}
              oldPriceWidth={session.oldPriceWidth}
              oldPriceHeight={session.oldPriceHeight}
              oldPriceFontSize={session.oldPriceFontSize}
              oldPriceColor={session.oldPriceColor}
              oldPriceBold={session.oldPriceBold}
              oldPriceAlign={session.oldPriceAlign}
              oldPriceVAlign={session.oldPriceVAlign}
              priceFormat={session.priceFormat}
              promoPriceSymbolPos={session.promoPriceSymbolPos}
              priceSymbolPos={session.priceSymbolPos}
              promoPriceSymbolFontSize={session.promoPriceSymbolFontSize}
              priceSymbolFontSize={session.priceSymbolFontSize}
              promoPriceSymbolColor={session.promoPriceSymbolColor}
              priceSymbolColor={session.priceSymbolColor}
              promoPriceSymbolBold={session.promoPriceSymbolBold}
              priceSymbolBold={session.priceSymbolBold}
              promoPriceDecimalsPos={session.promoPriceDecimalsPos}
              priceDecimalsPos={session.priceDecimalsPos}
              promoPriceDecimalsFontSize={session.promoPriceDecimalsFontSize}
              priceDecimalsFontSize={session.priceDecimalsFontSize}
              promoPriceDecimalsColor={session.promoPriceDecimalsColor}
              priceDecimalsColor={session.priceDecimalsColor}
              promoPriceDecimalsBold={session.promoPriceDecimalsBold}
              priceDecimalsBold={session.priceDecimalsBold}
              currentCategory={currentCategory}
              promoBarcodePos={session.promoBarcodePos}
              barcodePos={session.barcodePos}
              extraFields={session.extraFields}
              extraFieldsPromo={session.extraFieldsPromo}
              draggingElement={interactions.draggingElement}
              resizingElement={interactions.resizingElement}
              selectedElement={interactions.selectedElement}
              editingTextElement={interactions.editingTextElement}
              fontFamily={session.fontFamily}
              setDraggingElement={interactions.setDraggingElement}
              setSelectedElement={interactions.setSelectedElement}
              setEditingTextElement={interactions.setEditingTextElement}
              updateStyle={interactions.updateStyle}
              duplicateExtraField={interactions.duplicateExtraField}
              removeExtraField={interactions.removeExtraField}
              handleMouseDownResize={interactions.handleMouseDownResize}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 flex flex-col gap-8 items-center">
            <LabelGridModelSettingsPanel
              state={settingsPanelState}
              handlers={settingsPanelHandlers}
            />

            {/* Botão de Edição de Design (Oculto em categorias de imagem) */}
            {currentCategory !== 'logos' && currentCategory !== 'posts' && (
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                <button
                  onClick={() => interactions.setIsDesignMode(true)}
                  className="relative px-12 py-6 bg-white dark:bg-slate-900 border-2 border-blue-500/20 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:scale-105 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <i className="bi bi-palette2 text-3xl" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Aparência da Etiqueta
                    </p>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                      Editar Design Visual
                    </h4>
                  </div>
                  <i className="bi bi-chevron-right text-2xl text-blue-300 ml-4" />
                </button>
              </div>
            )}

            {/* Prévia da Folha */}
            <div className="flex flex-col items-center gap-4 w-full pb-12">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Prévia do modelo em folha inteira
              </p>
              <LabelGridSheetPreview
                disabled={busy}
                ownerKey={JSON.stringify([isOpen, currentCategory, editingModel?.id ?? 'new'])}
                layout={{
                  paperWidth:
                    session.paperSize === 'Custom' ? session.customWidth : session.selectedPaper.w,
                  paperHeight:
                    session.paperSize === 'Custom'
                      ? session.customHeight
                      : session.selectedPaper.h,
                  columns: session.columns,
                  rows: session.rows,
                  margins: {
                    top: session.marginT,
                    bottom: session.marginB,
                    left: session.marginL,
                    right: session.marginR,
                  },
                  gaps: { horizontal: session.gapH, vertical: session.gapV },
                  layoutType: session.layoutType,
                  backgroundColor: session.bgColor,
                  imageScale: session.imageScale,
                  previewImage: session.effectivePreviewImage,
                  customPreviewImage: session.customPreviewImage,
                }}
                onCustomPreviewImageChange={session.setCustomPreviewImage}
              />
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
};

const LabelGridModelModal: React.FC<LabelGridModelModalProps> = (props) =>
  props.isOpen ? (
    <LabelGridModelDialog
      key={JSON.stringify([
        props.currentCategory,
        props.currentType,
        props.editingModel?.id ?? 'new',
      ])}
      {...props}
    />
  ) : null;

export default LabelGridModelModal;
