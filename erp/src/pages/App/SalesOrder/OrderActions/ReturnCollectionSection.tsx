import Agendamento from "../ShippingComponents/Agendamento";
import Shipping from "../../../types/Shipping.type";
import ReturnObservationTags from "./ReturnObservationTags";

type Props = { collectAtAddress: boolean | null; onCollectChange: (value: boolean) => void; scheduling: Shipping["scheduling"]; onSchedulingChange: (key: string, value: unknown) => void; observations: string[]; onObservationsChange: (items: string[]) => void };

const ReturnCollectionSection = ({ collectAtAddress, onCollectChange, scheduling, onSchedulingChange, observations, onObservationsChange }: Props) => <div className="space-y-4">
    <fieldset className="rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <legend className="px-2 text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">Coleta no endereço <span className="text-red-500">*</span></legend>
        <p className="mb-4 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Escolha como os itens devolvidos serão recebidos</p>
        <div className="grid gap-3 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${collectAtAddress === false ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                <input type="radio" name="return-collection" checked={collectAtAddress === false} onChange={() => onCollectChange(false)} className="h-4 w-4 accent-emerald-600" />
                <span><span className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">O cliente devolveu diretamente na loja</span><span className="mt-1 block text-[9px] font-medium text-slate-400">A devolução será atendida agora.</span></span>
            </label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${collectAtAddress === true ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                <input type="radio" name="return-collection" checked={collectAtAddress === true} onChange={() => onCollectChange(true)} className="h-4 w-4 accent-blue-600" />
                <span><span className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Agendar coleta</span><span className="mt-1 block text-[9px] font-medium text-slate-400">Retirar itens no endereço do cliente.</span></span>
            </label>
        </div>
    </fieldset>
    {collectAtAddress && <div className="space-y-4 animate-fade-in"><Agendamento scheduling={scheduling} onChangeScheduling={onSchedulingChange as any} errors={{}} isPickup hideSchedulingShortcuts /><ReturnObservationTags label="Observações sobre a coleta" observations={observations} onChange={onObservationsChange} /></div>}
</div>;

export default ReturnCollectionSection;
