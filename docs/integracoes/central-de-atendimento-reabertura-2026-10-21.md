# Reabertura da Inbox — ATD-009-R1, 21/10/2026

## Decisão e estado da entrega

O proprietário escolheu **“Reabrir Fechados e Adiados (recomendado)”**. Uma mensagem inédita do cliente deve reabrir a mesma conversa, conservando atendente, vínculos manuais, tags de negócio e histórico. O envio permanece bloqueado.

**Preparado na origem; não aplicado ao banco e não publicado.** A produção permanece no candidato documentado no [registro de publicação](central-de-atendimento-publicacao-2026-10-21.md). O manifesto isolado dessa publicação não foi alterado. O novo webhook depende da RPC abaixo: não publicar antes de instalar e validar o contrato remoto.

## Implementação preparada

- `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts`: substitui gravações separadas de conversa/mensagem por `customer_support_receive_message`. A consulta inicial do ID apenas evita repetir matching; inclusive IDs encontrados passam pela RPC, que confere canal, contato e direção antes de decidir se são duplicatas. Erros de leitura/RPC e confirmação vazia não contam como mensagem processada. Não existe fallback para writes separados.
- [SQL proposto](sql/customer-support-inbound-reopening.sql): função `SECURITY INVOKER`, `search_path` vazio, execução exclusiva de `service_role` e timeouts. Não altera grants das tabelas, triggers existentes, permissões comerciais, despachos nem o processamento de confirmações de entrega/pedidos.
- O identificador único da Meta e o bloqueio da conversa ordenam inserção, incremento de não lidas, resumo, reabertura e evento persistido na mesma transação. O evento referencia o ID da mensagem recebida; duplicatas saem antes de modificar resumo/status/evento. O conflito de um ID de mensagem entre canais/contatos é rejeitado.
- Vínculos manuais e atribuição são relidos/preservados sob o bloqueio. Não há cliente, pedido, atendente ou conversa substituta criado por redistribuição.
- A linha do tempo existente já renderiza `system_event` persistido e deduplica por ID. A mudança não fabrica eventos no frontend.

### Mensagens fora de ordem

“Inédita” significa `api_message_id` ainda não persistido, inclusive quando a entrega chega atrasada. Essa mensagem pode reabrir a conversa, conforme a regra escolhida. Seu horário não faz o resumo nem as datas da última mensagem/última interação do cliente retrocederem. Repetir um ID já recebido depois de fechar/adiar novamente não reabre a conversa. O evento de reabertura usa o horário de persistência no servidor; a mensagem conserva o horário informado pela Meta.

## Validação local

| Prova | Executada | Resultado | Limite |
| --- | --- | --- | --- |
| Vitest focado: recebimento, extração, deduplicação, mídia e inicialização nativa | Sim | 37/37 em três arquivos; 4,86s | Mocks de transporte e Node nativo; não comprovam PostgreSQL |
| Checkpoint inicial do diretório de testes da Central | Sim | 177 aprovados e seis remotos ignorados, 19 arquivos; 17,49s | Anterior aos dois casos adicionais de identidade; não é a mesma seleção histórica de 20 arquivos/192 testes da publicação |
| Checkpoint da seleção consolidada anterior mais os 12 casos novos | Sim | 198 aprovados e seis remotos ignorados, 21 arquivos; 19,42s | Anterior às três inspeções estáticas das guardas de fixtures |
| Seleção atual, com guardas propostas e negativas remotas habilitadas | Sim | **207/207**, 21 arquivos; 5,88s | Seis checks reais anônimos de leitura/execução negada; sem novo teste gravável |
| TypeScript do ERP | Sim | 424 diagnósticos globais, zero na Central/processador | Gate global continua reprovado |
| Lint dos três arquivos TypeScript alterados neste lote | Sim | Exit 0 | Escopo focado |
| Inspeção estática do SQL via Vitest | Sim | Incluída nos 12 testes novos | Não comprova sintaxe executável, RLS, concorrência, atomicidade ou rollback no PostgreSQL |
| Banco e Playwright graváveis do novo lote | Não | Pendentes | Acesso Supabase recuperado; aguarda autorização da nova operação de fixtures |

