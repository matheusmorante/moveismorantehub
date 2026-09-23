# Roadmap para habilitar emissão fiscal em produção

**Atualizado em:** 23/09/2026  
**Escopo:** NF-e (modelo 55) e NFC-e (modelo 65) pelo SEFAZ-PR, sem transmitir documentos fiscais durante esta auditoria.

## Resumo

A empresa e o sistema MORANTEHUB constam como autorizados/credenciados no PR para os modelos 55 e 65, conforme comprovantes compartilhados pelo responsável. A aplicação já tem uma seção fiscal em Configurações e uma integração de transmissão, mas ainda não há evidência de emissão completa homologada e validada em produção.

**Não emitir em produção até fechar os bloqueios P0 abaixo.** A autorização cadastral no portal e um deploy Vercel `Ready` não provam que o sistema esteja seguro nem que o XML esteja correto para cada operação.

## O que já existe e o que falta na tela

Existe a seção **Configurações → Tributação Padrão (NF-e/NFC-e)** em `erp/src/pages/App/Settings/index.tsx`. Hoje ela cobre dados básicos do emitente, ambiente, série única, numeração inicial, um CSC e padrões fiscais. Portanto, a seção não está ausente; está incompleta e também armazena credenciais que não deveriam ser expostas ao navegador.

Faltam ou precisam ser ajustados:

- Município do emitente (código IBGE) editável/validado; há divergência entre o valor padrão e `cMunFG` fixo no XML.
- CRT configurável e validado; a tela apresenta Simples Nacional como fixo.
- Série e sequência independentes por modelo (55/65) e ambiente (homologação/produção), com sequência exclusivamente atômica no servidor.
- CSC/IdToken separados por ambiente e disponíveis somente no servidor; geração do QR Code e DANFE próprios da NFC-e.
- Painel de prontidão que mostre ambiente ativo, certificado e validade, autorização, séries, CSC/CSRT configurados sem exibir segredos, e permita conferir antes de habilitar produção.
- Cadastro fiscal por produto/operação, não apenas defaults: NCM, CEST quando aplicável, CFOP por UF/tipo de operação, origem, CSOSN/CST e benefício fiscal quando exigido.

**CSRT:** não deve ser um campo de Configurações do sistema exposto ao frontend. Deve ficar em segredo de servidor por ambiente, acompanhado do ID, como já foi implementado. O responsável informou que manterá o CSRT atual; esta decisão foi respeitada. As variáveis técnicas foram configuradas após o redeploy informado.

## Bloqueios P0 — antes de qualquer emissão de produção

- [ ] **Fechar acesso público às configurações.** A política RLS de `settings` permite `SELECT` anônimo de todo o JSON, que pode conter PFX, senha do certificado e CSC. Separar segredos de dados públicos, remover leitura anônima e impedir que o navegador receba credenciais. Migrar o certificado para armazenamento seguro de servidor e remover o arquivo/senha da persistência local do navegador.
- [ ] **Proteger documentos e numeração.** `nfe_documents` e `nfe_sequences` têm políticas abertas; `get_next_nfe_number` é `SECURITY DEFINER` e não valida chamador. Aplicar RLS por usuário/empresa e operações server-side autorizadas. Remover acesso anônimo a XML, protocolo e dados do destinatário.
- [ ] **Autenticar e autorizar a rota de emissão.** `api/nfe/emit.ts` não valida identidade/perfil do chamador, aceita XML/chave/modelo/número/ambiente enviados pelo cliente e usa CORS `*`. Exigir usuário autorizado, conferir pedido/empresa no servidor, derivar os dados fiscais no backend, validar chave/XML, aplicar idempotência e limitar abuso. Remover fallback de chave anônima como credencial privilegiada.
- [ ] **Eliminar segredos/chaves hardcoded.** `api/nfe/dist-dfe.ts` contém fallback de token mestre e chave Supabase literal. Revogar/substituir credenciais expostas conforme necessário, removê-las do código e manter apenas secrets gerenciados. Não reutilizar nem copiar credenciais deste documento.
- [ ] **Confirmar endpoints atuais do SEFAZ-PR.** As URLs em `api/nfe/emit.ts` diferem das URLs atualmente publicadas na página oficial de endereços do PR. Comparar homologação e produção com a lista oficial vigente, ajustar e validar conexão mTLS e SOAP no ambiente adequado.
- [ ] **Validar cadastro oficial do emitente.** Conferir com Receita/PR e contador CNPJ, IE, endereço, código IBGE e CRT efetivamente vinculados à autorização/certificado. Há IE padrão no código que precisa ser comparada com a IE/CAD-ICMS do comprovante. Não assumir o valor atual da aplicação.
- [ ] **Corrigir XML de emitente/operação.** `cMunFG` está fixo no código e não coincide com o município IBGE padrão do emitente. `natOp`, `idDest`, `tpNF`, `indFinal` e `indPres` também estão fixos. Derivar do endereço e da operação real, incluindo vendas internas/interestaduais, consumidor final, presença e entrega/retirada.
- [ ] **Substituir tributação presumida.** O XML zera ICMS/PIS/COFINS e usa defaults de NCM/CFOP/CSOSN/CST. O contador deve aprovar regras, cálculos, CST/CSOSN, CEST, CFOP por operação, impostos e totais antes de habilitar a emissão. Adicionar `cBenef` quando a operação e a tabela vigente exigirem.
- [ ] **Bloquear dados de destinatário fictícios.** Remover placeholders/defaults como endereço de cliente genérico e exigir os campos legalmente necessários para cada modelo/operação.
- [ ] **Eliminar fallback de sequência para `localStorage`.** Se a RPC segura falhar, interromper a emissão. Garantir unicidade concorrente, separar ambiente/modelo/série e definir reconciliação/inutilização após falhas sem reaproveitar número às cegas.
- [ ] **Validar XML e assinatura antes do envio.** Não foi comprovada validação XSD executável no fluxo; a assinatura é customizada. Validar schemas e XMLDSig contra especificação/MOC e exemplos oficiais, cobrindo a cadeia do certificado e a resposta com protocolo/chave.

