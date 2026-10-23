# Resumo legível de cartão de contato recebido

**Data:** 23/10/2026  
**Escopo:** apresentação de mensagens `contacts` recebidas pela Central.

## Problema

O processador identificava mensagens com cartões de contato, mas persistia apenas o rótulo genérico “Contato compartilhado”. Atendentes não conseguiam ver o nome nem os telefones do cartão enviado pelo próprio cliente, embora `contacts` já fosse um tipo aceito e o balão já exibisse `text_content`.

## Correção

`extractMessageContent` agora lê os contatos do payload e monta texto simples com nome e telefones (ou `wa_id`) para cada cartão. O nome usa `formatted_name` e, se ausente, junta primeiro, meio e último nome. Cartões sem nome e telefone continuam exibindo o rótulo genérico. O processador já persiste o resumo em `text_content`; não houve mudança de schema, rota, formato RPC ou envio.

As mensagens antigas não podem ser enriquecidas por esta correção: o payload original dos cartões não era armazenado, portanto o histórico continua com o rótulo genérico.

## Arquivos alterados nesta correção

- `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts` — caso `contacts` em `extractMessageContent` (perto da linha 175).
- `erp/src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts` — cobertura de cartão único/múltiplo e fallback (perto das linhas 287–302).

## Validação

- `npm run test:unit --prefix erp -- src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts` — 31 testes aprovados; o build de suporte executado pelo script também passou.
- `npm run test:unit --prefix erp -- src/pages/App/CustomerSupport/__tests__/customerSupportMedia.test.tsx` — 13 testes aprovados; o build de suporte passou.
- `npx eslint src/pages/utils/customerSupport/whatsappWebhookProcessor.ts src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts` — aprovado, sem saída de erro.

## Limites

O resumo retém nome e telefone/WhatsApp ID que o cliente enviou em um cartão, dentro do texto persistido da própria mensagem. Não inclui e-mail, endereço, aniversário, organização ou URL. Não foi feito teste com webhook Meta real, fixture ou banco remoto; nenhuma migration, gravação operacional, despacho ou publicação ocorreu nesta etapa. A política de envio da Central permanece bloqueada.
