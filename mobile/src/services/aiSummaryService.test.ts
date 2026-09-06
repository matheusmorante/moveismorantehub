import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import {
  formatExtendDateLabel,
  generateLocalSmartText,
} from './aiSummaryService';
import {
  buildCanonicalSummaryPayload,
  CanonicalSummaryPayload,
} from './canonicalSummaryInput';

describe('aiSummaryService - Resumo Inteligente de Entregas', () => {
  describe('formatExtendDateLabel', () => {
    it('formata corretamente a data de amanhã', () => {
      const today = '2026-09-06';
      const tomorrow = '2026-09-07';
      const label = formatExtendDateLabel('2026-09-07', today, tomorrow);
      expect(label).toBe('Para amanhã, segunda-feira, dia 7 de setembro');
    });

    it('formata corretamente uma data futura que não seja amanhã', () => {
      const today = '2026-09-06';
      const tomorrow = '2026-09-07';
      const label = formatExtendDateLabel('2026-09-09', today, tomorrow);
      expect(label).toBe('Para quarta-feira, dia 9 de setembro');
    });
  });

  describe('generateLocalSmartText - Regras de Hoje e Dias Seguintes', () => {
    it('aplica todas as regras oficiais para o resumo de hoje', () => {
      const payload: CanonicalSummaryPayload = {
        scope: 'today',
        targetDates: ['2026-09-06'],
        generatorVersion: 'v1',
        ttsVersion: 'v1',
        orders: [
          {
            id: 'ord-1',
            customerName: 'Vania Santos',
            city: 'colombo', // Cidade Colombo deve ser omitida
            neighborhood: 'maracanã',
            addressText: 'rua sao paulo 100',
            handlingType: 'montagem no local',
            scheduledDate: '2026-09-06',
            scheduledTime: '09:00',
            period: 'manhã',
            distanceKm: 5,
            observations: '',
            items: [
              {
                name: 'guarda-roupa casal',
                quantity: 1,
                handlingType: 'montagem no local',
                isAssemblyOutside: true,
              },
            ],
            notices: [],
          },
          {
            id: 'ord-2',
            customerName: 'Aryel Felipe',
            city: 'curitiba', // Fora de Colombo deve ser citada
            neighborhood: 'santa cândida',
            addressText: 'rua paraná 200',
            handlingType: 'entregue montado',
            scheduledDate: '2026-09-06',
            scheduledTime: '14:00',
            period: 'tarde',
            distanceKm: 12,
            observations: 'levar maquina de cartao',
            items: [
              {
                name: 'cômoda 4 gavetas',
                quantity: 2,
                handlingType: 'entregue montado',
                isAssemblyOutside: false, // Sem montagem fora: NÃO pode citar o nome da cômoda nem falar "sem montagem"
              },
            ],
            notices: ['máquina de cartão'],
          },
        ],
      };

      const text = generateLocalSmartText(payload);

      // Regra 1: Contagem geral
      expect(text).toContain('Para hoje, temos 2 entregas programadas.');

      // Regra 2: Manhã com montagem no endereço, omitindo Colombo
      expect(text).toContain('Pela manhã, temos uma entrega para Vania Santos, de um item, sendo guarda-roupa casal, com montagem no endereço.');
      expect(text).not.toContain('colombo');

      // Regra 3: Tarde citando Curitiba, contagem masculina (2 itens), sem citar nome da cômoda nem "sem montagem", e com aviso
      expect(text).toContain('À tarde, temos uma entrega para Aryel Felipe em curitiba, de 2 itens, com atenção para máquina de cartão.');
      expect(text).not.toContain('cômoda');
      expect(text).not.toContain('sem montagem');
      expect(text).not.toContain('não precisa de montagem');
    });

    it('para next_days: agrupa por dia, anuncia o dia antes das entregas e aplica as mesmas regras', () => {
      const payload: CanonicalSummaryPayload = {
        scope: 'next_days',
        targetDates: ['2026-09-07', '2026-09-08'],
        generatorVersion: 'v1',
        ttsVersion: 'v1',
        orders: [
          // Dia 1: 2026-09-07 (Amanhã)
          {
            id: 'ord-1',
            customerName: 'Vania Santos',
            city: 'colombo',
            neighborhood: 'maracanã',
            addressText: 'rua sao paulo 100',
            handlingType: 'montagem no local',
            scheduledDate: '2026-09-07',
            scheduledTime: '09:00',
            period: 'manhã',
            distanceKm: 5,
            observations: '',
            items: [
              {
                name: 'guarda-roupa casal',
                quantity: 1,
                handlingType: 'montagem no local',
                isAssemblyOutside: true,
              },
            ],
            notices: [],
          },
          {
            id: 'ord-2',
            customerName: 'Cauã Murilo',
            city: 'colombo',
            neighborhood: 'alto maracanã',
            addressText: 'rua curitiba 50',
            handlingType: 'depósito',
            scheduledDate: '2026-09-07',
            scheduledTime: '15:00',
            period: 'tarde',
            distanceKm: 4,
            observations: '',
            items: [
              {
                name: 'mesa de jantar',
                quantity: 1,
                handlingType: 'depósito',
                isAssemblyOutside: false,
              },
            ],
            notices: [],
          },
          // Dia 2: 2026-09-08 (Outro dia seguinte)
          {
            id: 'ord-3',
            customerName: 'Aryel Felipe',
            city: 'curitiba',
            neighborhood: 'boa vista',
            addressText: 'avenida paraná 300',
            handlingType: 'montagem no local',
            scheduledDate: '2026-09-08',
            scheduledTime: '10:00',
            period: 'manhã',
            distanceKm: 15,
            observations: 'levar maquina',
            items: [
              {
                name: 'painel tv',
                quantity: 1,
                handlingType: 'montagem no local',
                isAssemblyOutside: true,
              },
            ],
            notices: ['máquina de cartão'],
          },
        ],
      };

      const text = generateLocalSmartText(payload);

      // Total de entregas anunciado por dia
      // Dia 1 (amanhã): Fala a data antes das entregas
      expect(text).toMatch(/Para amanhã, segunda-feira, dia 7 de setembro, temos 2 entregas programadas\./);
      expect(text).toContain('Pela manhã, temos uma entrega para Vania Santos, de um item, sendo guarda-roupa casal, com montagem no endereço.');
      expect(text).toContain('À tarde, temos uma entrega para Cauã Murilo, de um item.');
      expect(text).not.toContain('mesa de jantar'); // Sem montagem no endereço -> não fala produto

      // Dia 2: Fala a data de terça-feira antes das entregas daquele dia
      expect(text).toMatch(/Para terça-feira, dia 8 de setembro, temos 1 entrega programada\./);
      expect(text).toContain('Pela manhã, temos uma entrega para Aryel Felipe em curitiba, de um item, sendo painel tv, com montagem no endereço, com atenção para máquina de cartão.');

      // Colombo nunca é falado
      expect(text).not.toContain(' em colombo');
      // Curitiba é falada
      expect(text).toContain(' em curitiba');
      // Sem montagem nunca é dito
      expect(text).not.toContain('sem montagem');
    });

    it('para next_days vazio: exibe mensagem amigável de frota disponível', () => {
      const payload: CanonicalSummaryPayload = {
        scope: 'next_days',
        targetDates: [],
        generatorVersion: 'v1',
        ttsVersion: 'v1',
        orders: [],
      };

      const text = generateLocalSmartText(payload);
      expect(text).toBe('Não há entregas agendadas para os próximos dias. Operação e frota disponíveis para novos lançamentos.');
    });
  });

  describe('buildCanonicalSummaryPayload', () => {
    it('constrói payload canônico para next_days sem erro de runtime (parseOrderDateStr)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      const mockOrders = [
        {
          id: 'ord-101',
          status: 'scheduled',
          customer_name: 'Vania Santos',
          city: 'Colombo',
          scheduled_date: tomorrowStr,
          order_data: {
            status: 'scheduled',
            customerData: { fullName: 'Vania Santos', city: 'Colombo' },
            shipping: {
              deliveryMethod: 'delivery',
              scheduledDate: tomorrowStr,
              scheduling: {
                date: tomorrowStr,
                time: '09:00 às 12:00',
                startTime: '09:00',
                period: 'manhã',
              },
            },
            items: [
              { description: 'Guarda Roupa', quantity: 1, handlingType: 'montagem no local' },
            ],
          },
        },
        {
          id: 'ord-102',
          status: 'scheduled',
          customer_name: 'Aryel Felipe',
          city: 'Curitiba',
          scheduled_date: dayAfterStr,
          order_data: {
            status: 'scheduled',
            customerData: { fullName: 'Aryel Felipe', city: 'Curitiba' },
            shipping: {
              deliveryMethod: 'delivery',
              scheduledDate: dayAfterStr,
              scheduling: {
                date: dayAfterStr,
                time: '14:00',
                period: 'tarde',
              },
            },
            items: [
              { description: 'Mesa de Jantar', quantity: 1, handlingType: 'depósito' },
            ],
          },
        },
      ];

      const payload = buildCanonicalSummaryPayload(mockOrders, 'next_days', []);
      expect(payload.scope).toBe('next_days');
      expect(payload.orders.length).toBe(2);
      expect(payload.orders[0].customerName).toBe('Vania Santos');
      expect(payload.orders[1].customerName).toBe('Aryel Felipe');

      // Testa a geração completa de texto combinando payload canônico
      const text = generateLocalSmartText(payload);
      expect(text).toContain('Vania Santos');
      expect(text).toContain('Aryel Felipe');
    });
  });
});
