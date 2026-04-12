/** @jsxImportSource react */
import React, { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings, AppSettings, subscribeToSettings } from '@/pages/utils/settingsService';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;

// Modular Components
import SettingsSidebar from './components/SettingsSidebar';
import SettingsSection from './components/SettingsSection';
import StatusLabelsSection from './components/StatusLabelsSection';
import LogisticsSection from './components/LogisticsSection';
import HandlingSection from './components/HandlingSection';
import AutoScrollSection from './components/AutoScrollSection';
import AppearanceSection from './components/AppearanceSection';
import AIPromptsSection from './components/AIPromptsSection';
import OrderAutomationSection from './components/OrderAutomationSection';
import WhatsAppConfigSection from './components/WhatsAppConfigSection';
import InventoryNotificationsSection from './components/InventoryNotificationsSection';
import ChannelDescriptionsSection from './components/ChannelDescriptionsSection';
import WhatsAppTemplatesSection from './components/WhatsAppTemplatesSection';
import BusinessRulesSection from './components/BusinessRulesSection';
import ReceiptConfigSection from './components/ReceiptConfigSection';
import ValidationConfigSection from './components/ValidationConfigSection';
// import ImportMappingSection from './components/ImportMappingSection'; // Removido por não existir e não ser utilizado
import InventoryAutomationSection from './components/InventoryAutomationSection';
import ScannerConfigSection from './components/ScannerConfigSection';
import ProductMaterialsSection from './components/ProductMaterialsSection';
import CardFlagSettings from './components/CardFlagSettings';
import BlingConfigSection from './components/BlingConfigSection';
// import SaveButton from './components/SaveButton'; // Removido para auto-save

const categories: any[] = [
    { id: 'empresa', label: 'Dados da Empresa', icon: 'bi-building-fill', group: 'system', keywords: ['empresa', 'nome', 'endereço', 'loja', 'origem', 'cnpj', 'contato', 'telefone'] },
    { id: 'labels', label: 'Rótulos do Sistema', icon: 'bi-tags-fill', group: 'system', keywords: ['rascunho', 'agendado', 'atendido', 'cancelado', 'entrega', 'retirada'] },
    { id: 'logistica', label: 'Logística e Frete', icon: 'bi-truck', group: 'system', keywords: ['frete', 'km', 'distância', 'valor', 'entrega'] },

    { id: 'scroll', label: 'Scroll Automático', icon: 'bi-mouse3-fill', group: 'user', keywords: ['scroll', 'rolagem', 'automática', 'velocidade', 'sensibilidade'] },
    { id: 'aparencia', label: 'Aparência', icon: 'bi-palette', group: 'user', keywords: ['tema', 'escuro', 'claro', 'modo'] },
    { id: 'ia', label: 'Inteligência Artificial', icon: 'bi-robot', group: 'system', keywords: ['ia', 'ai', 'robot', 'prompt', 'descrição', 'chat', 'assistente'] },
    { id: 'automacao', label: 'Automação de Pedidos', icon: 'bi-magic', group: 'system', keywords: ['automação', 'imprimir', 'recibo', 'whatsapp', 'entrega', 'cliente'] },
    { id: 'whatsapp', label: 'WhatsApp & Catálogo', icon: 'bi-whatsapp', group: 'system', keywords: ['whatsapp', 'api', 'token', 'catálogo', 'marketplace', 'vendas'] },
    { id: 'notificacoes', label: 'Notificações', icon: 'bi-bell-fill', group: 'system', keywords: ['notificação', 'alerta', 'estoque', 'novo', 'usado', 'salvado'] },
    { id: 'canais', label: 'Descrições por Canal', icon: 'bi-megaphone-fill', group: 'system', keywords: ['whatsapp', 'ecommerce', 'canal', 'marketplace', 'base', 'descrição', 'loja'] },
    { id: 'templates', label: 'Mensagens & Templates', icon: 'bi-chat-quote-fill', group: 'system', keywords: ['mensagem', 'template', 'whatsapp', 'texto', 'avaliação', 'confirmação'] },
    { id: 'regras', label: 'Regras de Negócio', icon: 'bi-gear-wide-connected', group: 'system', keywords: ['regra', 'estoque', 'negativo', 'reserva', 'venda'] },
    { id: 'obrigatorios', label: 'Campos Obrigatórios', icon: 'bi-shield-check', group: 'system', keywords: ['obrigatório', 'bloqueio', 'venda', 'cadastro', 'cpf', 'cnpj', 'telefone', 'rg', 'endereço', 'estoque', 'email', 'cargo'] },
    { id: 'recibo', label: 'Configuração de Recibo', icon: 'bi-printer-fill', group: 'system', keywords: ['recibo', 'impressão', 'rodapé', 'vendedor', 'garantia'] },
    { id: 'estoqueAutomacao', label: 'Automação de Estoque', icon: 'bi-box-arrow-right', group: 'system', keywords: ['estoque', 'movimentação', 'venda', 'compra', 'automação'] },
    { id: 'materiais', label: 'Materiais de Móveis', icon: 'bi-hammer', group: 'system', keywords: ['material', 'mdp', 'mdf', 'madeira', 'vidro', 'metal', 'móvel'] },
    { id: 'manuseio', label: 'Manuseio de Pedidos', icon: 'bi-hand-index-thumb', group: 'system', keywords: ['manuseio', 'montagem', 'entrega', 'retirada', 'padrão'] },
    { id: 'bandeiras', label: 'Bandeiras e Juros de Cartão', icon: 'bi-credit-card-2-front', group: 'system', keywords: ['cartão', 'bandeira', 'juros', 'parcela', 'visa', 'mastercard', 'senff'] },
    { id: 'scanner', label: 'Leitor de Barras / Scanner', icon: 'bi-qr-code-scan', group: 'system', keywords: ['scanner', 'bip', 'pibe', 'barras', 'código', 'delay', 'atraso', 'vibração'] },
    { id: 'bling', label: 'Integração Bling (API v3)', icon: 'bi-clouds-fill', group: 'system', keywords: ['bling', 'api', 'v3', 'integração', 'estoque', 'sincronização', 'token', 'key'] },
];