Logs: `scratch/central-support-reopening-unit-2026-10-21.log`, `scratch/central-support-reopening-all-unit-2026-10-21.log`, `scratch/central-support-reopening-consolidated-2026-10-21.log` e `scratch/central-support-reopening-types-2026-10-21.log`. Não houve navegador de teste aberto neste lote, DML remoto, webhook válido ou envio à Meta.

### Revisão do caminho de duplicata

A revisão seguinte encontrou um desvio no processador preparado: um ID encontrado na consulta inicial era classificado como duplicata antes de passar pela validação de identidade da RPC. Dois testes novos falharam antes do ajuste (dez passaram), demonstrando que a RPC não era chamada. Depois do ajuste, os 37 testes focados e os 198 consolidados passaram; lint focado exit 0 e TypeScript novamente com 424 diagnósticos globais, zero na Central. Nenhum SQL foi alterado por essa correção.

Provas: `scratch/central-support-inbound-identity-before-2026-10-21.log`, `scratch/central-support-inbound-identity-focused-2026-10-21.log`, `scratch/central-support-inbound-identity-consolidated-2026-10-21.log` e `scratch/central-support-inbound-identity-types-2026-10-21.log`. A nova prova continua unitária; o catálogo remoto e o comportamento PostgreSQL seguem sem conferência nesta etapa.

**Atualização após recuperar acesso:** o catálogo atual foi conferido, incluindo colunas, constraints, triggers e seus corpos/consumidores; a função nova ainda não existe no remoto. A contração anterior está instalada. O harness do novo lote passou no TypeScript; os dois SQLs, a solicitação e as etapas Vitest/Playwright estão preparados, aguardando autorização específica. A seleção consolidada passou em 207 testes, com as seis negativas anônimas reais habilitadas (`scratch/central-support-reopening-with-remote-denials-2026-10-21.log`). O comportamento gravável novo continua sem prova PostgreSQL.

Continuam fora desta alteração o ramo comercial de confirmação de entrega, a progressão de recibos de entrega e a resposta HTTP com erros parciais. Seus riscos constam na investigação do lote 3. Não habilitar retries do provedor por inferência nem declarar atomicidade do webhook inteiro a partir da transação da Central. Na janela de publicação, chamadas já iniciadas na revisão anterior ainda usam o processador anterior; concluir a prova concorrente depois de confirmar que essas chamadas terminaram.

## Migração e publicação

1. Revalidar o projeto operacional `hkoxhourxwlddgsfdgws`, histórico, constraints únicas, colunas, triggers e seus corpos, RLS, privilégios de `service_role` e possível função homônima. As migrations locais são referência para preparação, não substituem esse catálogo atual.
2. **Concluído:** a [contração anterior já autorizada](sql/customer-support-internal-commands-contract.sql) foi aplicada como **20261021162004**, após conferir o frontend publicado e o catálogo. SHA-256 `44F09E703BD6F836CBB9A65AA28A7D54FE80CD6D0AC7B0AAB4504BBE151859A2`; sete verificações HTTP passaram. [Registro da execução](central-de-atendimento-restricao-legada-2026-10-21.md).
3. Revisar/aplicar a função aditiva somente após conferir compatibilidade. Registrar a versão real devolvida pelo histórico remoto e criar o arquivo local correspondente, sem CLI Supabase ou banco local.
4. **Preparado, aprovação solicitada:** [operação nova e limitada](central-de-atendimento-reabertura-fixtures-proposta-2026-10-21.md), com dois SQLs, harness Vitest/Playwright, até cinco conversas/68 registros incluindo limpeza. O envelope permanece desativado até a resposta do proprietário. A execução anterior está encerrada. As guardas existentes aceitam notas/eventos próprios e bloqueiam inbound em fixtures; a adaptação proposta é específica do novo cenário e não as desativa ou contorna.
5. Provar no remoto reabertura dos dois estados, preservação de atribuição/tags/vínculos, duplicata após novo fechamento, mensagens concorrentes e fora de ordem, falha/rollback e ausência de despacho. Depois, Playwright pela UI de desenvolvimento em **5173**, com servidor iniciado e `strictPort`.
6. Preparar candidato isolado e solicitar a autorização final de publicação do novo lote. A aprovação do candidato anterior não amplia seu escopo para esta nova regra.

