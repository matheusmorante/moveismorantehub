import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { ambientationFormSchema, ambientationPromptFormSchema, ambientationRecordFormSchema, ambientationSelectionFormSchema } from '../../../../../../../../shared-utils/marketingFormSchemas';
import { ambientationService } from '../../services/ambientationService';
import { AmbientedImageRecord } from '../../types';
import { generateRoom } from '../../services/compositionAi';

interface AmbientationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
  originalImageUrl: string;
  onSelectAmbientedImage: (imageUrl: string) => void | boolean | Promise<void | boolean>;
}

export const AmbientationStudioModal: React.FC<AmbientationStudioModalProps> = ({
  isOpen,
  onClose,
  productName,
  productId,
  originalImageUrl,
  onSelectAmbientedImage,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saved, setSaved] = useState<(AmbientedImageRecord & { persistence: 'remote' | 'local' }) | null>(null);
  const generated = useRef<AmbientedImageRecord | null>(null);
  const inFlight = useRef(false), active = useRef(true), uncertain = useRef(false), applyUncertain = useRef(false);
  const { user } = useAuth();
  const source = useRef({ isOpen, productId, productName, originalImageUrl, userId: user?.id });
  if (source.current.isOpen !== isOpen || source.current.productId !== productId || source.current.productName !== productName || source.current.originalImageUrl !== originalImageUrl || source.current.userId !== user?.id) source.current = { isOpen, productId, productName, originalImageUrl, userId: user?.id };
  const formValues = { productId, productName, originalImageUrl, prompt };
  const form = useZodForm(ambientationFormSchema, formValues);
  const promptForm = useZodForm(ambientationPromptFormSchema, { productName });
  const saveForm = useZodForm(ambientationRecordFormSchema, { id: '', productId, originalImageUrl, ambientedImageUrl: '' });
  const selectionForm = useZodForm(ambientationSelectionFormSchema, { id: '', productId, ambientedImageUrl: '' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setPrompt(''); setPreviewUrl(null); setSaved(null); generated.current = null; uncertain.current = false; applyUncertain.current = false; setErrorMessage(''); }, [isOpen, productId, productName, originalImageUrl, user?.id]);
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]);
  const close = () => { if (!inFlight.current) onClose(); };

  const handleGeneratePrompt = async () => {
    if (inFlight.current || generated.current) return;
    inFlight.current = true; setIsGenerating(true); setErrorMessage(''); setStatusMessage('Preparando sugestão de ambiente...');
    const scope = source.current, current = () => active.current && source.current === scope && scope.isOpen;
    try {
      await promptForm.validateAndRun({ productName }, async (values) => {
        const result = await withTimeout(ambientationService.generateAmbientationPrompt(values.productName), 15_000, null, 'Sugestão de ambiente');
        if (!current()) return false;
        if (!result?.trim()) throw new Error('A sugestão não foi confirmada. Tente novamente.');
        setPrompt(result.trim()); return true;
      }, invalid);
    } catch (error) { if (current()) setErrorMessage(error instanceof Error ? error.message : 'Não foi possível preparar a sugestão.'); }
    finally { inFlight.current = false; if (active.current) { setIsGenerating(false); setStatusMessage(''); } }
  };

  const handleSimulateAmbientation = async () => {
    if (inFlight.current) return;
    if (!user?.id) { setErrorMessage('Aguarde a confirmação da sessão.'); return; }
    if (uncertain.current) { setErrorMessage('Há um salvamento sem confirmação. Confira antes de repetir.'); return; }
    inFlight.current = true; setIsGenerating(true); setErrorMessage('');
    const scope = source.current, current = () => active.current && source.current === scope && scope.isOpen;
    let writing = false;
    try {
      await form.validateAndRun(formValues, async (values) => {
        if (!current()) return false;
        if (!generated.current) {
          setStatusMessage('Gerando ambiente por IA...');
          const resultUrl = await withTimeout(generateRoom(values.originalImageUrl, values.productName, 'vermelho e dourado', values.prompt), 90_000, null, 'Gerar ambiente');
          if (!current()) return false;
          if (!resultUrl) throw new Error('A geração não foi confirmada. Tente novamente.');
          const parsed = ambientationRecordFormSchema.safeParse({ id: crypto.randomUUID(), productId: values.productId, originalImageUrl: values.originalImageUrl, ambientedImageUrl: resultUrl, promptUsed: values.prompt });
          if (!parsed.success) throw new Error(parsed.error.issues[0].message);
          const record = parsed.data;
          generated.current = { ...record, createdAt: new Date().toISOString() };
          setPreviewUrl(record.ambientedImageUrl); setSaved(null);
        }
        await saveForm.validateAndRun({ ...generated.current }, async (record) => {
          if (!current()) return false;
          setStatusMessage('Confirmando salvamento da imagem...'); writing = true;
          const receipt = await withTimeout(ambientationService.saveAmbientedImage(record, { isCurrent: current }), 25_000, null, 'Confirmar imagem ambientada');
          if (!current()) return false;
          if (!receipt || receipt.id !== record.id || receipt.productId !== record.productId || receipt.originalImageUrl !== record.originalImageUrl || receipt.ambientedImageUrl !== record.ambientedImageUrl || receipt.promptUsed !== record.promptUsed || !['remote', 'local'].includes(receipt.persistence)) throw new Error('O salvamento da imagem não foi confirmado. Confira antes de repetir.');
          setSaved(receipt); generated.current = null; applyUncertain.current = false; return true;
        }, invalid);
        return true;
      }, invalid);
    } catch (error) {
      if (current()) {
        if (writing && (!error || typeof error !== 'object' || !('knownFailure' in error) || error.knownFailure !== true)) uncertain.current = true;
        setErrorMessage(error instanceof Error ? error.message : 'Não foi possível confirmar o ambiente.');
      }
    } finally { inFlight.current = false; if (active.current) { setIsGenerating(false); setStatusMessage(''); } }
  };

  const handleSelect = async () => {
    if (inFlight.current || !saved) return;
    if (applyUncertain.current) { setErrorMessage('A aplicação não foi confirmada. Confira antes de repetir.'); return; }
    inFlight.current = true; setIsGenerating(true); setErrorMessage(''); setStatusMessage('Aplicando imagem ambientada...');
    const scope = source.current, current = () => active.current && source.current === scope && scope.isOpen;
    let applying = false;
    try {
      await selectionForm.validateAndRun(saved, async (values) => {
        if (!current() || values.productId !== productId.trim() || saved.originalImageUrl !== originalImageUrl) return false;
        applying = true;
        const result = await withTimeout(Promise.resolve(onSelectAmbientedImage(values.ambientedImageUrl)).then((value) => value !== false), 30_000, null, 'Aplicar imagem ambientada');
        if (!current()) return false;
        if (result === null) throw new Error('A aplicação não foi confirmada. Confira antes de repetir.');
        if (!result) { applying = false; throw new Error('A imagem não foi aplicada. Tente novamente.'); }
        onClose(); return true;
      }, invalid);
    } catch (error) { if (current()) { if (applying) applyUncertain.current = true; setErrorMessage(error instanceof Error ? error.message : 'A imagem não foi aplicada.'); } }
    finally { inFlight.current = false; if (active.current) { setIsGenerating(false); setStatusMessage(''); } }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-stars text-amber-400 text-xl"></i>
            <h3 className="text-lg font-bold text-white">Estudio de Ambientacao por IA</h3>
          </div>
          <button aria-label="Fechar estúdio" disabled={isGenerating} onClick={close} className="text-slate-400 hover:text-white text-xl">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
          {statusMessage && <p role="status"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />{statusMessage}</p>}
          {saved && <p role="status">{saved.persistence === 'local' ? 'Imagem salva somente neste navegador.' : 'Imagem salva e confirmada.'}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Foto Real do Produto
              </span>
              <img
                src={originalImageUrl}
                alt={productName}
                className="h-40 mx-auto object-contain rounded-lg"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Resultado Ambientado
              </span>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Ambientado"
                  className="h-40 mx-auto object-contain rounded-lg"
                />
              ) : (
                <div className="text-slate-600 text-xs p-4 border border-dashed border-slate-800 rounded-lg w-full h-40 flex flex-col items-center justify-center">
                  <i className="bi bi-magic text-2xl mb-1"></i>
                  Aguardando geração do ambiente
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Prompt de Instrução para IA (Fundo):
            </label>
            <textarea
              aria-label="Instrução do ambiente"
              disabled={isGenerating || Boolean(generated.current)}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o ambiente para o produto (ex: quarto moderno iluminado)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 h-20 resize-none"
            />
            <button
              onClick={() => void handleGeneratePrompt()}
              disabled={isGenerating || Boolean(generated.current)}
              className="text-[11px] text-indigo-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              <i className="bi bi-wand"></i> Gerar sugestão automática de ambiente
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
            <i className="bi bi-shield-check text-base mt-0.5"></i>
            <span>
              A IA gera apenas o ambiente de fundo. O produto original (formato, cores, espelhos e
              puxadores) é estritamente preservado sem alterações.
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={() => void handleSimulateAmbientation()}
            disabled={isGenerating || uncertain.current}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? (
              <i className="bi bi-arrow-repeat animate-spin"></i>
            ) : (
              <i className="bi bi-stars"></i>
            )}
            {generated.current ? 'Salvar ambiente gerado' : 'Gerar Ambiente por IA'}
          </button>
          {saved && (
            <button
              disabled={isGenerating || applyUncertain.current}
              onClick={() => void handleSelect()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Usar Foto Ambientada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