/**
 * Settings Page
 * Returns 'any' to fix React 19 / TS 4.9 incompatibility during Vercel build.
 */
export default function Settings(): any {
    const { theme, setTheme } = useTheme();
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [search, setSearch] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = React.useRef<any>(null);

    // Real-time synchronization with Firebase
    useEffect(() => {
        const unsubscribe = subscribeToSettings((newSettings) => {
            setSettings(newSettings);

            // Sync theme if it's different from current
            if (newSettings.defaultTheme && newSettings.defaultTheme !== (theme as any)) {
                setTheme(newSettings.defaultTheme);
            }
        });
        return () => unsubscribe();
    }, [setTheme, theme]);

    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(hash);
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        }
    }, []);

    const handleChange = useCallback((path: string, value: any) => {
        if (path === 'defaultTheme') {
            setTheme(value);
        }

        setSettings((prev: AppSettings) => {
            const next = { ...prev };
            const parts = path.split('.');
            let current: any = next;

            for (let i = 0; i < parts.length - 1; i++) {
                current[parts[i]] = { ...current[parts[i]] };
                current = current[parts[i]];
            }

            current[parts[parts.length - 1]] = value;

            // Auto-save logic
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            setIsSaving(true);
            saveTimeoutRef.current = setTimeout(async () => {
                await saveSettings(next);
                setIsSaving(false);
                toast.success("Configurações salvas com sucesso! ✨", { autoClose: 5000 });
            }, 1000);

            return next;
        });
    }, [setTheme]);

    // const handleSave = () => {
    //     saveSettings(settings);
    //     toast.success("Configurações aplicadas com sucesso! ✨");
    // };

    const isVisible = (id: string) => {
        if (!search) return true;
        const normalizedSearch = search.toLowerCase();
        const category = categories.find(c => c.id === id);
        if (!category) return false;

        return category.label.toLowerCase().includes(normalizedSearch) ||
            category.keywords.some((k: string) => k.toLowerCase().includes(normalizedSearch));
    };

    return (
        <div className="flex flex-col gap-10 max-w-5xl mx-auto py-12 px-6 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-slide-down">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                        Configurações do Sistema
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Preferências</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-slate-500 dark:text-slate-500 text-base font-medium">Personalize cada detalhe da sua experiência no ERP Móveis Morante.</p>
                        
                        {isSaving && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="w-3 h-3 border-2 border-amber-600 dark:border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Salvando...</span>
                            </div>
                        )}
                        
                        {!isSaving && settings && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full animate-in fade-in zoom-in-95 duration-500">
                                <i className="bi bi-cloud-check-fill text-xs" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative group w-full md:w-96">
                    <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 transition-colors group-focus-within:text-blue-500" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou funcionalidade..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/10 focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-xl shadow-slate-200/20 dark:shadow-none font-bold"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <SettingsSidebar categories={categories as any} isAdmin={true} />

                <div className="lg:col-span-9 pb-48">
                    <SettingsSection id="empresa" title="Dados da Empresa" icon="bi-building-fill" isVisible={isVisible('empresa')}>
                        <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 max-w-lg">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Nome da Empresa <span className="text-red-500">*</span></h4>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Nome que será exibido em documentos e comunicações.</p>
                                </div>
                                <input
                                    type="text"
                                    value={settings.companyName || ''}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-80 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 max-w-lg">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CNPJ</h4>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Cadastro Nacional da Pessoa Jurídica da empresa.</p>
                                </div>
                                <div className="w-full md:w-80">
                                    <PatternFormat
                                        format="##.###.###/####-##"
                                        mask="_"
                                        value={settings.companyCnpj || ''}
                                        onValueChange={(values: any) => handleChange('companyCnpj', values.value || "")}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 max-w-lg">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Telefone</h4>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Telefone oficial de atendimento da empresa.</p>
                                </div>
                                <div className="w-full md:w-80 flex gap-2">
                                    <PatternFormat
                                        format="(##) #####-####"
                                        mask="_"
                                        value={settings.companyPhone || ''}
                                        onValueChange={(values: any) => handleChange('companyPhone', values.value || "")}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-medium"
                                    />
                                    <button type="button"
                                        onClick={() => {
                                            if (!settings.companyPhone) return;
                                            const cleanPhone = settings.companyPhone.replace(/\D/g, '');
                                            const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                                            window.open(`https://wa.me/${finalPhone}`, '_blank');
                                        }}
                                        title="Verificar WhatsApp"
                                        className="shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95"
                                    >
                                        <i className="bi bi-whatsapp text-lg"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection id="labels" title="Rótulos do Sistema" icon="bi-tags-fill" isVisible={isVisible('labels')}>
                        <StatusLabelsSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="logistica" title="Logística e Frete" icon="bi-truck" isVisible={isVisible('logistica')}>
                        <LogisticsSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="manuseio" title="Manuseio e Montagem" icon="bi-hand-index-thumb" isVisible={isVisible('manuseio')}>
                        <HandlingSection settings={settings} onChange={handleChange} />
                    </SettingsSection>



                    <SettingsSection id="scroll" title="Rolagem Automática" icon="bi-mouse3-fill" isVisible={isVisible('scroll')}>
                        <AutoScrollSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="aparencia" title="Aparência" icon="bi-palette" isVisible={isVisible('aparencia')}>
                        <AppearanceSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="ia" title="Assistente de IA" icon="bi-robot" isVisible={isVisible('ia')}>
                        <AIPromptsSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="automacao" title="Automação de Pedidos" icon="bi-magic" isVisible={isVisible('automacao')}>
                        <OrderAutomationSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="whatsapp" title="Integração WhatsApp" icon="bi-whatsapp" isVisible={isVisible('whatsapp')}>
                        <WhatsAppConfigSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="notificacoes" title="Notificações de Inventário" icon="bi-bell-fill" isVisible={isVisible('notificacoes')}>
                        <InventoryNotificationsSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="canais" title="Descrições Base por Canal" icon="bi-megaphone-fill" isVisible={isVisible('canais')}>
                        <ChannelDescriptionsSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="templates" title="Mensagens e Templates WhatsApp" icon="bi-chat-quote-fill" isVisible={isVisible('templates')}>
                        <WhatsAppTemplatesSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="regras" title="Regras de Negócio e Estoque" icon="bi-gear-wide-connected" isVisible={isVisible('regras')}>
                        <BusinessRulesSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="obrigatorios" title="Campos Obrigatórios" icon="bi-shield-check" isVisible={isVisible('obrigatorios')}>
                        <ValidationConfigSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="recibo" title="Configuração de Recibo e Impressão" icon="bi-printer-fill" isVisible={isVisible('recibo')}>
                        <ReceiptConfigSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="estoqueAutomacao" title="Automação de Movimentações de Estoque" icon="bi-box-arrow-right" isVisible={isVisible('estoqueAutomacao')}>
                        <InventoryAutomationSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="materiais" title="Materiais de Móveis" icon="bi-hammer" isVisible={isVisible('materiais')}>
                        <ProductMaterialsSection />
                    </SettingsSection>

                    <SettingsSection id="bandeiras" title="Bandeiras e Juros de Cartão" icon="bi-credit-card-2-front" isVisible={isVisible('bandeiras')}>
                        <CardFlagSettings settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="scanner" title="Leitor de Código de Barras" icon="bi-qr-code-scan" isVisible={isVisible('scanner')}>
                        <ScannerConfigSection settings={settings} onChange={handleChange} />
                    </SettingsSection>

                    <SettingsSection id="bling" title="Integração Bling (API v3)" icon="bi-clouds-fill" isVisible={isVisible('bling')}>
                        <BlingConfigSection settings={settings} onChange={handleChange} />
                    </SettingsSection>


                    

                </div>
            </div>

            {/* <SaveButton onClick={handleSave} /> Removido para auto-save */}
        </div>
    );
}
