import React from 'react';
import { AddressAutocompleteInput } from '@/components/shared/AddressAutocompleteInput';

interface CompanyFiscalDataSectionProps {
    settings: any;
    onChange: (path: string, value: any) => void;
}

export const CompanyFiscalDataSection: React.FC<CompanyFiscalDataSectionProps> = ({ settings, onChange }) => {
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-6">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 mb-2">
                    <i className="bi bi-building-fill-check"></i> Dados da Empresa Emitente (SEFAZ-PR)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Estes dados são incluídos no cabeçalho e identificação do emitente em todas as NF-e e NFC-e geradas.
                </p>
            </div>

            {/* CNPJ e Inscrição Estadual */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">CNPJ do Emitente</label>
                        <input
                            type="text"
                            value={settings.companyCnpj || ''}
                            onChange={(e) => onChange('companyCnpj', e.target.value)}
                            placeholder="00.000.000/0000-00"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-mono font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Inscrição Estadual (IE)</label>
                        <input
                            type="text"
                            value={settings.companyIE || ''}
                            onChange={(e) => onChange('companyIE', e.target.value)}
                            placeholder="Ex: 9091234567"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-mono font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Endereço Desmembrado do Emitente */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AddressAutocompleteInput
                        value={settings.companyLogradouro || ''}
                        onChange={(val) => onChange('companyLogradouro', val)}
                        onSelectAddress={(data) => {
                            onChange('companyLogradouro', data.street);
                            if (data.number) onChange('companyNumero', data.number);
                            if (data.neighborhood) onChange('companyBairro', data.neighborhood);
                            if (data.city) onChange('companyXMun', data.city);
                            if (data.state) onChange('companyUF', data.state);
                            if (data.cep) onChange('companyCep', data.cep);
                        }}
                        cityHint={settings.companyXMun}
                        stateHint={settings.companyUF || 'PR'}
                        label="Logradouro (Rua / Av)"
                        placeholder="Ex: R. Cascavel"
                        className="md:col-span-2"
                        inputClassName="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold"
                    />
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Número</label>
                        <input
                            type="text"
                            value={settings.companyNumero || ''}
                            onChange={(e) => onChange('companyNumero', e.target.value)}
                            placeholder="Ex: 306"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Bairro</label>
                        <input
                            type="text"
                            value={settings.companyBairro || ''}
                            onChange={(e) => onChange('companyBairro', e.target.value)}
                            placeholder="Ex: Guaraituba"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Município / UF</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={settings.companyXMun || 'Colombo'}
                                onChange={(e) => onChange('companyXMun', e.target.value)}
                                placeholder="Cidade"
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 flex-1 transition-all font-bold"
                            />
                            <input
                                type="text"
                                maxLength={2}
                                value={settings.companyUF || 'PR'}
                                onChange={(e) => onChange('companyUF', e.target.value.toUpperCase())}
                                placeholder="UF"
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-16 text-center transition-all font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">CEP</label>
                        <input
                            type="text"
                            value={settings.companyCEP || ''}
                            onChange={(e) => onChange('companyCEP', e.target.value)}
                            placeholder="83410-270"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-mono font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Ambiente, Série e Numeração Sequencial Inicial */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Ambiente de Emissão</label>
                        <select
                            value={settings.nfeEnvironment || 2}
                            onChange={(e) => onChange('nfeEnvironment', Number(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold"
                        >
                            <option value={2}>2 - Homologação (Testes)</option>
                            <option value={1}>1 - Produção (Oficial)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Série Padrão</label>
                        <input
                            type="text"
                            value={settings.nfeSerie || '1'}
                            onChange={(e) => onChange('nfeSerie', e.target.value)}
                            placeholder="1"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Próxima NFC-e (Mod 65)</label>
                        <input
                            type="number"
                            value={settings.nfceNextNumber ?? 700}
                            onChange={(e) => onChange('nfceNextNumber', parseInt(e.target.value, 10) || 700)}
                            placeholder="700"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Próxima NF-e (Mod 55)</label>
                        <input
                            type="number"
                            value={settings.nfeNextNumber ?? 700}
                            onChange={(e) => onChange('nfeNextNumber', parseInt(e.target.value, 10) || 700)}
                            placeholder="700"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                </div>
            </div>
            {/* CSC (Código de Segurança do Contribuinte) para NFC-e */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Identificador do CSC (IdToken)</label>
                        <input
                            type="text"
                            value={settings.cscId || ''}
                            onChange={(e) => onChange('cscId', e.target.value)}
                            placeholder="Ex: 000001"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Código de Segurança CSC (Token)</label>
                        <input
                            type="password"
                            value={settings.cscToken || ''}
                            onChange={(e) => onChange('cscToken', e.target.value)}
                            placeholder="XBMSLQTB4VWHAPSUJLG14Q4YDYZRQLSUQRMF"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Certificado Digital A1 (.pfx / .p12) */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors bg-amber-50/20 dark:bg-amber-950/10 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                    <i className="bi bi-key-fill text-amber-500 text-base" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        Certificado Digital ICP-Brasil A1 (.pfx / .p12)
                    </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Arquivo do Certificado (.pfx)</label>
                        <div className="flex items-center gap-3">
                            <label className="flex-1 cursor-pointer bg-white dark:bg-slate-900 border border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 rounded-2xl p-3.5 text-center transition-all">
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                                    <i className="bi bi-file-earmark-lock-fill" />
                                    {settings.certificateBase64 ? 'Certificado Carregado (.pfx)' : 'Selecionar arquivo .pfx'}
                                </span>
                                <input
                                    type="file"
                                    accept=".pfx,.p12"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const base64 = (reader.result as string)?.split(',')?.[1] || '';
                                            onChange('certificateBase64', base64);
                                            onChange('certificateFileName', file.name);
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                            {settings.certificateBase64 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange('certificateBase64', '');
                                        onChange('certificateFileName', '');
                                    }}
                                    title="Remover Certificado"
                                    className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-500 rounded-xl"
                                >
                                    <i className="bi bi-trash3-fill" />
                                </button>
                            )}
                        </div>
                        {settings.certificateFileName && (
                            <span className="text-[10px] font-bold text-slate-400 mt-1.5 block">
                                Arquivo: {settings.certificateFileName}
                            </span>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Senha do Certificado</label>
                        <input
                            type="password"
                            value={settings.certificatePassword || ''}
                            onChange={(e) => onChange('certificatePassword', e.target.value)}
                            placeholder="Digite a senha do .pfx"
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-amber-500 dark:text-slate-200 w-full transition-all font-bold font-mono"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
