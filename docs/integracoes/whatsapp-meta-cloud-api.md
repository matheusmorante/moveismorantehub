# Documentação da Integração: WhatsApp Cloud API (Meta / Facebook)

> **Módulo:** Vendas e Pós-Venda (MoranteHub ERP)  
> **Recurso:** Envio Direto de Entregas e Pedidos via API Oficial da Meta (Beta)  
> **Status:** Ativo (Disponível apenas para Administradores)  
> **Data:** 15/10/2026  

---

## 1. Visão Geral

O MoranteHub conta com duas formas de comunicação via WhatsApp com o cliente:

1. **Modo WhatsApp Web / App (`wa.me`):**
   * Abre o aplicativo ou WhatsApp Web no navegador com o texto pré-formatado.
   * O operador precisa clicar no botão de envio dentro do WhatsApp.
   * Não possui custos de API nem restrições de modelos de mensagem da Meta.

2. **Modo Envio Direto via API Oficial da Meta (Facebook Graph API) [BETA]:**
   * Envia a confirmação do pedido e dados de entrega **diretamente em segundo plano** pelos servidores oficiais da Meta.
   * Não abre abas adicionais no navegador.
   * **Requer credenciais oficiais no Meta Business Manager** (Token Permanente, Phone Number ID e WABA ID).
   * **Disponível exclusivamente para Administradores** do sistema (o botão fica desativado com tooltip informativo para outros perfis).

---

## 2. Regras Oficiais da Meta (WhatsApp Cloud API)

A Meta impõe regras estritas de proteção contra spam para mensagens enviadas por API:

### A. Regra da Janela de Atendimento de 24 Horas (*Customer Care Window*)
* **Dentro de 24 horas:** Se o cliente enviou uma mensagem para o número da sua empresa nas últimas 24 horas, sua empresa pode responder com **mensagens de texto livre** (`type: "text"`).
* **Fora de 24 horas (ou Início de Conversa pela Empresa):** Se o cliente não interagiu nas últimas 24 horas (cenário comum de envio de pedido recém-cadastrado no ERP), a Meta **bloqueia textos livres com o erro `#131047`** (*Re-engagement message: More than 24 hours have elapsed*).
* **Solução Obrigatória:** Para iniciar conversas ou enviar notificações fora da janela de 24 horas, **é obrigatório utilizar um Modelo de Mensagem Aprovado (*Message Template / HSM*)** na categoria **Utilidade (*UTILITY*)**.

---

## 3. Modelo de Mensagem Recomendado para Aprovação na Meta

Para que o envio direto funcione a qualquer momento (mesmo para clientes que nunca conversaram com a loja), crie o modelo no **Meta Business Suite**:

### Dados do Modelo:
* **Nome do Modelo:** `confirmacao_pedido_entrega` *(letras minúsculas e underline)*
* **Categoria:** `Utilidade` (`UTILITY`)
* **Idioma:** `Português (Brasil)` (`pt_BR`)

### Corpo do Modelo (Copie e Cole no Meta):
```text
Olá, {{1}}! Seu pedido na Móveis Morante foi agendado com sucesso.

📅 Data de entrega/retirada: {{2}}
⏰ Horário agendado: {{3}}
📍 Endereço: {{4}}
📦 Itens do pedido: {{5}}
💰 Total: R$ {{6}}
💳 Condições de Pagamento: {{7}}

Agradecemos a sua confiança e preferência! Caso tenha alguma dúvida sobre sua entrega, basta responder a esta mensagem.
```

### Mapeamento das Variáveis (7 Parâmetros):
1. `{{1}}`: Nome do cliente (ex: *Maria da Silva*)
2. `{{2}}`: Data agendada da entrega ou retirada (ex: *25/10/2026*)
3. `{{3}}`: Horário ou período agendado (ex: *Manhã (08:00 às 12:00)*)
4. `{{4}}`: Endereço completo com ponto de referência (ou *Retirada em loja*)
5. `{{5}}`: Lista com descrição, manuseio e quantidades dos itens
6. `{{6}}`: Valor total do pedido formatado (ex: *1.890,00*)
7. `{{7}}`: Formas e parcelamentos de pagamento combinados

---

## 4. Passo a Passo: Configuração no Meta Business Manager

