import { ZodForm } from '@/components/forms/ZodForm';
import { manualScanFormSchema } from '../../../../shared-utils/lookupFormSchemas';

interface ManualScanFormProps {
  code: string;
  onCodeChange: (code: string) => void;
  onValid: (code: string) => void;
  onReturnToCamera: () => void;
}

export function ManualScanForm({
  code,
  onCodeChange,
  onValid,
  onReturnToCamera,
}: ManualScanFormProps) {
  return (
    <ZodForm
      schema={manualScanFormSchema}
      values={{ code }}
      onValid={({ code: parsedCode }) => onValid(parsedCode)}
      className="space-y-6 py-4"
    >
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
          Código do Produto
        </label>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Ex: 789123..."
          className="w-full px-6 py-5 bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 font-black text-2xl tracking-tighter"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 hover:bg-blue-700 transition-colors"
        >
          Confirmar SKU
        </button>
        <button
          type="button"
          onClick={onReturnToCamera}
          className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
        >
          Câmera
        </button>
      </div>
    </ZodForm>
  );
}
