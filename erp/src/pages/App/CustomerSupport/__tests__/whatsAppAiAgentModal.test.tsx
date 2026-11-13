// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppAiAgentModal } from '../components/WhatsAppAiAgentModal';
import {
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_SITUATION_RULES,
  DEFAULT_WORKFLOWS,
  WHATSAPP_SAFE_TOOLS,
} from '../../../../../../shared-utils/whatsappAiAgentSchemas';

const mockSaveSettings = vi.fn().mockResolvedValue(true);
const mockSettingsData: any = {
  whatsappAiAgent: {
    enabled: true,
    testMode: true,
    testPhoneNumbers: ['5541999998888'],
    supportMode: 'automatico',
    systemPrompt: DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
    enabledTools: WHATSAPP_SAFE_TOOLS.map((t) => t.id),
    knowledgeBase: [...DEFAULT_KNOWLEDGE_ARTICLES],
    situationRules: [...DEFAULT_SITUATION_RULES],
    workflows: [...DEFAULT_WORKFLOWS],
  },
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAdministrator: true,
    user: { id: 'admin-user', email: 'matheusmorante002@gmail.com' },
  }),
}));

vi.mock('@/pages/utils/settings', () => ({
  useSettings: () => mockSettingsData,
  getSettings: () => mockSettingsData,
  saveSettings: (payload: any) => mockSaveSettings(payload),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Painel Completo do Agente de IA do WhatsApp (WhatsAppAiAgentModal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o painel de treinamento com cinco áreas e as abas de visão geral e limites', () => {
    render(<WhatsAppAiAgentModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Treinamento do Seu Lizandro')).toBeDefined();

    // Visão geral e limites ficam fora das cinco áreas de treinamento.
    expect(screen.getByText('Visão Geral')).toBeDefined();
    expect(screen.getByText('Comportamento')).toBeDefined();
    expect(screen.getByText('Conhecimento')).toBeDefined();
    expect(screen.getByText('Procedimentos')).toBeDefined();
    expect(screen.getByText('Ferramentas ERP')).toBeDefined();
    expect(screen.getByText('Testes')).toBeDefined();
    expect(screen.getByText('Limites & Cotas')).toBeDefined();
    expect(screen.queryByText('Chat de Testes')).toBeNull();
  });

  it('permite alternar entre as abas e visualizar os conteúdos específicos', () => {
    render(<WhatsAppAiAgentModal isOpen={true} onClose={vi.fn()} />);

    // Na aba Visão Geral (inicial)
    expect(screen.getByText('Modo de Operação da IA')).toBeDefined();
    expect(screen.getByText('Automático')).toBeDefined();
    expect(screen.getByText('Assistido (Copiloto)')).toBeDefined();
    expect(screen.getByText('Pausado (Somente Humano)')).toBeDefined();

    // Comportamento reúne regras situacionais e instruções do agente.
    fireEvent.click(screen.getByText('Comportamento'));
    expect(screen.getByText('Regras de Atendimento e Frases por Situação')).toBeDefined();
    expect(screen.getByText('Consulta de Formas de Pagamento e Parcelamento')).toBeDefined();
    expect(screen.getByLabelText('Instruções do Agente (System Prompt)')).toBeDefined();

    // Clica na aba Conhecimento
    fireEvent.click(screen.getByText('Conhecimento'));
    expect(screen.getByText('Base de Conhecimento Confiável e Versionada')).toBeDefined();
    expect(screen.getByText('Frete e Prazos de Entrega')).toBeDefined();

    // Clica na aba Procedimentos
    fireEvent.click(screen.getByText('Procedimentos'));
    expect(screen.getByText('Fluxos Guiados de Atendimento')).toBeDefined();
    expect(screen.getByText('Fluxo de Compra e Recomendação')).toBeDefined();

    // Clica na aba Ferramentas ERP
    fireEvent.click(screen.getByText('Ferramentas ERP'));
    expect(screen.getByText('Ferramentas do WhatsApp Habilitadas')).toBeDefined();
    expect(screen.getByText(/Preços de custo, margens de lucro/i)).toBeDefined();

    fireEvent.click(screen.getByText('Testes'));
    expect(screen.getByText('Simulador & Diagnóstico de Atendimento')).toBeDefined();
    expect(screen.getByText('Quero ver pia')).toBeDefined();
  });

  it('chama onClose ao pressionar Escape ou clicar no botão fechar', () => {
    const handleClose = vi.fn();
    render(<WhatsAppAiAgentModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Fechar configurações do agente');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