## P1 — completar NF-e/NFC-e e operação segura

- [ ] **Certificado A1:** conferir titular/CNPJ, validade, cadeia, senha e acesso; armazenar fora de Settings/frontend; alertar vencimento. A interface atual carrega o PFX e senha para o objeto de configurações.
- [ ] **NFC-e em produção:** solicitar/confirmar CSC de produção no Receita/PR, manter separado do CSC de homologação, calcular QR Code conforme manual vigente e gerar DANFE NFC-e com QR. O DANFE atual não demonstrou esses requisitos.
- [ ] **Pagamentos e totais:** mapear todos os meios/parcelas; o XML atual gera um único `detPag` e escolhe só um método, com fallback `tPag=99`. Conferir soma de pagamentos, desconto/frete e total do documento.
- [ ] **Escolha do modelo fiscal:** hoje retirada automaticamente seleciona 65 e entrega seleciona 55. Contador deve aprovar a matriz por operação e o sistema deve permitir escolha explícita conforme regra autorizada.
- [ ] **Ambiguidade de transmissão:** após timeout ou retorno incompleto, consultar chave/protocolo antes de permitir reenvio. Implementar idempotência e resolução de duplicidade; atualmente a rota apenas instrui consulta manual em algumas respostas.
- [ ] **Ciclo de vida:** conferir e homologar consulta de status, cancelamento, CC-e (somente quando cabível para modelo 55), inutilização, download/armazenamento do XML autorizado e trilha de auditoria. Não considerar a lista da documentação antiga como implementação concluída sem prova no código.
- [ ] **Observabilidade:** registrar cStat/xMotivo, chave, protocolo, ambiente e correlação sem gravar certificado, senha, CSRT ou CSC nos logs; criar alertas de falha e reconciliação de documentos pendentes.
- [ ] **Atualizar documentação fiscal.** `docs/fiscal/nfe_sefaz_direta.md` descreve XSD, contingência e recuperação de duplicidade como capacidades existentes, mas a auditoria não encontrou evidência suficiente no fluxo. Corrigir documentação junto da implementação.

## P2 — configuração administrativa e manutenção

- [ ] Completar a tela de Configurações com campos não secretos e validação contextual: IE, CRT, endereço e município IBGE, ambiente, configuração separada de série/numeração por modelo, regras operacionais e indicadores de prontidão.
- [ ] Manter credenciais em configuração server-side isolada por ambiente, nunca retornadas em leituras do frontend; mostrar apenas estado configurado e metadados seguros.
- [ ] Guardar versões/tabelas fiscais com data de vigência e processo de atualização, incluindo NCM/CEST/cBenef e regras nacionais/estaduais aplicáveis.
- [ ] Criar procedimento de contingência, suporte e recuperação documentado somente depois de implementar e homologar cada fluxo exigido.

## Critérios de aceite por etapa

1. **Segurança:** testes de acesso anônimo/autenticado confirmam que configurações sensíveis, XMLs e sequências não são legíveis nem graváveis sem autorização; emissão exige usuário e pedido autorizado.
2. **Cadastro e fiscal:** contador confirma por escrito CRT, IE, endereço/cMun, tributação por produto/operação, tratamento de PIS/COFINS/ICMS, CFOP, modelo, pagamentos e cenários de devolução.
3. **Homologação:** usar certificado válido e CSC de teste; validar XML/XSD/assinatura, autorizações e rejeições previsíveis para modelos 55 e 65, pagamentos mistos, venda interna/interestadual e dados incompletos. Nenhum documento de teste pode ser confundido com valor fiscal.
4. **Produção controlada:** revisão final de variáveis/endpoint/certificado/CSC/numeração e autorização do operador; primeiro envio somente com pedido real revisado e emissão fiscal deliberada. Consultar resultado na SEFAZ e armazenar XML autorizado e protocolo.

## Estado conhecido em 23/09/2026

- [x] Credenciamento/autorização PR do sistema MORANTEHUB para NF-e 55 e NFC-e 65, conforme comprovante enviado pelo responsável.
- [x] CSRT e dados do responsável técnico configurados no servidor, conforme redeploy informado pelo responsável.
- [x] A seção fiscal de Configurações já existe.
- [ ] Não há evidência registrada de teste ponta a ponta autorizado em homologação ou de uma NF-e/NFC-e de produção emitida pelo sistema.
- [ ] Os bloqueios P0 deste roadmap continuam pendentes de implementação/validação; o status `Ready` do deploy não os resolve.

## Fontes oficiais para conferência

- [SEFA/PR — endereços de homologação e produção](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400)
- [SEFA/PR — CSRT](https://sped.fazenda.pr.gov.br/NFe/Pagina/CSRT)
- [Receita/PR — orientações de credenciamento e CSC](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/22)
- [SEFA/PR — NFC-e, manuais e QR Code](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Nacional)
- [SEFA/PR — Código de Benefício Fiscal (cBenef)](https://sped.fazenda.pr.gov.br/NFe/Pagina/CODIGO-DE-BENEFICIO-FISCAL)
- [Portal Nacional NF-e — Manual de Orientação do Contribuinte](https://moc.sped.fazenda.pr.gov.br/)

