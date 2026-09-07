# Servidor MCP Privado do MoranteHub — Geração de Posts por IA

Servidor Model Context Protocol (MCP) privado e de alta segurança em Node.js + TypeScript, desenvolvido para permitir que o **ChatGPT** e o **Antigravity** consultem diretamente o MoranteHub para montar o contexto de criação de posts de produtos por IA.

---

## 1. Visão Geral e Segurança

### Principais Características
- **100% Somente Leitura (Read-Only)**: Nenhuma ferramenta permite cadastrar, alterar preços, excluir dados, movimentar estoque ou realizar mutações administrativas.
- **Zero Acesso Direto / Sem SQL Livre**: O cliente de IA não tem acesso a queries SQL ou chaves de banco (`service_role`). Todas as consultas passam por serviços parametrizados e protegidos com validação Zod.
- **Autenticação Obrigatória**: Acesso restrito a clientes autorizados com Bearer Token exclusivo para o MCP (`MORANTEHUB_MCP_ACCESS_TOKEN`, `MCP_CHATGPT_TOKEN`, `MCP_ANTIGRAVITY_TOKEN`).
- **Proteção Anti-Enumeração e Rate Limiting**: Limite configurável (padrão: 60 requisições/minuto por cliente) e paginação estrita (máx. 20 produtos por busca).
- **Auditoria Segura**: Todas as requisições são registradas em logs estruturados (horário, cliente, tool, produto, campanha, duração e status), sem nunca vazar tokens ou credenciais.

---

## 2. As 3 Perguntas do Fluxo de IA

Quando o operador humano pede no **ChatGPT**, **Gemini** ou **Antigravity** para gerar um post publicitário, o assistente inteligente faz 3 perguntas essenciais:

1. **Nome do Produto**: Qual produto você deseja divulgar? (ex.: *Guarda-Roupa Monza 4 Portas*)
2. **Campanha**: Qual campanha ou modelo de post aplicar? (ex.: *Campanha Padrão*, *Queima dos Salvados*)
3. **Formato do Post**: Qual formato deseja? (*Feed 4:5* ou *Story/Tela de Celular 9:16*)

Com essas respostas, a IA consulta o MCP e recebe todo o pacote consolidado (fotos oficiais em alta resolução, dados comerciais, prompts dos elementos da campanha e restrições invioláveis).

---

## 3. Variáveis de Ambiente e Geração de Tokens

Crie ou configure as variáveis no seu `.env` ou ambiente de execução:

```env
# Tokens de Acesso Privados para o MCP (Gere strings seguras de pelo menos 32 caracteres)
MORANTEHUB_MCP_ACCESS_TOKEN=morante_mcp_master_sec_89f72b14c3e80a52
MCP_CHATGPT_TOKEN=morante_mcp_chatgpt_sec_99a8b7c6d5e4f3a2
MCP_ANTIGRAVITY_TOKEN=morante_mcp_antigravity_sec_11b2c3d4e5f6a7b8

# Configurações do Servidor
MCP_PORT=3333
MCP_RATE_LIMIT_PER_MINUTE=60
MCP_ALLOWED_CLIENTS=chatgpt,antigravity,internal

# Supabase (Consumido internamente pelos serviços controlados)
VITE_SUPABASE_URL=https://wzpdfmihnwcrgkyagwkd.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Como Gerar Novos Tokens Seguros
No terminal:
```bash
node -e "console.log('morante_mcp_' + require('crypto').randomBytes(24).toString('hex'))"
```

---

## 4. Executando o Servidor MCP

### Modo HTTP / API (Para ChatGPT Actions / Acesso Remoto)
```bash
# Execução direta com tsx / node
npm run mcp:start
# O servidor inicia em http://localhost:3333
```

### Modo Stdio (Para Antigravity IDE / Cursor / Claude Desktop Local)
```bash
npx tsx src/mcp/index.ts --stdio
```

---

## 5. Como Conectar o ChatGPT (Custom GPT / Actions)

1. No **ChatGPT** > **Explore GPTs** > **Create a GPT** > aba **Configure**.
2. Em **Instructions**, adicione o briefing:
   ```text
   Você é o Assistente Criador de Posts da Móveis Morante.
   Quando o usuário pedir para gerar um post, pergunte:
   1. Nome do Produto
   2. Campanha desejada
   3. Formato (Feed 4:5 ou Story 9:16)
   Em seguida, use a Action 'get_post_generation_context' ou 'build_post_prompt_context' para obter todas as informações oficiais do MoranteHub e gere a imagem com máxima fidelidade às fotos oficiais.
   ```
3. Em **Actions** > **Create new action**:
   - **Authentication**: Selecione `API Key` > `Bearer`.
   - Cole o token configurado em `MCP_CHATGPT_TOKEN`.
   - **Schema**: Importe a URL `https://seu-dominio-mcp/openapi.json` ou cole o conteúdo retornado por `/openapi.json`.

---

## 6. Como Conectar o Antigravity IDE

Adicione ao arquivo de configuração MCP do seu ambiente (`mcp_config.json`):

```json
{
  "mcpServers": {
    "morantehub-post-mcp": {
      "command": "node",
      "args": ["dist/mcp/index.js", "--stdio"],
      "env": {
        "MORANTEHUB_MCP_ACCESS_TOKEN": "morante_mcp_antigravity_sec_11b2c3d4e5f6a7b8"
      }
    }
  }
}
```

---

## 7. Catálogo de Ferramentas (Tools)

| Tool | Finalidade | Parâmetros |
|---|---|---|
| `search_products` | Busca produtos reais por nome, código ou slug | `query` (string), `limit` (opcional, máx 20) |
| `get_product` | Obtém dados cadastrais e técnicos completos | `productId` (string) |
| `get_product_images` | Imagens oficiais de todas as variações | `productId` (string), `variationId` (opcional) |
| `get_campaign` | Obtém configurações de uma campanha | `campaign` ou `campaignId` |
| `get_campaign_prompts` | Prompts dos elementos configurados | `campaignId` ou `campaignName` |
| `get_store_assets` | Logo oficial e selos da loja | `category` (opcional) |
| `get_generated_post_references` | Imagens geradas anteriormente para inspiração | `productId` (string), `limit` (opcional) |
| `get_post_generation_context` | **Principal**: Retorna todo o contexto consolidado em uma chamada | `productId`, `campaign`, `format`, `variationId` |
| `build_post_prompt_context` | Briefing estruturado com hardConstraints | `productId`, `campaign`, `format`, `variationId` |

---

## 8. Revogação de Tokens e Auditoria

- **Revogação Instantânea**: Para revogar o acesso de um cliente específico (ex: ChatGPT), basta remover ou alterar a variável `MCP_CHATGPT_TOKEN` no ambiente e reiniciar o processo.
- **Auditoria**: O log de cada operação é impresso no stdout do servidor e armazenado na memória, detalhando o tempo de resposta, clientId autenticado e ferramenta consultada.