1. Acesse o **Meta WhatsApp Manager (Gerenciador de Modelos)**:
   🔗 [https://business.facebook.com/wa/manage/message-templates/](https://business.facebook.com/wa/manage/message-templates/)
2. Clique no botão azul **Criar Modelo**.
3. Selecione a categoria **Utilidade** (*Utility*).
4. Informe o nome: `confirmacao_pedido_entrega`.
5. Selecione o idioma: **Português (Brasil)**.
6. Cole o texto do modelo acima.
7. No rodapé, preencha exemplos de cada variável para a revisão da Meta (ex: `{{1}}` = Maria, `{{2}}` = 20/10/2026, etc.).
8. Clique em **Enviar para Análise**. Modelos de utilidade costumam ser aprovados automaticamente em menos de 5 minutos.

---

## 5. Como Vincular no MoranteHub ERP

1. No ERP, acesse **Configurações > WhatsApp API**.
2. Certifique-se de preencher:
   * **Token Permanente de Usuário do Sistema** (com permissão `whatsapp_business_messaging`).
   * **Identificador do Número de Telefone (Phone Number ID)**.
   * **Identificador da Conta do WhatsApp Business (WABA ID)**.
3. Clique em **Consultar Modelos na Conta Meta (WABA)** para puxar a lista de modelos aprovados.
4. Selecione o modelo `confirmacao_pedido_entrega` e configure a quantidade de variáveis para **7**.
5. Salve as configurações.

---

## 6. Regras e Validações de Parâmetros da Meta (#132018)

A API do WhatsApp Cloud impõe restrições estritas nos parâmetros de corpo (`body`):
* **Proibido quebras de linha (`\n`, `\r`):** Nenhum parâmetro pode conter quebra de linha. Se os itens do pedido ou formas de pagamento forem multilinhas, eles são automaticamente convertidos para separadores horizontais com bullet points (` • `).
* **Proibido caracteres de tabulação (`\t`):** Substituídos automaticamente.
* **Proibido 4 ou mais espaços consecutivos (`\s{4,}`):** Reduzidos automaticamente para espaçamento simples.
* **Limite de caracteres:** Cada parâmetro possui limite máximo de 1024 caracteres. O sistema trunca de forma segura em 1000 caracteres com reticências.

---

## 7. Rastreamento Assíncrono via Webhook e Feedback por Toast

Diferente do retorno síncrono da API (que apenas confirma que o pacote foi recebido no gateway da Meta e gera um `wamid`), a entrega efetiva ou falha no aparelho do cliente ocorre de forma assíncrona.

O sistema possui integração ponta a ponta com Webhook e Realtime:
1. **Toast em Espera:** Ao clicar em enviar, a interface exibe um toast com spinner: `"Enviando via Cloud WhatsApp e aguardando confirmação da Meta... ⏳"`.
2. **Registro de Despacho:** O envio é gravado na tabela `public.whatsapp_dispatches` com `status: 'pending'` e o `api_message_id` (`wamid`).
3. **Escuta Reativa:** O frontend aguarda a confirmação via **Supabase Realtime** no canal do despacho (com failsafe de polling).
4. **Recebimento do Webhook (`api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts`):**
   * Se a Meta entregar (`delivered` ou `sent`), o toast é atualizado para sucesso: `"Pedido/entrega enviado diretamente ao cliente via Cloud WhatsApp com sucesso! 🎉"`.
   * Se a Meta rejeitar (`failed` / `#131056` spam, `#131049` política, `#131026` número inválido, etc.), o toast em espera é convertido para **Toast de Erro** detalhando exatamente o motivo: `"Cloud WhatsApp: Falha na entrega (Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto ou altere o conteúdo do pedido antes de reenviar.)"`.
   * Se houver timeout no webhook (ex: destinatário temporariamente sem internet), o toast informa com transparência que a mensagem está aceita na fila da Meta.

---

## 8. Proteção Anti-Spam e Cooldown Inteligente

* **Mensagens Idênticas:** Se o operador tentar enviar a mesma mensagem com conteúdo idêntico para o mesmo número em menos de 60 segundos, o sistema bloqueia localmente com alerta explicando a regra de deduplicação da Meta.
* **Mensagens com Conteúdo Alterado:** Se o operador editar a data, horário, itens ou endereço do pedido, o envio é liberado imediatamente, pois a Meta não descarta mensagens cujo conteúdo tenha sido atualizado.

---

## 9. Onde o Botão Está Disponível na Interface

* **No Modal de Ações Pós-Venda (`PostOrderActionsModal`):**
  * Botão de acesso: **"Envio de informações sobre a entrega"** (com ícone de caminhão `bi bi-truck`).
  * Ao ser clicado, abre o modal de opções de envio com trava de scroll do fundo (`useBodyScrollLock`).
* **No Modal de Envio de Informações sobre a Entrega (`DeliveryInfoModal`):**
  * Botão: **"Enviar para o cliente diretamente (Cloud WhatsApp)"** em **cor amarela** (`bg-amber-400 text-[#3b1900]`), com ícone do WhatsApp (`bi bi-whatsapp`) e rótulo **BETA**.
  * Apenas administradores podem acionar o disparo direto; desativado com tooltip explicativo para os demais usuários.
  * O modal não exibe campos de resumo da entrega, permitindo acesso direto e limpo às ações de envio.
* **No Modal de Visualização do Termo de Garantia (`WarrantyTermModal`):**
  * Botão: **"Enviar diretamente (Cloud WhatsApp)"** na barra inferior (`WarrantyReaderFooter`), em **cor amarela** (`bg-amber-400 text-[#3b1900]`) com ícone do WhatsApp e rótulo **BETA**.
  * Envia o PDF oficial gerado e assinado digitalmente com SHA-256 como anexo oficial (`type: 'document'`) via WhatsApp Cloud API.
  * Acompanha o feedback visual completo com toast em espera, rastreamento assíncrono via Webhooks e confirmação final de entrega ou erro.
  * O botão tradicional **"Enviar pelo WhatsApp"** permanece disponível em verde para abertura rápida via WhatsApp Web (`wa.me`).


