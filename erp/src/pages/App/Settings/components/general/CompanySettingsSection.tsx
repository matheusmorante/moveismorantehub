import React from 'react';
import { PatternFormat as PatternFormatBase } from 'react-number-format';
import { AppSettings } from '@/pages/utils/settingsService';

const PatternFormat = PatternFormatBase as any;
interface Props { settings: AppSettings; onChange: (path: string, value: any) => void; }
interface FieldProps { title: string; description: string; children: React.ReactNode; }

const Field = ({ title, description, children }: FieldProps) => (
    <div className="p-8 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg flex-1"><h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{title}</h4><p className="mt-1 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{description}</p></div>
            {children}
        </div>
    </div>
);

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-900/20';

export default function CompanySettingsSection({ settings, onChange }: Props) {
    const openWhatsApp = () => {
        const phone = settings.companyPhone?.replace(/\D/g, '') || '';
        if (!phone) return;
        window.open(`https://wa.me/${phone.length >= 10 && phone.length <= 11 ? `55${phone}` : phone}`, '_blank');
    };

    return <>
        <Field title="Nome da Empresa" description="Nome exibido em documentos e comunicações."><input type="text" value={settings.companyName || ''} onChange={event => onChange('companyName', event.target.value)} className={`${inputClass} md:w-80`} /></Field>
        <Field title="CNPJ" description="Cadastro Nacional da Pessoa Jurídica da empresa."><div className="w-full md:w-80"><PatternFormat format="##.###.###/####-##" mask="_" value={settings.companyCnpj || ''} onValueChange={(values: any) => onChange('companyCnpj', values.value || '')} className={inputClass} /></div></Field>
        <Field title="Telefone" description="Telefone oficial de atendimento da empresa."><div className="flex w-full gap-2 md:w-80"><PatternFormat format="(##) #####-####" mask="_" value={settings.companyPhone || ''} onValueChange={(values: any) => onChange('companyPhone', values.value || '')} className={inputClass} /><button type="button" onClick={openWhatsApp} title="Verificar WhatsApp" className="flex w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white transition-all hover:bg-[#128C7E]"><i className="bi bi-whatsapp text-lg" /></button></div></Field>
        <Field title="Endereço Completo" description="Endereço da sede ou loja física."><input type="text" value={settings.companyAddress || ''} onChange={event => onChange('companyAddress', event.target.value)} className={`${inputClass} md:w-80`} /></Field>
    </>;
}
