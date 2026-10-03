import React from 'react';
import Order from '@/pages/types/order.type';
import { NfeOrderSummary } from './nfe-modal/NfeOrderSummary';
import { NfeEnvironmentSelector } from './nfe-modal/NfeEnvironmentSelector';
import { NfeItemsSection } from './nfe-modal/NfeItemsSection';
import { NfeSuccessCard } from './nfe-modal/NfeSuccessCard';
import { useNfeEmission } from './nfe-modal/useNfeEmission';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { fetchPersonById } from '@/pages/utils/personService';
import { recipientTaxIdKind } from '../../../../../../shared-utils/recipientTaxId';

const maskRecipientTaxId = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length > 11) {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

interface NfeEmissionModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
}) => {
  const [customerPersonType, setCustomerPersonType] = React.useState<'PF' | 'PJ' | undefined>(
    order?.customerData?.personType
  );
  const [isLoadingCustomerType, setIsLoadingCustomerType] = React.useState(
    Boolean(order?.customerData?.id && !order?.customerData?.personType)
  );
  React.useEffect(() => {
    let active = true;
    const loadPersonType = async () => {
      const snapshotType = order?.customerData?.personType;
      const snapshotDocument = order?.customerData?.cpfCnpj || order?.customerData?.document || '';
      if (snapshotType) {
        setCustomerPersonType(snapshotType);
        setIsLoadingCustomerType(false);
        return;
      }
      setCustomerPersonType(
        snapshotDocument
          ? recipientTaxIdKind(snapshotDocument) === 'CNPJ'
            ? 'PJ'
            : 'PF'
          : undefined
      );
      if (!order?.customerData?.id) {
        setIsLoadingCustomerType(false);
        return;
      }
      setIsLoadingCustomerType(true);
      const person = await fetchPersonById(order.customerData.id);
      if (active) {
        if (person?.personType) setCustomerPersonType(person.personType);
        setIsLoadingCustomerType(false);
      }
    };
    void loadPersonType();
    return () => {
      active = false;
    };
  }, [
    order?.id,
    order?.customerData?.id,
    order?.customerData?.personType,
    order?.customerData?.cpfCnpj,
    order?.customerData?.document,
  ]);
  const emissionOrder = React.useMemo(
    () =>
      order && customerPersonType
        ? { ...order, customerData: { ...order.customerData, personType: customerPersonType } }
        : order,
    [order, customerPersonType]
  );
  const {
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    numberPreview,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    isLoadingFiscalData,
    fiscalPreparationError,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId,
    setNumberPreview,
    emissionResult,
    nfeItems,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
    handleReconcile,
    handlePrintDanfe,
  } = useNfeEmission(emissionOrder, onSuccess);
  const [productionConfirmed, setProductionConfirmed] = React.useState(false);
  const [retryNumber, setRetryNumber] = React.useState('');
  const recipientTaxIdInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(
    () =>
      setRecipientTaxId(
        maskRecipientTaxId(order?.customerData?.cpfCnpj || order?.customerData?.document || '')
      ),
    [order?.id, order?.customerData?.cpfCnpj, order?.customerData?.document, setRecipientTaxId]
  );
  React.useEffect(() => {
    if (recipientTaxIdError) recipientTaxIdInput.current?.focus();
  }, [recipientTaxIdError]);
  React.useEffect(() => {
    setRetryNumber(emissionResult?.numberConflict?.nextNumber?.toString() ?? '');
  }, [emissionResult?.numberConflict?.previousNumber, emissionResult?.numberConflict?.nextNumber]);
  React.useEffect(() => setProductionConfirmed(false), [environment]);
  React.useEffect(() => {
    if (isOpen) setEnvironment(DEFAULT_NFE_ENVIRONMENT);
  }, [isOpen, setEnvironment]);

  if (!isOpen || !order) return null;

  const isPickup = order.shipping?.deliveryMethod === 'pickup';
  const modelLabel = isPickup ? 'NFC-e · modelo 65 · retirada' : 'NF-e · modelo 55 · entrega';
  const numberPreviewContext = `${nfeNumberSequence.model === '55' ? 'NF-e 55' : 'NFC-e 65'} · Série ${nfeNumberSequence.series ?? '—'} · ${environment === 2 ? 'Homologação' : 'Produção'}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emitir nota fiscal de saída"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="bi bi-receipt-cutoff text-lg" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                Emitir nota fiscal de saída
              </h3>
              <p className="text-xs text-slate-400">
                Pedido #{order.orderIndex || order.id} • {modelLabel}
              </p>
            </div>
          </div>
          <button
            aria-label="Fechar emissão fiscal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {environment === 2 ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900/50 dark:bg-amber-950/30"
            >
              <i className="bi bi-shield-exclamation mt-0.5 shrink-0 text-xl text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Homologação · teste sem valor fiscal
                </p>
                <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-200">
                  A SEFAZ receberá este documento no ambiente de testes. Ele não comprova uma venda
                  fiscal em produção.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill mt-0.5 shrink-0 text-xl text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Produção · documento fiscal válido
                  </p>
                  <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-200">
                    A emissão será transmitida à SEFAZ como documento real. Confira pedido, itens,
                    destinatário e NCM antes de confirmar.
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-2 font-bold text-rose-900 dark:text-rose-100">
                <input
                  type="checkbox"
                  checked={productionConfirmed}
                  onChange={(event) => setProductionConfirmed(event.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                <span>Confirmo que quero transmitir esta nota em Produção.</span>
              </label>
            </div>
          )}

          {/* Resumo do Pedido */}
          <NfeOrderSummary order={order} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Dados adicionais do destinatário
            </h4>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
              CPF/CNPJ preenchido aqui será usado somente nesta emissão e não altera o cadastro do
              cliente.
            </p>
            <div className="mt-2">
              <label
                htmlFor="nfe-recipient-tax-id"
                className={`text-xs font-semibold ${recipientTaxIdError ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {isPickup
                  ? 'CPF/CNPJ (Opcional para NFC-e)'
                  : `Insira ${customerPersonType === 'PJ' ? 'o CNPJ' : 'o CPF'}`}
              </label>
              <input
                id="nfe-recipient-tax-id"
                ref={recipientTaxIdInput}
                aria-invalid={Boolean(recipientTaxIdError)}
                inputMode="numeric"
                autoComplete="off"
                value={maskRecipientTaxId(recipientTaxId)}
                onChange={(event) => setRecipientTaxId(maskRecipientTaxId(event.target.value))}
                placeholder={
                  isPickup
                    ? 'Insira o CPF ou CNPJ (Opcional)'
                    : customerPersonType === 'PJ'
                      ? 'Insira o CNPJ'
                      : 'Insira o CPF'
                }
                aria-describedby={recipientTaxIdError ? 'nfe-recipient-tax-id-error' : undefined}
                className={`mt-1 w-full rounded-none border-0 border-b-2 bg-white px-3 py-2 text-sm outline-none transition-colors dark:bg-slate-950 ${recipientTaxIdError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
              />
              {recipientTaxIdError && (
                <p
                  id="nfe-recipient-tax-id-error"
                  role="alert"
                  className="mt-1 text-xs text-rose-700 dark:text-rose-300"
                >
                  {recipientTaxIdError}
                </p>
              )}
            </div>
          </section>

          {/* Lista de Itens com campos fiscais e busca de NCM por código/tokens */}
          {!emissionResult?.success && (
            <NfeItemsSection
              order={order}
              items={nfeItems}
              onUpdateItemFiscal={handleUpdateItemFiscal}
              onBatchUpdateItems={handleBatchUpdateItems}
            />
          )}

          {/* Seleção de Ambiente */}
          <NfeEnvironmentSelector environment={environment} onSelect={setEnvironment} />

          <label className="flex max-w-xs flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            Número da nota (prévia)
            <input
              aria-label="Prévia do próximo número fiscal"
              inputMode="numeric"
              pattern="[0-9]*"
              value={numberPreview}
              onChange={(e) => setNumberPreview(e.target.value.replace(/\D/g, ''))}
              placeholder="Consultando..."
              className="mt-1 w-full rounded-none border-0 border-b-2 border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500"
            />
            <span
              data-testid="nfe-number-preview-context"
              className="font-normal text-slate-600 dark:text-slate-300"
            >
              {numberPreviewContext}
            </span>
            {nfeNumberError && (
              <span role="status" className="font-normal text-amber-700 dark:text-amber-300">
                Prévia indisponível. {nfeNumberError} A reserva automática continua no backend ao
                emitir.
              </span>
            )}
          </label>

          {fiscalPreparationError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <p className="font-bold">
                Os itens foram carregados, mas a preparação fiscal falhou. A emissão está bloqueada
                até que a configuração seja carregada com sucesso.
              </p>
              <p className="mt-1">{fiscalPreparationError}</p>
            </div>
          )}

          {emissionResult && !emissionResult.success && (
            <div
              role="alert"
              className={`rounded-2xl border p-4 text-xs ${emissionResult.pending ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'}`}
            >
              <p className="font-black">
                {emissionResult.pending
                  ? 'Emissão pendente de confirmação'
                  : 'Não foi possível autorizar a nota'}
              </p>
              <p className="mt-1">{emissionResult.error}</p>
              {emissionResult.numberConflict && (
                <div className="mt-3 rounded-xl border border-rose-300 bg-white/70 p-3 dark:border-rose-800 dark:bg-slate-950/50">
                  <p className="font-bold">
                    Número {emissionResult.numberConflict.previousNumber} já está sendo usado.
                    {emissionResult.numberConflict.nextNumber
                      ? ` Número sugerido: ${emissionResult.numberConflict.previousNumber} → ${emissionResult.numberConflict.nextNumber}.`
                      : ' Digite outro número para continuar.'}
                  </p>
                  <label className="mt-2 flex max-w-xs flex-col gap-1 font-semibold">
                    Novo número da nota
                    <input
                      aria-label="Novo número da nota fiscal"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={retryNumber}
                      onChange={(event) => setRetryNumber(event.target.value)}
                      disabled={isSubmitting || Boolean(emissionResult.pending)}
                      placeholder="Informe outro número"
                      className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleEmit(
                        productionConfirmed,
                        false,
                        /^\d{1,9}$/.test(retryNumber) ? Number(retryNumber) : undefined
                      )
                    }
                    disabled={
                      !canOperateFiscal ||
                      isSubmitting ||
                      isLoadingFiscalData ||
                      isLoadingNfeNumber ||
                      Boolean(emissionResult.pending) ||
                      Boolean(fiscalPreparationError) ||
                      (environment === 1 && !productionConfirmed) ||
                      !/^\d{1,9}$/.test(retryNumber)
                    }
                    className="mt-3 rounded-xl bg-rose-700 px-4 py-2 font-black text-white transition-colors hover:bg-rose-800 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando…' : 'Tentar novamente'}
                  </button>
                </div>
              )}
              {emissionResult.cStat && (
                <p className="mt-1 font-mono">
                  SEFAZ cStat {emissionResult.cStat}
                  {emissionResult.sefazMessage ? ` · ${emissionResult.sefazMessage}` : ''}
                </p>
              )}
              {emissionResult.validation?.errors.map((error) => (
                <p key={error} className="mt-1">
                  • {error}
                </p>
              ))}
              {emissionResult.pending && (
                <p className="mt-2 font-semibold">
                  Consulte a situação do documento antes de tentar novamente para evitar
                  duplicidade.
                </p>
              )}
              {emissionResult.pending && emissionResult.documentId && (
                <button
                  onClick={handleReconcile}
                  disabled={!canOperateFiscal || isSubmitting}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-black uppercase tracking-wider text-[10px] transition-all"
                >
                  {isSubmitting ? 'Consultando...' : 'Consultar SEFAZ Agora'}
                </button>
              )}
            </div>
          )}

          {emissionResult?.validation?.warnings?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {emissionResult.validation.warnings.map((warning) => (
                <p key={warning}>• {warning}</p>
              ))}
            </div>
          ) : null}

          {/* Resultado da Emissão */}
          {emissionResult?.success && (
            <NfeSuccessCard result={emissionResult} onPrintDanfe={handlePrintDanfe} />
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          {!emissionResult?.success && !emissionResult?.pending ? (
            (() => {
              if (emissionResult?.numberConflict) return null;
              const isRetryable217 =
                emissionResult?.error?.includes('217') && emissionResult?.documentId;
              return (
                <>
                  {!canOperateFiscal && (
                    <p className="text-xs font-semibold text-rose-600" role="alert">
                      Seu perfil não pode operar documentos fiscais.
                    </p>
                  )}
                  <button
                    type="button"
                    data-testid="nfe-emit-button"
                    onClick={() => handleEmit(productionConfirmed, !!isRetryable217)}
                    disabled={
                      !canOperateFiscal ||
                      isSubmitting ||
                      isLoadingFiscalData ||
                      isLoadingNfeNumber ||
                      isLoadingCustomerType ||
                      Boolean(fiscalPreparationError) ||
                      (environment === 1 && !productionConfirmed)
                    }
                    className={`px-6 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 ${isRetryable217 ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>
                          Transmitindo {environment === 1 ? 'em Produção' : 'em Homologação'}…
                        </span>
                      </>
                    ) : isRetryable217 ? (
                      <>
                        <i className="bi bi-arrow-clockwise" />
                        <span>Retransmitir mesma NF-e</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up-fill" />
                        <span>
                          Emitir {isPickup ? 'NFC-e' : 'NF-e'} em{' '}
                          {environment === 1 ? 'Produção' : 'Homologação'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              );
            })()
          ) : emissionResult?.pending ? null : (
            <button
              type="button"
              onClick={handlePrintDanfe}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <i className="bi bi-printer-fill" />
              <span>Imprimir DANFE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NfeEmissionModal;