Rollback: primeiro devolver o webhook a uma revisão compatível conhecida, conservando o frontend com os cinco comandos internos. A função aditiva pode permanecer sem chamadas; não apagar mensagens/eventos confirmados nem reabrir privilégios legados. Não revogar a RPC enquanto um webhook publicado depender dela.

## Acesso ao Supabase

**Atualização:** a conexão voltou a responder nesta retomada. Projeto, histórico e catálogo foram conferidos; a contração **20261021162004** está aplicada e verificada. Os registros de indisponibilidade abaixo são históricos. A função nova de recebimento/reabertura continua preparada, sem aplicação ou publicação nesta etapa.

A instalação do plugin foi recuperada e suas ferramentas reapareceram. As chamadas oficiais `get_project` e `list_migrations` retornaram `USER_NOT_LOGGED_IN`. Depois de o proprietário informar novamente a reconexão, uma nova chamada a `get_project` retornou o mesmo código. O inventário de navegador informou `Local browser use is disabled in Work settings`; não foi possível executar autonomamente o fluxo de reconexão por essa superfície. Isso não é falha do login do ERP e nenhuma credencial foi solicitada ou exposta.

O proprietário também confirmou **“Navegador local habilitado”**. A consulta foi repetida e a sessão da ferramenta foi reiniciada uma vez; o novo inventário ainda retornou o mesmo bloqueio de Work, sem navegadores ou aplicativos disponíveis. A causa dessa divergência entre a configuração informada e a capacidade da execução não foi comprovada. Não foi pedido que o proprietário repetisse o login ou a mesma alteração de configuração.

A restrição anterior e a nova função não foram aplicadas por outro canal. Nenhum SQL exploratório/DML foi executado, nenhuma guarda de sessão foi contornada e nenhuma nova conversa/turn de agente foi iniciada para obter acesso.

### Auditoria do bloqueio da meta

O mesmo impedimento de acesso foi confirmado em três turnos consecutivos da meta, incluindo duas continuações automáticas após a preparação do lote. Na última conferência, `get_project` novamente retornou `USER_NOT_LOGGED_IN` e `cua.getState()` novamente informou bloqueio de navegador no Work. Os hashes do processador e dos dois SQLs continuam iguais ao checkpoint posterior à correção; o log consolidado registra 198 aprovados e seis ignorados. O turno anterior teve progresso real, com correção e prova de regressão; esta conferência não trouxe acesso novo.

O próximo passo obrigatório continua sendo conferir o catálogo/histórico do projeto remoto. Não há processo/job confirmado em execução que permita tratar a situação como espera verificada. Os testes locais pertinentes estão concluídos, mas não substituem a instalação/prova remota nem os gates de fixtures e publicação. A retomada depende de a sessão reconhecer a conexão Supabase e a capacidade de navegador que o proprietário já informou ter ativado. As autorizações existentes permanecem registradas; nenhuma nova autorização de migração ou login do ERP foi solicitada.

O escopo completo permanece pendente, incluindo contração, instalação/prova da reabertura, novo candidato e continuidade da auditoria. Não há declaração de conclusão global. Evidência da conferência: `20-auditoria-bloqueio-2026-10-21.json`, na pasta externa da auditoria.
