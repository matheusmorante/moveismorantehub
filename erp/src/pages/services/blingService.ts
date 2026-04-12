import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, saveSettings } from '@/pages/utils/settingsService';

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

export const blingService = {
  /**
   * Inicia o fluxo de autorização OAuth
   */
  getAuthorizeUrl: () => {
    const settings = getSettings();
    const clientId = settings.blingConfig?.clientId || 'abc06068586195ac65f1df01e26de945712caca7';
    
    // URL de redirecionamento configurada no Bling
    const redirectUri = `${window.location.origin}/stock/bling`;
    const state = '6099f541b5a859c57350390be4b6130a'; // Valor atualizado conforme solicitação
    
    return `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  /**
   * Troca o código de autorização pelo access_token via Vercel Function
   */
  exchangeCode: async (code: string) => {
    try {
      const settings = getSettings();
      const response = await fetch('/api/bling-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'exchange_code',
            code,
            clientId: settings.blingConfig?.clientId || 'abc06068586195ac65f1df01e26de945712caca7',
            clientSecret: settings.blingConfig?.clientSecret || '3b9500fc5343b4308765eed271c01eb8fbd771152c97928d3d2015270759',
            redirectUri: `${window.location.origin}/stock/bling`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na autenticação');

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
    const response = await fetch('/api/bling-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        endpoint: '/produtos',
        params 
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao buscar produtos');
    return data;
  }
};
