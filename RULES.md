# 📜 Diretrizes e Regras do Projeto (Móveis Morante Hub)

Este arquivo consolida as regras de ouro e diretrizes de desenvolvimento para o projeto, em conformidade com as exigências do usuário.

---

## 🛠️ Regras de Desenvolvimento

1. **Código Limpo e Modular**: Sempre siga o princípio de código limpo, legível, manutenível e com forte modularização.
2. **Registro de Planos e Ideias**: Mantenha sempre um registro atualizado de ideias, planos pendentes e roadmap no arquivo [IDEIAS_E_PLANOS.md](file:///c:/Users/Rosilene/Desktop/pdv/IDEIAS_E_PLANOS.md).
3. **Economia de Cota de Assinatura**: Otimize ao máximo o consumo de tokens e cotas do plano de assinatura, evitando chamadas repetitivas ou desnecessárias.
4. **Isolamento de Ambientes (Dev vs Prod)**:
   - Configure de maneira clara e adequada as variáveis de ambiente, rotas de API, conexões do Supabase e quaisquer dados ambíguos.
   - Garanta que as funcionalidades rodem perfeitamente tanto no ambiente de desenvolvimento local quanto no ambiente de produção (Vercel, etc.).
5. **Relato Imediato de Bugs**: Se encontrar algum bug impeditivo que cause lentidão ou bloqueie o progresso, relate-o imediatamente ao usuário.
6. **Comunicação Ativa**: Na presença de ambiguidades ou dúvidas sobre as demandas do usuário, sempre pergunte antes de fazer suposições.
7. **Documentação das Regras**: Este arquivo de regras (`RULES.md`) deve ser mantido sempre na raiz do projeto para referência contínua.
8. **Idioma Oficial**: Toda a comunicação com o usuário e documentações específicas devem ser em **Português Brasileiro**.

---

## 📱 Regras de Negócio: WhatsApp Anti-Bloqueio

Para garantir a segurança da conta comercial da Móveis Morante:
- **Interação Primeiro**: Priorizar o envio de mensagens para clientes que já iniciaram uma conversa ativa.
- **Templates Oficiais**: Usar apenas templates pré-aprovados pela Meta Graph API para iniciar conversas frias.
- **Opção de Descadastro (Opt-Out)**: Sempre oferecer instruções claras para parar de receber mensagens (ex: "Digite SAIR para não receber mais avisos").
- **Controle de Volume**: Respeitar limites de envio para evitar detecção automatizada de spam por volume.
