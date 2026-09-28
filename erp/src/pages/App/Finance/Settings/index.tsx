import React, { useState, useEffect } from 'react';
import { financeService } from '@/pages/services/financeService';
import { toast } from 'react-toastify';
import {
  CreditCard,
  ShieldCheck,
  Settings as SettingsIcon,
  Zap,
  TrendingUp,
  History,
  Lock,
  Globe,
} from 'lucide-react';

const FinanceSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    pv: '',
    client_id: '',
    client_secret: '',
    environment: 'sandbox',
    active: false,
    anticipation_enabled: false,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, transData] = await Promise.all([
        financeService.getRedeConfig(),
        financeService.getRedeTransactions(5),
      ]);
      if (configData) setConfig(configData);
      if (transData) setTransactions(transData);
    } catch (error: any) {
      toast.error('Erro ao carregar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.updateRedeConfig(config);
      toast.success('Configurações da Rede salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-2xl text-orange-600">
          <SettingsIcon size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Configurações Financeiras
          </h1>
          <p className="text-slate-500 text-sm">Gerencie integrações de pagamento e automações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal: Configuração Rede */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <CreditCard size={20} className="text-orange-600" />
                </div>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                  Integração Rede (Itaú)
                </h2>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                {config.environment === 'sandbox' ? 'Ambiente de Testes' : 'Produção'}
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Número PV (Afiliação)
                  </label>
                  <input
                    type="text"
                    value={config.pv}
                    onChange={(e) => setConfig({ ...config, pv: e.target.value })}
                    placeholder="Ex: 12345678"
                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Ambiente
                  </label>
                  <select
                    value={config.environment}
                    onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  >
                    <option value="sandbox">Sandbox (Testes)</option>
                    <option value="production">Produção</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={config.client_id}
                    onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Client Secret
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={config.client_secret}
                      onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 pr-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                    <Lock size={16} className="absolute right-4 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="text-orange-600 mt-1 shrink-0" size={18} />
                <p className="text-xs text-orange-900 dark:text-orange-200 leading-relaxed">
                  As credenciais são armazenadas de forma segura e utilizadas apenas pelas Supabase
                  Edge Functions. O Checkout Transparente e o Pix estarão disponíveis assim que
                  ativado.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.active}
                      onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Ativar Integração
                  </span>
                </label>
                <button
                  type="submit"
                  className="px-8 h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>

          {/* Automação: Antecipação */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                  Motor de Antecipação Inteligente
                </h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.anticipation_enabled}
                  onChange={(e) => setConfig({ ...config, anticipation_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              O sistema analisa seu fluxo de caixa de 30 dias. Se houver previsão de saldo negativo,
              sugerimos a antecipação automática dos recebíveis de cartão de crédito para cobrir o
              rombo com o menor custo possível.
            </p>
            {config.anticipation_enabled && (
              <div className="p-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                  <TrendingUp size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Algoritmo Ativo
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-medium">Análise em tempo real</span>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Sidebar: Histórico Recente */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <History size={18} /> Transações Recentes
            </h3>
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((t, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 pb-3 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        TID: {t.tid?.substring(0, 10)}...
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          t.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        R$ {t.amount?.toLocaleString('pt-br', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Globe size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">
                    Nenhuma transação registrada via API ainda.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-600/20 rounded-full blur-2xl group-hover:scale-150 transition-all" />
            <h4 className="font-bold text-lg mb-2 relative z-10">Suporte Itaú Rede</h4>
            <p className="text-xs text-slate-400 mb-4 relative z-10">
              Precisa de ajuda com suas credenciais ou PV?
            </p>
            <a
              href="https://www.userede.com.br/atendimento"
              target="_blank"
              className="text-orange-400 text-xs font-bold hover:underline relative z-10"
            >
              Acesse a Central de Ajuda →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSettings;
