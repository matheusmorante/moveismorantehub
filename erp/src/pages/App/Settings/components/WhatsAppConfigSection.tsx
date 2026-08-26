/** @jsxImportSource react */
import React, { useState } from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '../../../utils/whatsappGraphService';
import { toast } from 'react-toastify';

interface WhatsAppConfigSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const VARIABLE_OPTIONS = [
    { value: 0, label: '0 variáveis — Apenas texto fixo sem {{1}}' },
    { value: 1, label: '1 variável — {{1}} Nome do Cliente' },
    { value: 2, label: '2 variáveis — {{1}} Nome, {{2}} Data/Prazo' },
    { value: 3, label: '3 variáveis — {{1}} Nome, {{2}} Produtos, {{3}} Valor Total' },
    { value: 4, label: '4 variáveis — {{1}} Nome, {{2}} Data, {{3}} Produtos, {{4}} Total' },
    { value: 5, label: '5 variáveis — {{1}} Nome, {{2}} Data, {{3}} Endereço, {{4}} Produtos, {{5}} Total' },
    { value: 6, label: '6 variáveis — {{1}} Nome, {{2}} Data, {{3}} Endereço, {{4}} Produtos, {{5}} Total, {{6}} Pagamento' },
    { value: 7, label: '7 variáveis — Completo (Nome, Data, Hora, Endereço, Produtos, Total, Pagamento)' }
];

