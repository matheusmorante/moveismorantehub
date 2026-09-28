import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, saveSettings } from '@/pages/utils/settingsService';

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

export const blingService = {
  /**
   * Inicia o fluxo de autorização OAuth
   */
  getAuthorizeUrl: () => {
    const settings = getSettings();
    const clientId = settings.blingConfig?.clientId || '';
    
    // URL de redirecionamento configurada no Bling
    const redirectUri = `${window.location.origin}/estoque/bling`;
    const state = settings.blingConfig?.state || 'bling_oauth_state';
    
    return `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  /**
   * Troca o código de autorização pelo access_token via Vercel Function
   */
  exchangeCode: async (code: string) => {
    try {
      const settings = getSettings();
      const { data, error } = await supabase.functions.invoke('bling-oauth', {
        body: { 
            action: 'exchange_code',
            code,
            clientId: settings.blingConfig?.clientId || '',
            clientSecret: settings.blingConfig?.clientSecret || '',
            redirectUri: `${window.location.origin}/estoque/bling`
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao trocar código Bling:', err);
      throw err;
    }
  },

  /**
   * Busca produtos do Bling
   */
  fetchProducts: async (params: { pagina?: number; limite?: number; pesquisa?: string; criterio?: number } = {}) => {
    const { data, error } = await supabase.functions.invoke('bling-proxy', {
      body: { 
        endpoint: '/produtos',
        params 
      }
    });

    if (error) throw error;
    return data;
  }
};
