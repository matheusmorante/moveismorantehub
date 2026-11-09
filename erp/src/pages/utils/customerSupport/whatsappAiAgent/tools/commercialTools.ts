import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';

export async function handleObterInformacoesComerciaisLoja(
  _supabase: SupabaseClient,
  _args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const s = context.settings || {};
  return {
    success: true,
    loja: {
      nome: s.companyName || 'Móveis Morante',
      cnpj: s.companyCnpj || '44.512.248/0001-07',
      endereco: s.companyAddress || 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
      telefoneWhatsapp: s.companyPhone || '(41) 99749-3547',
      horarioAtendimento: 'Segunda a Sexta das 09h às 18h | Sábados das 09h às 17h (Domingos e feriados fechado)',
      condicoesFrete:
        'Frete grátis para entregas a menos de 5 km da loja física em Colombo/PR (Rua Cascavel, 306). Para distâncias maiores, solicitar endereço completo para cálculo do frete.',
      montagem: 'Montagem própria por nossa conta tanto para retirada na loja quanto para entrega.',
      formasPagamento: [
        'À vista com desconto especial via Pix ou dinheiro',
        'Cartão de crédito em até 10x sem juros (Visa, Mastercard, Elo, Hiper/Hipercard)',
        'Cartão Senff (com juros da administradora)',
        'Crediário e boleto bancário: ainda não trabalhamos',
      ],
      catalogoOnline: 'https://matheusmorante002.wixsite.com/moveismorante',
    },
  };
}