export default function WhatsAppConfigSection({ settings, onChange }: WhatsAppConfigSectionProps) {
    const [isTesting, setIsTesting] = useState(false);
    const [isTestingTemplate, setIsTestingTemplate] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [fetchedTemplates, setFetchedTemplates] = useState<any[]>([]);
    const [testPhone, setTestPhone] = useState('');

    const config = settings.whatsappConfig || {
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        catalogId: '',
        sendMode: 'wame',
        templateNameOrderConfirmation: '',
        templateLanguage: 'pt_BR',
        templateVariableCount: 7
    };

    const handleFieldChange = (field: string, value: any) => {
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

    const handleFetchTemplates = async () => {
        if (!config.wabaId) {
            toast.warning("Preencha o WABA ID (ID da Conta do WhatsApp Business) para listar automaticamente.");
            return;
        }
        if (!config.accessToken) {
            toast.warning("Preencha o Token de Acesso antes de consultar os modelos.");
            return;
        }

        setIsLoadingTemplates(true);
        try {
            const list = await whatsappGraphService.fetchMessageTemplates();
            setFetchedTemplates(list);
            if (list.length === 0) {
                toast.info("Nenhum modelo encontrado no WABA informado.");
            } else {
                toast.success(`${list.length} modelo(s) encontrado(s) na sua conta Meta! 🎉`);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(`Aviso: ${err.message}. Você pode configurar o nome e variáveis do modelo manualmente abaixo!`);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const handleTestTemplateSend = async () => {
        const cleanPhone = testPhone.trim();
        if (!cleanPhone) {
            toast.warning("Digite um número de telefone com DDD para o teste.");
            return;
        }
        if (!config.templateNameOrderConfirmation) {
            toast.warning("Preencha o Nome do Modelo (Template Name) antes de testar.");
            return;
        }

        setIsTestingTemplate(true);
        try {
            const varCount = typeof config.templateVariableCount === 'number' ? config.templateVariableCount : 7;
            const mockParams = [
                "Cliente Teste", 
                "26/08/2026", 
                "Manhã", 
                "Rua Cascavel, 306, Guaraituba - Colombo/PR", 
                "1x Guarda Roupa Casal 6 Portas", 
                "949,00", 
                "Pix"
            ];
            const finalParams = varCount === 0 ? [] : mockParams.slice(0, varCount);

            await whatsappGraphService.sendTemplateMessage(
                cleanPhone,
                config.templateNameOrderConfirmation,
                finalParams,
                config.templateLanguage || 'pt_BR'
            );
            toast.success("✅ Mensagem de teste enviada com sucesso! Verifique seu WhatsApp.");
        } catch (err: any) {
            console.error(err);
            toast.error(`❌ ${err.message}`);
        } finally {
            setIsTestingTemplate(false);
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
                            Para o envio direto de mensagens funcionar, utilize um <b>Token Permanente de Usuário do Sistema</b> gerado no Meta Business Manager com permissões <code>whatsapp_business_messaging</code>.
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

            {/* Modo de Envio de Mensagens de Pedidos (ERP) */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Modo de Envio de Mensagens</h4>
                            <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-[9px] font-black rounded text-green-600 dark:text-green-400">WHATSAPP</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Escolha se as notificações de pedidos e entregas serão enviadas diretamente em segundo plano via Meta Graph API ou se abrirão o WhatsApp Web (wa.me) no navegador.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-80">
                        <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${config.sendMode !== 'wame' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                            <input
                                type="radio"
                                name="whatsappSendMode"
                                value="graph_api"
                                checked={config.sendMode !== 'wame'}
                                onChange={() => handleFieldChange('sendMode', 'graph_api')}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                                    <i className="bi bi-cloud-check-fill text-blue-500" />
                                    Meta Graph API (Direto)
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 font-medium">
                                    Envia a mensagem diretamente ao celular do cliente via servidor da Meta.
                                </span>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${config.sendMode === 'wame' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                            <input
                                type="radio"
                                name="whatsappSendMode"
                                value="wame"
                                checked={config.sendMode === 'wame'}
                                onChange={() => handleFieldChange('sendMode', 'wame')}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                                    <i className="bi bi-whatsapp text-green-500" />
                                    WhatsApp Web / App (wa.me)
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 font-medium">
                                    Abre uma nova aba no WhatsApp Web com o texto pré-preenchido para envio manual.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Token de Acesso */}
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

            {/* Phone Number ID */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Phone Number ID</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Identificador numérico do número de telefone registrado na API.</p>
                    </div>
                    <input
                        type="text"
                        value={config.phoneNumberId}
                        onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                        placeholder="Ex: 1020981007772705"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-medium"
                    />
                </div>
            </div>

            {/* WABA ID */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">WABA ID (Opcional)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">WhatsApp Business Account ID (usado para listagem automática de modelos).</p>
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

            {/* Seção Modelo de Mensagem (Meta Template) para Notificação de Pedidos */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1 max-w-lg">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm uppercase tracking-wider">Modelo: Mensagem do Pedido ao Cliente</h4>
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-[9px] font-black rounded text-emerald-500">FECHAMENTO DE VENDA</span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                                Nome do modelo aprovado no <b>Meta Business Suite</b> para envio do resumo do pedido (produtos, valores e prazos) ao cliente quando o pedido é gerado.
                            </p>

                            {config.wabaId && (
                                <button
                                    type="button"
                                    disabled={isLoadingTemplates}
                                    onClick={handleFetchTemplates}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                                >
                                    <i className={`bi ${isLoadingTemplates ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} />
                                    {isLoadingTemplates ? 'Consultando Meta...' : 'Consultar Modelos na Conta Meta (WABA)'}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-3 w-full md:w-80">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Nome do Modelo no Meta (Template Name)</label>
                                <input
                                    type="text"
                                    value={config.templateNameOrderConfirmation || ''}
                                    onChange={(e) => handleFieldChange('templateNameOrderConfirmation', e.target.value)}
                                    placeholder="Ex: confirmacao_pedido ou pedido_cliente"
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-mono font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Quantidade de Variáveis do Modelo (Variáveis 1 a 7)</label>
                                <select
                                    value={config.templateVariableCount ?? 7}
                                    onChange={(e) => handleFieldChange('templateVariableCount', Number(e.target.value))}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-medium"
                                >
                                    {VARIABLE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Código do Idioma</label>
                                <input
                                    type="text"
                                    value={config.templateLanguage || 'pt_BR'}
                                    onChange={(e) => handleFieldChange('templateLanguage', e.target.value)}
                                    placeholder="pt_BR"
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-mono font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lista de Modelos Encontrados na Meta */}
                    {fetchedTemplates.length > 0 && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <i className="bi bi-list-check text-blue-500" />
                                Modelos cadastrados na sua conta Meta (clique para selecionar):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                {fetchedTemplates.map((tpl, i) => {
                                    const bodyComp = tpl.components?.find((c: any) => c.type === 'BODY');
                                    const matches = bodyComp?.text?.match(/\{\{\d+\}\}/g);
                                    const varCount = matches ? new Set(matches).size : 0;
                                    const isSelected = config.templateNameOrderConfirmation === tpl.name;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                handleFieldChange('templateNameOrderConfirmation', tpl.name);
                                                handleFieldChange('templateLanguage', tpl.language || 'pt_BR');
                                                handleFieldChange('templateVariableCount', varCount);
                                                toast.info(`Modelo "${tpl.name}" selecionado (${varCount} variáveis)!`);
                                            }}
                                            className={`text-left p-3 rounded-xl border transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20' 
                                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono truncate">{tpl.name}</span>
                                                <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase ${
                                                    tpl.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {tpl.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                                <span>Idioma: <b>{tpl.language}</b></span>
                                                <span>•</span>
                                                <span>Variáveis: <b>{varCount}</b></span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Teste de Envio do Modelo */}
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                                <i className="bi bi-send-check text-base" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Testar Modelo de Mensagem</p>
                                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Envie um teste para o seu número para confirmar que o template está aprovado e ativo no Meta.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="DDD + Número (ex: 41999999999)"
                                className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs outline-none w-full sm:w-56 dark:text-slate-200 font-medium"
                            />
                            <button
                                type="button"
                                disabled={isTestingTemplate}
                                onClick={handleTestTemplateSend}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {isTestingTemplate ? 'Enviando...' : 'Testar Envio'}
                            </button>
                        </div>
                    </div>
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

            {/* Seção Descrição Base — Catálogo Meta */}
            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                            Descrição Base — Catálogo Meta
                        </h4>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-[8px] font-black rounded text-emerald-600 dark:text-emerald-400">
                            INFORMAÇÕES FIXAS DA LOJA
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        Texto com informações fixas da sua empresa (endereço, horários de atendimento, contatos) que será incluído automaticamente antes da descrição de cada produto no Catálogo Meta.
                    </p>

                    <textarea
                        rows={4}
                        value={settings.channelBaseDescriptions?.whatsapp || ''}
                        onChange={(e) => onChange('channelBaseDescriptions.whatsapp', e.target.value)}
                        placeholder={`🏠 *Móveis Morante*\n📍 R. Cascavel, 306 - Colombo - PR\n⌚ Seg-Sex: 8h às 18h | Sáb: 8h às 13h\n📞 (41) 99749-3547\n\n――――――――――――`}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 text-xs font-mono leading-relaxed"
                    />
                </div>
            </div>
        </div>
    );
}
