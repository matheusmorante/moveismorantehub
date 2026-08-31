import Agendamento from "../ShippingComponents/Agendamento";
import Shipping from "../../../types/Shipping.type";
import ReturnObservationTags from "./ReturnObservationTags";

type Props = { collectAtAddress: boolean; onCollectChange: (value: boolean) => void; scheduling: Shipping["scheduling"]; onSchedulingChange: (key: string, value: unknown) => void; observations: string[]; onObservationsChange: (items: string[]) => void };

const ReturnCollectionSection = ({ collectAtAddress, onCollectChange, scheduling, onSchedulingChange, observations, onObservationsChange }: Props) => <div className="space-y-4">
    <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"><div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30"><i className="bi bi-truck text-xl" /></div><div><span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">Coleta no endereço</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-slate-400">Retirar itens na casa do cliente</span></div></div><button type="button" aria-pressed={collectAtAddress} onClick={() => onCollectChange(!collectAtAddress)} className={`flex h-7 w-14 items-center rounded-full p-1 transition-all ${collectAtAddress ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}><span className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${collectAtAddress ? "translate-x-7" : "translate-x-0"}`} /></button></div>
    {collectAtAddress && <div className="space-y-4 animate-fade-in"><Agendamento scheduling={scheduling} onChangeScheduling={onSchedulingChange as any} errors={{}} isPickup hideSchedulingShortcuts /><ReturnObservationTags label="Observações sobre a coleta" observations={observations} onChange={onObservationsChange} /></div>}
</div>;

export default ReturnCollectionSection;
