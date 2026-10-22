# Verificação da publicação da Central — 22/10/2026

## Resultado

A autorização do proprietário, referência call_e1f8469e1f2d4fa8aa7bffb548e3264a, pedia publicar as quatro correções de consulta de pedidos e sobreposição do formulário. Antes da promoção, conferi o alias e encontrei a produção já atualizada pelo deploy Git dpl_EJwmsa228oySN82ix38j4D5pA11e, READY, commit da branch main da8b0189390c39723e55d1235b5f2ae7da497570.

As quatro correções aprovadas têm os mesmos hashes SHA-256 do candidato e os mesmos Git blobs deste commit. Os três ajustes publicados no pacote anterior de leitura/cópia também coincidem. Portanto, a versão solicitada já estava em produção; não promovi uma cópia redundante nem substituí o commit atual.

## Provas atuais

- Alias público morantehub.vercel.app e alias técnico morantehub-matheusmorantes-projects.vercel.app apontam para dpl_EJwmsa228oySN82ix38j4D5pA11e.
- Sete verificações HTTP na URL pública passaram: página /atendimento 200; leituras de mídia sem autenticação 401; os dois caminhos de despacho 403; webhooks sem assinatura ou com assinatura falsa 401.
- A suíte não enviou webhook válido, comando comercial ou mensagem à Meta; não gravou dados.
- O candidato original passou 244 testes, build completo, lint e TypeScript do harness; o Playwright anterior passou 1/1 em 11,2 s na porta 5173. Os arquivos centrais testados têm os mesmos hashes no commit de produção atual.
- A consulta positiva de pedidos não foi comprovada em dados comerciais reais nesta etapa; não havia fixture cliente/pedido autorizada. O fluxo de erro/retry continua coberto por Vitest e a UI sem vínculo não dispara RPC.

## Arquivos verificados

| Arquivo | SHA-256 no candidato | Git blob no commit de produção |
| --- | --- | --- |
| supportOrdersService.ts | C7A453BF70A35CCA276E0FB793C83FCFF1CD561513AC0BEC5A529A256E17CC39 | 3ce5f68e2b0c9b9cd4fe18fc0eb240db5883a9b8 |
| CustomerInfoPanel.tsx | 6F8D7159968982DB18C14512B4B7EF53E2504D646AB95D3D3219F25F6290EC4B | db62f5c291fe4623708038e95e68b9be064790bf |
| CustomerOrdersTab.tsx | 306789C527EA923562843545F4981EED2D679585086166E8587B08D2CFA05862 | 0b69d5cc19f228245712f3895cb7848f2aab6b89 |
| AddCustomInboxModal.tsx | E911ABD99E996714F2564382DEA5CEE58B3E40FF44CE0C500D5BB67782DE33A1 | ec400ffc87b9b5666e2a6624a43845560a9a496c |
| ChatHeader.tsx | 21E3C3A35D611777634A017F69BCD16CE8991FFD6D2AB75A72574B6001E7A7D2 | b27a85aa86c7b688dbf8a4480880bd37a69d12b8 |
| useCustomerSupportMessages.ts | F1A02600571C22D9D2A9217AC7DDBC5AEA1FA10EB8CB110D3E38A6AAAE239CC4 | 87c3013a91369516f9c84dfbcbd154338f8a2c87 |
| customerSupportService.ts | BBFF7DAAE04F5F09E0EDAC3ADCE2CEEAC03F3BC67F4EA89E6DB04A02FBD6DF9D | 8bce6df3741ad68805b80cbc2c84b91244ec2782 |

## Deploys de validação e aliases

As tentativas de build em versões antigas do candidato foram mantidas sem promoção. A Vercel confirmou falta de memória em duas; limites de heap de 2 e 3 GB causaram encerramento do Node durante os chunks. Uma tentativa serial com 4 GB ficou READY, mas partia do commit antigo 39b10c e não foi promovida porque poderia retirar arquivos já publicados.

Durante essa validação, a Vercel atribuiu o alias técnico padrão à implantação isolada dpl_2itpngu2AN3dbTp6mUcpDochYpec apesar de --skip-domain. Reassociei esse alias à produção atual dpl_EJwmsa228oySN82ix38j4D5pA11e e confirmei os dois aliases. A rebase de build dpl_5UJPdn2s71yhtzPfvYLUkRbrZGNL foi cancelada antes de terminar, após a confirmação de que a versão pública já continha os hashes autorizados.

Nenhuma migration, fixture, mensagem, alteração de política, commit ou push foi feita nesta publicação. Os bloqueios frontend/backend de despacho continuam validados.