/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { useSettingsForm } from './hooks/useSettingsForm';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

import SettingsSidebar from './components/SettingsSidebar';
import SettingsSection from './components/SettingsSection';
import StatusLabelsSection from './components/StatusLabelsSection';
import LogisticsSection from './components/LogisticsSection';
import HandlingSection from './components/HandlingSection';
import AppearanceSection from './components/AppearanceSection';
import WhatsAppConfigSection from './components/WhatsAppConfigSection';
import OrderNotificationTestSection from './components/OrderNotificationTestSection';
import WhatsAppTemplatesSection from './components/WhatsAppTemplatesSection';
import CardFlagSettings from './components/CardFlagSettings';
import FiscalSettingsSection from './components/FiscalSettingsSection';
import ScannerConfigSection from './components/ScannerConfigSection';
import CompanySettingsSection from './components/CompanySettingsSection';
import PrintConfigSection from './components/PrintConfigSection';

import { settingsCategories } from './components/settingsCategories';

export default function Settings(): any {
  const { setTheme } = useTheme();
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState('');
  const { settings, handleChange, isSaving, isLoading, validationError, blocked, reload, flush, uncertain, hasPendingEdits } = useSettingsForm(user?.id || null, setTheme);
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const timer = hash ? setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500) : null;
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const isVisible = (id: string) => {
    const category = settingsCategories.find((c) => c.id === id);
    if (!category) return false;

    // Se a categoria for exclusiva do sistema/admin e o usuário não for admin, oculta
    if (category.group !== 'user' && !isAdmin) {
      return false;
    }

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      category.label.toLowerCase().includes(term) ||
      category.keywords.some((k: string) => k.toLowerCase().includes(term))
    );
  };

  const isAdminGroup = (id: string) => {
    const cat = settingsCategories.find((c) => c.id === id);
    return !!cat && cat.group !== 'user';
  };

  return (
    <div className="flex gap-8 relative min-h-screen">
      <SettingsSidebar categories={settingsCategories} isAdmin={isAdmin} />

      <div className="flex-1 min-w-0 max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Configurações
              </h1>
              {isSaving && (
                <span role="status" className="flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full animate-pulse">
                  <i className="bi bi-cloud-arrow-up-fill" /> Salvando...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
              Gerencie as preferências e parâmetros globais do sistema.
            </p>
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
        {validationError && <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{validationError}</div>}

        {isLoading && <p role="status"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />Confirmando configurações na nuvem...</p>}
        {validationError && !uncertain && (blocked || hasPendingEdits) && <button type="button" disabled={isSaving} onClick={() => { if (blocked) reload(); else void flush(); }}>{blocked ? 'Tentar carregar novamente' : 'Tentar salvar novamente'}</button>}
        <fieldset disabled={blocked} className="min-w-0 w-full space-y-8 pb-48">
          <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 px-3 mb-3">
              Minha Conta
            </h3>

            <SettingsSection
              id="aparencia"
              title="Aparência"
              icon="bi-palette"
              isVisible={isVisible('aparencia')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('aparencia')}
            >
              <AppearanceSection settings={settings} onChange={handleChange} />
            </SettingsSection>
          </div>

          <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-1">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Operação
              </h3>
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                ADMIN
              </span>
            </div>
            <SettingsSection
              id="scanner"
              title="Estoque · Leitor de código de barras"
              icon="bi-qr-code-scan"
              isVisible={isVisible('scanner')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('scanner')}
            >
              <ScannerConfigSection settings={settings} onChange={handleChange} />
            </SettingsSection>
            <SettingsSection
              id="fiscal"
              title="Fiscal · Tributação padrão (NF-e/NFC-e)"
              icon="bi-file-earmark-spreadsheet-fill"
              isVisible={isVisible('fiscal')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('fiscal')}
            >
              <FiscalSettingsSection settings={settings} onChange={handleChange} />
            </SettingsSection>
            <SettingsSection
              id="bandeiras"
              title="Vendas · Bandeiras e juros de cartão"
              icon="bi-credit-card-2-front"
              isVisible={isVisible('bandeiras')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('bandeiras')}
            >
              <CardFlagSettings settings={settings} onChange={handleChange} />
            </SettingsSection>
            <SettingsSection
              id="logistica"
              title="Logística · Frete e mapas"
              icon="bi-truck"
              isVisible={isVisible('logistica')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('logistica')}
            >
              <LogisticsSection settings={settings} onChange={handleChange} />
            </SettingsSection>
            <SettingsSection
              id="manuseio"
              title="Logística · Manuseio e montagem"
              icon="bi-hand-index-thumb"
              isVisible={isVisible('manuseio')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('manuseio')}
            >
              <HandlingSection settings={settings} onChange={handleChange} />
            </SettingsSection>
          </div>

          <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-1">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Sistema
              </h3>
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                ADMIN
              </span>
            </div>

            <SettingsSection
              id="empresa"
              title="Dados da Empresa"
              icon="bi-building-fill"
              isVisible={isVisible('empresa')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('empresa')}
            >
              <CompanySettingsSection settings={settings} onChange={handleChange} />
            </SettingsSection>

            <SettingsSection
              id="labels"
              title="Rótulos do Sistema"
              icon="bi-tags-fill"
              isVisible={isVisible('labels')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('labels')}
            >
              <StatusLabelsSection settings={settings} onChange={handleChange} />
            </SettingsSection>

            <SettingsSection
              id="whatsapp"
              title="WhatsApp & Catálogo"
              icon="bi-whatsapp"
              isVisible={isVisible('whatsapp')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('whatsapp')}
            >
              <WhatsAppConfigSection settings={settings} onChange={handleChange} />
            </SettingsSection>

            <SettingsSection
              id="notificacoes"
              title="Notificações & Testes Push"
              icon="bi-bell-fill"
              isVisible={isVisible('notificacoes')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('notificacoes')}
            >
              <OrderNotificationTestSection />
            </SettingsSection>

            <SettingsSection
              id="templates"
              title="Mensagens & Templates"
              icon="bi-chat-quote-fill"
              isVisible={isVisible('templates')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('templates')}
            >
              <WhatsAppTemplatesSection settings={settings} onChange={handleChange} />
            </SettingsSection>


            <SettingsSection
              id="impressao"
              title="Impressão pelo navegador"
              icon="bi-printer-fill"
              isVisible={isVisible('impressao')}
              isSearching={!!search.trim()}
              isAdminOnly={isAdminGroup('impressao')}
            >
              <PrintConfigSection />
            </SettingsSection>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
