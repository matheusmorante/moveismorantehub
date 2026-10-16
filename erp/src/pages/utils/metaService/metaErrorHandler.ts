import { getSettings } from '@/pages/utils/settingsService';
import { isSamePhoneNumber } from '@/pages/utils/textUtils';
import type { MetaErrorPayload } from './types';

/**
 * Tradutor e tratador de erros para respostas da Meta Graph API / WhatsApp Cloud API.
 * Identifica cenários específicos (auto-envio, token inválido, janela de 24h, erros de template).
 */
export const metaErrorHandler = {
  /**
   * Verifica se o telefone de destino coincide com o número da própria conta da empresa
   */
  isSelfPhoneNumber: (recipientPhone?: string | null): boolean => {
    if (!recipientPhone) return false;
    const settings = getSettings();
    const companyPhone = settings.companyPhone || '(41) 99749-3547';
    return isSamePhoneNumber(recipientPhone, companyPhone);
  },

  /**
   * Extrai e formata a mensagem de erro retornada pela Meta em uma string clara em português
   */
  parseMetaErrorMessage: (
    error: MetaErrorPayload,
    options?: { templateName?: string; recipientPhone?: string }
  ): string => {
    const code = error.code;
    const details = error.error_data?.details || '';
    const userTitle = error.error_user_title ? ` (${error.error_user_title})` : '';
    const userMsg = error.error_user_msg ? ` - ${error.error_user_msg}` : '';
    const baseMsg = error.message || 'Erro na API da Meta';

    // 1. Auto-envio para o próprio número (Erro 100 com destinatário igual ao remetente)
    if (code === 100 && metaErrorHandler.isSelfPhoneNumber(options?.recipientPhone)) {
      return `O número de destino (${options?.recipientPhone}) é o mesmo número do WhatsApp Business da empresa. A Meta não permite que uma conta envie mensagens para o seu próprio número.`;
    }

    // 2. Número remetente pendente de verificação na Meta (NOT_VERIFIED / #133010)
    if (
      code === 133010 ||
      baseMsg.includes('NOT_VERIFIED') ||
      baseMsg.includes('Não Verificado') ||
      baseMsg.includes('Account not registered') ||
      details.includes('NOT_VERIFIED')
    ) {
      return 'Meta API: O número remetente da empresa está com verificação pendente (NOT_VERIFIED) no Meta Business Suite. As mensagens não são entregues aos destinatários até concluir a validação por SMS ou Ligação no painel da Meta.';
    }

    // 3. Erro de parâmetros do template ou contagem de variáveis (#100)
    if (code === 100) {
      if (details.includes('param') || baseMsg.includes('parameter') || details === 'Invalid parameter') {
        const tplNote = options?.templateName ? ` no modelo "${options.templateName}"` : '';
        return `Meta API (Erro 100 - Parâmetro Inválido): A Meta rejeitou os parâmetros${tplNote}. Verifique se o formato do número de telefone está correto ou se a quantidade de variáveis no modelo cadastrado na Meta confere.`;
      }
    }

    // 3. Janela de conversação de 24h expirada (#131047)
    if (code === 131047 || baseMsg.includes('131047') || baseMsg.includes('24 hours') || baseMsg.includes('Re-engagement')) {
      return 'Meta API (Regra 24h): A conversa está fora da janela de 24 horas. Cadastre um Modelo de Mensagem (Template) no Meta Business Suite e configure seu nome em Configurações > WhatsApp API.';
    }

    // 4. Modelo não encontrado ou reprovado (#132000)
    if (code === 132000 || baseMsg.includes('132000') || baseMsg.includes('does not exist')) {
      const tplName = options?.templateName ? `"${options.templateName}"` : 'configurado';
      return `Meta API (Erro 132000): O modelo de mensagem ${tplName} não existe ou não foi aprovado na sua conta Meta WABA.`;
    }

    // 5. Quebra de regras de formatação de parâmetros (#132018)
    if (code === 132018 || baseMsg.includes('132018') || baseMsg.includes('parameters in your template')) {
      return 'Meta API (Erro 132018): Os parâmetros do modelo continham caracteres inválidos (quebras de linha, tabulações ou múltiplos espaços).';
    }

    // 6. Token expirado ou sem permissões (#190 / 401)
    if (code === 190 || baseMsg.includes('Application has been deleted') || baseMsg.includes('invalid') || baseMsg.includes('Session has expired')) {
      return "Token do Meta expirado ou inválido. Atualize o 'Token de Acesso' nas Configurações > WhatsApp API.";
    }

    // 7. Acesso bloqueado / permissão ausente (#200)
    if (code === 200 || baseMsg.includes('blocked') || baseMsg.includes('Permissions error')) {
      return "Acesso à API Bloqueado: Verifique se o Token permanente tem as permissões 'whatsapp_business_messaging' e 'catalog_management' no Gerenciador de Negócios da Meta.";
    }

    const fullMsg = details ? `${baseMsg}: ${details}` : `${baseMsg}${userTitle}${userMsg}`;
    return `Meta API (Código ${code}): ${fullMsg}`;
  },
};
