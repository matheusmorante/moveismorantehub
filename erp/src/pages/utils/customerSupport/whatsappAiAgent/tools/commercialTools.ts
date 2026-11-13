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
        'Realizamos entregas somente em Curitiba/PR e na Região Metropolitana de Curitiba. A loja fica na Rua Cascavel, 306, em Colombo/PR. Fora dessa área não realizamos entrega. Dentro da área atendida, o frete é grátis somente para endereços a menos de 5 km da loja; para distâncias maiores, a equipe precisa confirmar valor e prazo com o endereço completo.',
      montagem: 'Montagem própria por nossa conta na retirada na loja e nas entregas dentro de Curitiba e da Região Metropolitana.',
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
