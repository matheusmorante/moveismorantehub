/** @jsxImportSource react */
import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '../../../utils/whatsappGraphService';
import { toast } from 'react-toastify';
import { useState } from 'react';

interface WhatsAppConfigSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

export default function WhatsAppConfigSection({ settings, onChange }: WhatsAppConfigSectionProps) {
    const [isTesting, setIsTesting] = useState(false);

    const config = settings.whatsappConfig || {
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        catalogId: ''
    };

    const handleFieldChange = (field: string, value: string) => {
        onChange(`whatsappConfig.${field}`, value);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            await whatsappGraphService.testConnection(config);
            toast.success("Conexão com WhatsApp API estabelecida com sucesso! ✅");
        } catch (error: any) {
            toast.error(`Falha na conexão: ${error.message}`);
            console.error(error);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4">
                    <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl"></i>
                    <div className="flex-1">
                        <h5 className="text-amber-800 dark:text-amber-400 font-bold text-sm uppercase tracking-wider">Atenção</h5>
                        <p className="text-amber-700/80 dark:text-amber-500/80 text-xs mt-1 leading-relaxed font-medium">
                            Para o Catálogo e Marketplace funcionarem, você deve usar um <b>Token de Sistema (Permanente)</b> gerado no Meta Business Manager. Tokens temporários expiram em 24 horas.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all shadow-sm disabled:opacity-50 min-w-[180px]"
                >
                    {isTesting ? (
                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <i className="bi bi-broadcast"></i>
                    )}
                    Testar Conexão
                </button>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Token de Acesso</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Token permanente do Usuário do Sistema com permissões de messaging e catalog.
                        </p>
                    </div>
                    <textarea
                        value={config.accessToken}
                        onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                        placeholder="EAAXh..."
                        rows={3}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-mono"
                    />
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Phone Number ID</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Identificador do número de telefone registrado na API.</p>
                    </div>
                    <input
                        type="text"
                        value={config.phoneNumberId}
                        onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                        placeholder="Ex: 1092837465..."
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">WABA ID</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">WhatsApp Business Account ID.</p>
                    </div>
                    <input
                        type="text"
                        value={config.wabaId}
                        onChange={(e) => handleFieldChange('wabaId', e.target.value)}
                        placeholder="Ex: 987654321..."
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-blue-600 dark:text-blue-400 text-sm uppercase tracking-wider">Catalog ID</h4>
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[9px] font-black rounded text-blue-500">MARKETPLACE</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Opcional. Usado para integração de catálogo de produtos.</p>
                    </div>
                    <input
                        type="text"
                        value={config.catalogId}
                        onChange={(e) => handleFieldChange('catalogId', e.target.value)}
                        placeholder="Ex: 123456789..."
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Seção Catálogo Meta (Feed CSV) */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Catálogo Meta (Facebook/Instagram)</h4>
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-[9px] font-black rounded text-purple-500">FEED CSV</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Use o link abaixo para cadastrar como <b>Feed de Dados (Data Feed)</b> no Meta Commerce Manager. O Meta usará este feed para atualizar seus produtos automaticamente.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-80">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                readOnly
                                value="https://moveismorante.com.br/api/facebook-catalog.csv"
                                className="bg-slate-150 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-[10px] outline-none w-full font-mono text-slate-500"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText("https://moveismorante.com.br/api/facebook-catalog.csv");
                                    toast.success("Link do catálogo copiado! 📋");
                                }}
                                className="absolute right-2 p-2 text-blue-500 hover:text-blue-600 transition-colors"
                                title="Copiar Link"
                            >
                                <i className="bi bi-copy"></i>
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                window.open('https://moveismorante.com.br/api/facebook-catalog.csv', '_blank');
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/10"
                        >
                            <i className="bi bi-download"></i>
                            Baixar Feed CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
