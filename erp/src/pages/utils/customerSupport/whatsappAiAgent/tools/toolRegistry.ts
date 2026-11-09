import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext, SafeToolHandler } from './types.js';
import {
  handleBuscarProdutos,
  handleObterDetalhesProduto,
  handleListarCategoriasECaracteristicasProduto,
} from './catalogTools.js';
import { handleObterInformacoesComerciaisLoja } from './commercialTools.js';
import { handleConsultarMeusPedidos } from './orderTools.js';
import { handleCalcularFreteOuDistancia } from './freightTools.js';
import { handleEncaminharParaAtendimentoHumano } from './handoffTool.js';

/**
 * Registro de ferramentas seguras do Agente de IA Comercial (Strategy Pattern).
 * Permite estender ou testar ferramentas isoladamente sem alterar código de terceiros (OCP).
 */
export const toolRegistry: Record<string, SafeToolHandler> = {
  buscarProdutos: handleBuscarProdutos,
  obterDetalhesProduto: handleObterDetalhesProduto,
  listarCategoriasECaracteristicasProduto: handleListarCategoriasECaracteristicasProduto,
  obterInformacoesComerciaisLoja: handleObterInformacoesComerciaisLoja,
  consultarMeusPedidos: handleConsultarMeusPedidos,
  calcularFreteOuDistancia: handleCalcularFreteOuDistancia,
  encaminharParaAtendimentoHumano: handleEncaminharParaAtendimentoHumano,
};

/**
 * Executa as ferramentas seguras com validação estrita no backend
 */
export async function executeSafeTool(
  supabase: SupabaseClient,
  toolName: string,
  args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const handler = toolRegistry[toolName];
  if (!handler) {
    return {
      success: false,
      erro: `Ferramenta "${toolName}" não é permitida ou não está disponível para o WhatsApp.`,
    };
  }

  return handler(supabase, args, context);
}
