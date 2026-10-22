import React, { useState, useEffect, useRef } from 'react';
import Service from '../../types/service.type';
import { saveService } from '../../utils/serviceService';
import { toast } from 'react-toastify';
import CurrencyInput from '../../../components/CurrencyInput';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { serviceFormSchema } from '../../../../../shared-utils/serviceFormSchema';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
}

const ServiceFormModal = (props: ServiceFormModalProps) => props.isOpen
  ? <ServiceFormEditor key={props.service?.id || 'new'} {...props} /> : null;

const ServiceFormEditor = ({ onClose, service }: ServiceFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false), unconfirmed = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [formData, setFormData] = useState(() => ({
    description: service?.description ?? '', unitPrice: service?.unitPrice ?? 0,
    costPrice: service?.costPrice ?? 0, active: service?.active ?? true,
    fiscalTreatment: service?.fiscalTreatment ?? {
      nfeComposition: 'not_reviewed' as const,
      incorporationConfirmed: false,
      validationReference: '',
    },
  }));
  const form = useZodForm(serviceFormSchema, formData);
  const close = () => { if (!locked.current) onClose(); };
  const markUnconfirmed = () => {
    unconfirmed.current = true; setUncertain(true);
    setError('Não foi possível confirmar a gravação. Consulte os serviços antes de repetir.');
  };
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (locked.current || unconfirmed.current) return;
    locked.current = true; setLoading(true); setError('');
    void form.validateAndRun(formData, async (values) => {
      if (!mounted.current) return;
      // Keep the deadline inside the resolver's callback to release RHF too.
      const response = await withTimeout(saveService({ ...values, id: service?.id, isDraft: false })
        .then((saved) => ({ saved })), 30_000, null, 'servicos:salvar');
      if (!mounted.current) return;
      if (!response?.saved?.id || (service?.id && response.saved.id !== service.id)) { markUnconfirmed(); return; }
      toast.success(service ? 'Serviço atualizado!' : 'Serviço criado com sucesso!');
      onClose();
    }, (errors) => {
      if (!mounted.current) return;
      const message = Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do serviço.';
      setError(message); toast.error(message);
    }).catch((cause) => {
      if (!mounted.current) return;
      if (cause instanceof TypeError || cause?.uncertain || cause?.code === '') markUnconfirmed();
      else setError('Não foi possível salvar o serviço. Confira os dados e as permissões.');
    }).finally(() => { locked.current = false; if (mounted.current) setLoading(false); });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close} />
      <div role="dialog" aria-modal="true" aria-labelledby="service-form-title" className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 id="service-form-title" className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {service ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>
            <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
              {service
                ? `Editando ID: ${service.id}`
                : 'Configure as informações detalhadas do serviço'}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Fechar cadastro de serviço"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-auto"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {error && <p role="alert" className="px-8 py-4 text-red-700">{error}</p>}
        {loading && <p role="status" className="px-8 py-4 animate-pulse">Validando e salvando o serviço…</p>}
        <form id="service-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <fieldset disabled={loading || uncertain} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Descrição do Serviço
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                placeholder="Ex: Manutenção Preventiva"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Preço de Venda (R$)
              </label>
              <CurrencyInput
                value={formData.unitPrice || 0}
                onChangeValue={(val) => setFormData({ ...formData, unitPrice: val })}
                className="w-full px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-black text-blue-600 dark:text-blue-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Preço de Custo (R$)
              </label>
              <CurrencyInput
                value={formData.costPrice || 0}
                onChangeValue={(val) => setFormData({ ...formData, costPrice: val })}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-slate-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
              />
            </div>
            <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
                Tratamento fiscal do serviço na NF-e 55 / NFC-e 65
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                Vincular um serviço a um produto no pedido não autoriza sua incorporação. Por padrão, o serviço fica fora da NF-e 55 e da NFC-e 65 até que o tratamento fiscal seja definido.
              </p>
              <label className="mt-4 flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Enquadramento para composição fiscal
                <select
                  aria-label="Tratamento fiscal do serviço para NF-e 55 e NFC-e 65"
                  value={formData.fiscalTreatment.nfeComposition}
                  onChange={(event) => {
                    const nfeComposition = event.target.value as typeof formData.fiscalTreatment.nfeComposition;
                    setFormData((current) => ({
                      ...current,
                      fiscalTreatment: {
                        ...current.fiscalTreatment,
                        nfeComposition,
                        ...(nfeComposition !== 'include_with_merchandise'
                          ? { incorporationConfirmed: false }
                          : {}),
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="not_reviewed">Não validado — não incorporar</option>
                  <option value="separate_document">Documento fiscal próprio — tratar separadamente</option>
                  <option value="include_with_merchandise">Compor o valor da mercadoria — validado</option>
                </select>
              </label>
              {formData.fiscalTreatment.nfeComposition === 'include_with_merchandise' ? (
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      aria-label="Confirmo a validação fiscal da composição do serviço"
                      checked={Boolean(formData.fiscalTreatment.incorporationConfirmed)}
                      onChange={(event) => setFormData((current) => ({
                        ...current,
                        fiscalTreatment: {
                          ...current.fiscalTreatment,
                          incorporationConfirmed: event.target.checked,
                        },
                      }))}
                      className="mt-0.5"
                    />
                    <span>Confirmo que a análise fiscal permite compor este serviço ao valor da mercadoria e que a prestação não deve ser faturada separadamente neste tratamento.</span>
                  </label>
                  <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Referência da validação fiscal
                    <input
                      aria-label="Referência da validação fiscal do serviço"
                      value={formData.fiscalTreatment.validationReference || ''}
                      onChange={(event) => setFormData((current) => ({
                        ...current,
                        fiscalTreatment: {
                          ...current.fiscalTreatment,
                          validationReference: event.target.value,
                        },
                      }))}
                      placeholder="Registre o parecer ou orientação fiscal que sustenta o enquadramento"
                      maxLength={500}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                  <p className="text-[10px] text-amber-800 dark:text-amber-200">
                    A confirmação fica registrada com usuário e data. Se houver obrigação de NFS-e ou dúvida de enquadramento, escolha documento fiscal próprio ou mantenha como não validado.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                  {formData.fiscalTreatment.nfeComposition === 'separate_document'
                    ? 'Este serviço não será incorporado à NF-e; verifique e trate o documento fiscal próprio, inclusive eventual NFS-e.'
                    : 'Serviços sem validação fiscal documentada não serão incorporados automaticamente à NF-e.'}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  Status do Serviço
                </h4>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  Serviços inativos não aparecem em novas vendas
                </p>
              </div>
              <button type="button" role="switch" aria-label="Serviço ativo" aria-checked={formData.active}
                className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                onClick={() => setFormData({ ...formData, active: !formData.active })}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${formData.active ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </fieldset>
        </form>

        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={close}
            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="service-form"
            disabled={loading || uncertain}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="bi bi-check-lg" />
            )}
            {service ? 'Salvar Alterações' : 'Criar Serviço'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceFormModal;
