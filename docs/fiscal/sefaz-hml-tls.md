# Transporte HTTPS/mTLS fiscal — verificação de 05/10/2026

Status em 05/10/2026: os GETs HML dos modelos 55 e 65 agora passam com TLS validado e certificado oficial da AC SOLUTI, após o agente fiscal incorporar a confiança nativa do sistema junto às raízes padrão do Node. Nenhuma autorização fiscal foi transmitida. O smoke test de emissão pela interface continua bloqueado porque a senha write-only do certificado A1 no Vercel Development não abre o PFX ali configurado; a falha histórica 502 só poderá ser considerada encerrada após corrigir esse segredo e validar uma emissão pela interface.

## 1. Causa observada e limites da conclusão

O HTTPS local apresentou certificado substituído por inspeção de antivírus. A configuração anterior do projeto adicionava confiança nesse intermediário e limitava TLS em Windows/HML; essas medidas não eliminaram resets/timeouts e foram removidas. Os erros históricos dos pedidos 4077/3926 não tinham diagnóstico suficiente para atribuir retrospectivamente cada falha ao mesmo código de transporte.

Node padrão rejeitou a cadeia remota (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Um probe separado com a opção nativa `--use-system-ca` revelou emissor `Avast Web/Mail Shield Root` e expirou aguardando HTTP. Isso evidencia interferência local fora do projeto. Não confirma o certificado real nem a apresentação do A1 à infraestrutura oficial. Não alterar XML, tributação ou numeração para corrigir essa condição.

## 2. Configurações removidas

- Inicialização de `NODE_EXTRA_CA_CERTS` a partir de `Avast Software/Avast/wscert.pem` em `scripts/run-vercel-dev.cjs`.
- Módulo `api/nfe/sefazHmlTrust.ts`, incluindo carregamento de CA local e raiz adicional incorporada; teste correspondente excluído.
- Detecção específica de Avast, campo `tlsIntercepted` e limite `maxVersion: TLSv1.2` condicionado a Windows/HML.
- Atribuição `NODE_TLS_REJECT_UNAUTHORIZED=0` em `scratch/measure-3-sources-final.mjs`, `scratch/test-products-query.mjs`, `scratch/compare-rpc-live.mjs`, `scratch/simulate-dashboard-rpc.mjs`, `scratch/compare-dashboard-before-after.mjs`, `erp/scripts/verify-order2-browser.cjs` e `erp/scripts/test-emit-order2.cjs`. Esses helpers não foram executados.

Nenhum certificado externo foi instalado, removido ou alterado. Não foi adicionada configuração de antivírus, confiança customizada, flag global do Node ou exceção de hostname. A configuração local será tratada fora do ERP.

## 3. Arquivos envolvidos nesta correção

- `api/nfe/sefazHttpsAgent.ts`: fábrica única do agente e validação do A1.
- `api/nfe/sefazClient.ts`, `sefazTransportDiagnostic.ts`, `nfeSigner.ts`: transporte SOAP, diagnóstico e seleção do certificado do PFX.
- `api/nfe/emitHmlTechnical.ts`, `emit.ts`, `consult.ts`: diagnóstico correlacionado nos logs, respostas e histórico da tentativa existente.
- `api/nfe/distDfeClient.ts`, `erp/api/dist-dfe.ts`: reutilização da fábrica nos clientes fiscais de distribuição.
- `scripts/run-vercel-dev.cjs` e os sete helpers acima: remoção de confiança adicional/desativação TLS.
- `scripts/testing/sefaz-transport-probe.ts`: GET de WSDL HML somente leitura, com prazo absoluto de 15 segundos.
- Testes focados de cliente, diagnóstico e contrato de emissão; este relatório. Bundles fiscais regenerados.

O checkout contém alterações anteriores em outros módulos fiscais; este relatório descreve a correção de transporte atual, não atribui todo o diff acumulado a ela.

## 4. Arquitetura final e segurança

`ERP → autorização do backend → cliente SOAP comum → agente HTTPS fiscal (raízes padrão Node + trust store do SO) + A1 → SEFAZ`.

A fábrica usa `cert`, `key`, `ca` com união deduplicada das raízes padrão do Node e do trust store nativo do sistema, `minVersion: TLSv1.2`, `rejectUnauthorized: true` e `keepAlive: false`. Não define `maxVersion` nem `checkServerIdentity`; valida cadeia e hostname. A mudança é restrita aos clientes fiscais. NF-e 55 e NFC-e 65 compartilham `sendSoapToSefaz`, sem retry automático de autorização. O cliente aceita somente HTTPS/443 nos quatro hosts exatos NF-e/NFC-e HML/produção da SEFA/PR, desabilita redirecionamento e proxy Axios e aplica timeout de leitura mais prazo absoluto de 25 segundos.

O PFX/P12 é aberto com a senha configurada. A seleção busca o certificado folha correspondente à chave privada, mesmo quando uma CA aparece primeiro no arquivo. A folha deve estar válida e não ser CA. A cópia local do A1 passou nas verificações de validade, carregamento e correspondência da chave; a senha recebida do Vercel Development não abre o PFX configurado naquele ambiente. Os GETs WSDL agora completam TLS com o trust store do SO, mas nenhum SOAP foi transmitido e a apresentação do A1 à SEFAZ ainda não foi comprovada.

O [MOC 7.0, seção 4.2.2](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA%3D) especifica TLS 1.2 ou superior com autenticação mútua; os [endereços 4.00 da SEFA/PR](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400) identificam os hosts. A [opção nativa do Node para confiança do SO](https://nodejs.org/api/cli.html#--use-system-ca) foi usada apenas na comparação diagnóstica, não incorporada ao launcher.

## 5–7. Primeiros probes, antes da remoção do Avast e do reboot

Runtime: Node v22.18.0. Somente GET `NFeAutorizacao4?wsdl`; nenhum SOAP de autorização, reserva de número, documento, tentativa ou mutação de pedido/banco. Os resultados desta seção são históricos e foram substituídos pelo reteste pós-reboot registrado ao final.

| Modelo e confiança do probe | Resultado | Duração | TLS observado | Fase |
| --- | --- | --- | --- | --- |
| 65, padrão do Node | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | 156 ms | Não estabelecido | TLS |
| 65, confiança nativa do SO | `ETIMEDOUT` | 15.001 ms | TLSv1.2 | Request |
| 55, confiança nativa do SO | `ETIMEDOUT` | 15.003 ms | TLSv1.2 | Request |

Nos probes com confiança do SO, o certificado substituído apresentou:

| Campo público | NFC-e 65 | NF-e 55 |
| --- | --- | --- |
| Subject CN | `homologacao.nfce.sefa.pr.gov.br` | `homologacao.nfe.sefa.pr.gov.br` |
| Issuer CN | `Avast Web/Mail Shield Root` | `Avast Web/Mail Shield Root` |
| Valid from (GMT) | Jun 22 21:45:00 2026 | Jun 19 21:56:00 2026 |
| Valid to (GMT) | Jun 22 21:45:00 2027 | Jun 19 21:56:00 2027 |
| SHA-256 | `4B:84:56:CF:5D:75:80:D9:6C:29:50:A4:84:60:49:47:5D:F5:30:32:75:AC:B3:B5:B8:04:C7:4C:F1:8D:51:E8` | `31:C5:72:10:8B:96:59:16:1A:09:29:DF:D5:05:B2:77:80:6B:AB:A0:FD:9B:A7:72:68:20:C1:58:A4:2C:6E:7E` |

Não houve HTTP 200 nesses primeiros probes, quando o certificado observado ainda era emitido pelo Avast. Esse resultado não descreve o reteste pós-reboot, no qual ambos os GETs passaram e o emissor observado foi `AC SOLUTI SSL EV G4`. Nenhuma variável de desativação TLS/CA adicional estava configurada no shell de teste.

## Diagnóstico e recuperação preservada

Falhas são classificadas como DNS, TCP, TLS, certificado cliente, timeout, socket reset, HTTP ou SOAP Fault. O diagnóstico contém somente campos permitidos: nome/código, errno/syscall, mensagem canônica, causas limitadas, hostname/endpoint sem query, modelo/ambiente, fase, protocolo, duração, timeout e metadados públicos do peer quando disponíveis. Erros da tentativa HML são correlacionados por `diagnosticId` e `emissionRequestId` no histórico existente; falha ao persistir esse diagnóstico é informada. Não serializar Axios config/request, mensagens arbitrárias, XML, chave, senha, PFX/P12 ou certificado integral.

Sem resposta conclusiva, manter transmissão incerta e a tentativa existente. Não liberar outra numeração por timeout. Consulta `100` recupera autorização/protocolo; `217` com XML válido pode retomar a mesma chave/XML/número; `217` com XML vencido encerra a tentativa pelo fluxo oficial e exige ação explícita para nova emissão. Falha de consulta mantém pendência. Não houve mudança de regra fiscal, SQL, RPC, RLS ou schema nesta etapa.

## 8. Validação automatizada e estática

101 testes aprovados em nove arquivos focados: cliente HTTPS (16), diagnóstico (10), fluxo HML (40), autorização (14), API de emissão (8), credenciais de distribuição (2), cancelamento (3), CC-e (3) e assinatura/serialização (5). Cobrem A1/PFX/senha/chave/validade, TLS mínimo, validação habilitada, prazo absoluto, reset/DNS/certificado, SOAP, ausência de retry de autorização, transmissão incerta, recuperação `100`/`217`, mesma tentativa e impedimento de outra emissão quando a primeira é desconhecida. SOAP externo é mockado. Um servidor TLS local isolado comprovou rejeição de certificado remoto inválido antes do envio HTTP.

Lint Biome dos oito arquivos API, sintaxe do launcher e build fiscal com carregamento dos handlers/XSD passaram. O endpoint de distribuição do ERP compilou isoladamente. O TypeScript fiscal continua bloqueado por erro preexistente em `erp/src/pages/types/items.type.ts:1`: import `./product.type` inexistente. Esses resultados não comprovam autorização nem eliminação do erro de transporte real.

## 9. Autorização fiscal

`emit.ts` e `consult.ts` continuam chamando `authorizeFiscalOperator`. A sessão é validada no servidor e a permissão vem do perfil persistido, não de campos enviados pelo frontend. Testes cobrem ausência de sessão (401), perfil sem permissão (403) e perfil autorizado. Não permanece bypass de autorização fiscal de desenvolvimento na implementação auditada; não foram alteradas políticas RLS nem flexibilizados controles nesta correção.

## Auditoria global dos termos solicitados

Busca em fontes, scripts, configurações/ambientes locais e bundles fiscais regenerados. Dependências, cache de terceiros, `.git`, relatórios de mutação/scanner e fontes binárias foram separados para não confundir substrings de artefatos com configuração ativa. A busca bruta também encontrou substrings em PNGs de sprites, fontes, APKs, DEX e histórico binário do Gradle; são arquivos binários/cache de build, sem configuração TLS de aplicação identificada. Os executáveis temporários dos probes foram removidos; o script fonte somente leitura foi preservado.

| Termo | Ocorrências restantes relevantes e justificativa |
| --- | --- |
| `Avast` | Somente neste relatório: histórico das remoções e issuer observado nos probes. Nenhuma lógica/configuração específica ativa. |
| `NODE_EXTRA_CA_CERTS` | Somente neste relatório descrevendo remoção; sem atribuição em código, ambiente local ou launcher. |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Somente neste relatório descrevendo remoção; sem atribuição em helpers/ambiente local. |
| `rejectUnauthorized` | Fábrica `sefazHttpsAgent.ts` com `true`; teste `sefazClient.test.ts` exige `true`; cinco bundles fiscais gerados usam a mesma fábrica com `true`; helpers históricos `scratch/test_sefaz_node.cjs` e `scratch/print_sefaz_xml.cjs` também usam `true` e não foram executados. Sem ocorrência `false`. |
| `extraCa` | Nenhuma em implementação/configuração ativa. |
| `customCa` | Nenhuma em implementação/configuração ativa. |
| `ca:` | No agente fiscal, a lista vem dinamicamente das raízes padrão do Node e do trust store nativo do sistema; nenhuma CA Avast ou certificado embutido foi adicionado. Seis ocorrências `ca: any` em `VariationTechnicalTab.tsx`, `ProductTechnicalTab.tsx` e `variationService.ts` nomeiam atributos de categoria de produto, não autoridades certificadoras. |

## 10. Emissão HML pela interface e critério de encerramento

Na verificação inicial, não realizada porque o transporte falhou. No reteste pós-reboot, os dois GETs passaram, mas a emissão pela interface continua não realizada porque a senha write-only do A1 no Development não abre o PFX. Sem novo `POST /api/nfe/emit`, cStat, protocolo ou documento decorrente desta verificação.

Naquela etapa, o processo precisava ser reiniciado e o probe repetido. Isso ocorreu após o reboot de 05/10/2026; o resultado e o bloqueio atual estão registrados nas seções posteriores. Antes de iniciar Vercel Development e fazer a única emissão HML pela interface, corrigir a senha Dev pelo Dashboard. Só então observar POST, cStat, protocolo quando autorizado, documento persistido e vínculo visível no pedido. Até essa evidência, o 502 histórico não está encerrado.

## Reteste após desativação informada pelo usuário

O usuário informou ter desativado temporariamente o Avast e pediu nova verificação sem alterar TLS. Nenhum arquivo da implementação TLS foi alterado nesta etapa.

- A porta 3000 já não tinha listener no início; o ERP na porta 5173 continuava aberto.
- O launcher antigo `run-vercel-dev.cjs` (PID 14036) foi encerrado com sucesso. Não foram encontrados descendentes remanescentes desse PID na verificação posterior.
- A nova inicialização pelo fluxo `vercel env run -e development -- npm run dev:api:serve` tentou buscar Development do projeto vinculado `morantehub`, mas falhou no Vercel CLI com `unable to verify the first certificate`. O backend não voltou a escutar na porta 3000. Não houve fallback para secrets antigos nem configuração de confiança adicional.
- O probe foi executado em processos Node novos. `NODE_EXTRA_CA_CERTS`, desativação de validação TLS e `NODE_OPTIONS` estavam ausentes nesse shell.

| Host HML | Confiança padrão Node | Comparação com confiança nativa do SO | TLS observado no canal inspecionado |
| --- | --- | --- | --- |
| `homologacao.nfe.sefa.pr.gov.br` | `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, 164 ms | `ETIMEDOUT`, 15.006 ms, sem resposta HTTP | TLSv1.2 |
| `homologacao.nfce.sefa.pr.gov.br` | `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, 172 ms | `ETIMEDOUT`, 15.002 ms, sem resposta HTTP | TLSv1.2 |

Os dois certificados do peer continuaram com os mesmos subject CN, validade e fingerprints públicos apresentados na tabela anterior, ambos emitidos por `Avast Web/Mail Shield Root`. Portanto, o emissor Avast **não deixou de aparecer**. O probe mede duração total até resposta/falha; não registra separadamente a duração do handshake. mTLS direto com o servidor oficial e apresentação do A1 à SEFAZ não foram comprovados.

Inspeção do Windows somente leitura: serviços `avast! Antivirus`, `avast! Tools`, `AvastWscReporter` e `aswbIDSAgent` estavam em execução, junto de processos Avast/asw. A raiz pública `Avast Web/Mail Shield Root` permanecia nos stores Root de LocalMachine e CurrentUser, thumbprint `37DAA46D451D718587B7C2AC7F001D187A24D35C`. A presença da raiz no store, isoladamente, não prova interceptação; o certificado substituído observado no reteste é a evidência relevante. WinHTTP reportou acesso direto; proxy do usuário, PAC e variáveis HTTP_PROXY/HTTPS_PROXY/ALL_PROXY estavam ausentes/desabilitados. Nenhum serviço, driver, proxy ou certificado do Windows foi alterado.

Resultado: **transporte não saudável e 502 ainda não encerrado**. Nenhuma emissão HML foi feita; sem novo POST de emissão, cStat, protocolo, documento ou reserva de número. A interferência local continua sendo o bloqueio, apesar da desativação informada. Não criar workaround no ERP. Depois que o componente de inspeção estiver efetivamente inativo fora do projeto, será necessário repetir a inicialização e o GET somente leitura antes da única emissão autorizada pela interface.

## Desinstalação do Avast autorizada pelo usuário

O usuário escolheu explicitamente desinstalar o Avast Free Antivirus. O desinstalador registrado no Windows foi iniciado após confirmação de assinatura Authenticode válida, publisher Gen Digital Inc. A janela oficial confirmou **Desinstalação concluída** e solicitou reinício do computador.

Verificações antes do reinício: Avast Free Antivirus deixou de aparecer no registro de programas instalados; serviços Antivirus/Tools/aswbIDSAgent estavam parados, sem PID ativo; havia operações de arquivo pendentes para reinício. Microsoft Defender reportou AMRunningMode Normal, AntivirusEnabled true, RealTimeProtectionEnabled true e AMServiceEnabled true.

Não foram removidos certificados manualmente, nem alterados código TLS ou configuração de confiança do ERP. Não houve teste de transporte ou emissão após a desinstalação nesta fase, pois a remoção ainda exige reboot.

Foi criada a retomada automática desta conversa `retomar-valida-o-sefaz-ap-s-rein-cio`, condicionada a um novo boot posterior a 2026-10-04T08:36:28.769229-03:00. Ela aguarda o Codex estar disponível após o reinício e executa primeiro somente os GETs de WSDL de NF-e/NFC-e, sem emissão ou reserva. Só com ambos os transportes saudáveis e certificado oficial poderá prosseguir para a única emissão HML autorizada pela interface. Antes desse clique deverá registrar que a única tentativa foi iniciada; falha ou retorno incerto impede outra emissão automática. A retomada será desativada ao concluir ou identificar bloqueio acionável.

Estado para retomada: reinício necessário; transporte pós-remoção ainda não verificado; nenhuma nova emissão HML iniciada; bug 502 ainda aberto até evidência de transporte e emissão.

## Retomada após reinício e desinstalação do Avast

Novo boot confirmado: 05/10/2026 01:30:13 -03. Avast Free Antivirus não consta mais entre os aplicativos instalados. Não havia processos/serviços avast/asw em execução; o serviço de atualização residual `Avast Update Helper` ainda consta como aplicativo instalado, sem processo/serviço ativo observado. Microsoft Defender: modo Normal, antivírus e proteção em tempo real ativos. Não removi manualmente certificados do Windows. Não há CA extra, `NODE_TLS_REJECT_UNAUTHORIZED=0` ou `NODE_OPTIONS` neste shell.

Após o reboot, ambos os GETs foram executados por processos Node v22.18.0 novos, pelo probe somente leitura existente, com a fábrica atual e sem confiança customizada. Nenhum HTTP foi recebido:

| Host HML | Resultado | Duração | TLS/certificado do peer |
| --- | --- | --- | --- |
| `homologacao.nfe.sefa.pr.gov.br` (55) | `SELF_SIGNED_CERT_IN_CHAIN`, falha na fase TLS | 149 ms | Handshake não concluído; protocolo, CN, emissor, validade e fingerprint indisponíveis com validação intacta |
| `homologacao.nfce.sefa.pr.gov.br` (65) | `SELF_SIGNED_CERT_IN_CHAIN`, falha na fase TLS | 159 ms | Handshake não concluído; protocolo, CN, emissor, validade e fingerprint indisponíveis com validação intacta |

Após a remoção, o erro já não identificou Avast; a cadeia não confiável impediu comprovar qual certificado remoto foi apresentado. Não inferir certificado oficial nem interpolar os fingerprints observados antes do reboot.

Como os dois modelos falharam na verificação TLS, não iniciei Vercel Development, frontend ou emissão. Nenhum POST `/api/nfe/emit`, cStat, protocolo, documento ou número fiscal foi gerado nesta retomada. A autorização da emissão única pela interface permanece disponível para depois que a cadeia confiar corretamente sem CA customizada e ambos os WSDLs responderem.

A retomada automática foi pausada após este resultado de bloqueio. BUG 502 permanece aberto. Investigar, fora do ERP, qual cadeia agora substitui ou não encadeia a raiz confiável. `Avast Update Helper` permanece instalado, mas não havia processo/serviço ativo; não alegar que ele provocou a falha sem nova evidência.

## Diagnóstico e correção local após o bloqueio pós-reboot — 05/10/2026

Foram encontrados dois bloqueios independentes antes de qualquer autorização fiscal:

1. O probe alimentado pelas variáveis do Vercel Development falhava ao abrir o PFX com `PKCS#12 MAC could not be verified. Invalid password?`, antes de iniciar HTTPS. A comparação local foi feita somente por booleanos: o PFX do Development é igual à cópia local, mas a senha do Development não é igual à senha que abre essa cópia local. A cópia local abre, corresponde à chave privada e o certificado está válido. Nenhum valor secreto foi mostrado, registrado ou alterado. A entrada remota de senha está compartilhada entre Production, Preview e Development; ela não foi modificada para não afetar Production/Preview.
2. Com as raízes padrão do Node, novas conexões falhavam com `SELF_SIGNED_CERT_IN_CHAIN`. Pela confiança nativa do Windows, as conexões alcançavam ambos os endpoints oficiais e recebiam certificado de `AC SOLUTI SSL EV G4`, sem emissor Avast.

Correção aplicada em `api/nfe/sefazHttpsAgent.ts`: o agente fiscal usa a união deduplicada das raízes padrão do Node e das raízes nativas do sistema (`tls.getCACertificates('default'/'system')`). Isso fica restrito aos clientes fiscais centralizados. TLS 1.2 mínimo, validação de hostname e `rejectUnauthorized: true` continuam ativos; não há CA Avast/customizada, nem bypass ou desativação de validação. A API Node utilizada pelo projeto oferece a leitura do store nativo do sistema em `tls.getCACertificates('system')`.

Validação depois da correção: processos Node novos, sem CA adicional ou flags TLS, fizeram GET somente leitura aos dois endpoints HML. O certificado remoto foi autorizado pelo Node e reportou:

| Modelo | Host | HTTP | TLS | Duração total | Subject CN | Issuer CN | Validade UTC | SHA-256 do certificado remoto |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| 55 | `homologacao.nfe.sefa.pr.gov.br` | 200 | TLSv1.2 | 269 ms | `homologacao.nfe.sefa.pr.gov.br` | `AC SOLUTI SSL EV G4` | 2026-06-19 21:56:00 a 2027-06-19 21:56:00 | `80:78:B9:7A:35:C4:9D:C0:31:D9:30:BF:FC:89:4B:2F:84:CC:BA:76:3B:B8:06:B1:FE:DA:86:99:16:36:79:4D` |
| 65 | `homologacao.nfce.sefa.pr.gov.br` | 200 | TLSv1.2 | 254 ms | `homologacao.nfce.sefa.pr.gov.br` | `AC SOLUTI SSL EV G4` | 2026-06-22 21:45:00 a 2027-06-22 21:45:00 | `EF:2A:0B:01:1E:E4:79:ED:AF:8F:EA:EE:3D:D8:5F:FF:F3:3D:75:B6:19:5D:F4:CF:73:55:20:A7:B5:7C:BD:44` |

Os GETs confirmam validação TLS de servidor e resposta dos WSDLs, não uma autorização fiscal nem a apresentação do A1 em uma operação SOAP. O build fiscal e os testes focados do agente passaram. A causa histórica de cada 502 não pode ser provada retroativamente; o bloqueio verificável para a próxima execução do backend é a senha incompatível no Development, que impede carregar o PFX. Não iniciei Vercel Development nem abri o fluxo de emissão por causa desse segredo. Nenhuma nota, reserva, POST `/api/nfe/emit`, cStat ou protocolo foi produzido. A emissão permanece bloqueada até o par PFX/senha do Development ser corrigido com segurança.

## Reteste solicitado em 05/10/2026

`vercel env run` recuperou o ambiente Development, mas o probe oficial somente leitura falhou ao validar o MAC do PFX (`PKCS#12 MAC could not be verified. Invalid password?`). A falha ocorreu antes de criar HTTPS; não houve GET para NF-e ou NFC-e. Como os dois canais dependem do mesmo PFX/senha, parei sem repetir o mesmo bloqueio no segundo processo. Nenhuma emissão ou reserva foi iniciada. A senha de Development ainda precisa ser corrigida diretamente no Dashboard, preservando Production e Preview.

Após o usuário informar que atualizou a senha, comparei somente igualdade binária do PFX fornecido com o Base64 efetivo do Development e com a cópia local. O arquivo corresponde aos dois valores Base64. A senha efetiva do Development, contudo, continuou diferente da senha local e falhou ao abrir esse mesmo PFX; checagens por presença de espaço de borda ou aspas também foram negativas. Nenhum conteúdo de PFX/Base64/senha foi exibido. Portanto, o valor resolvido no Development ainda não é o valor válido que o usuário confirmou no PC. O bloqueio acontece antes do HTTPS e nenhuma emissão foi tentada.

## Retomada após reboot de 05/10/2026 e novo bloqueio de A1

O heartbeat confirmou boot novo às 01:30:13 (America/Sao_Paulo). Avast Free Antivirus não constava mais no registro de apps; não havia serviço nem processo Avast ativo. Microsoft Defender estava em modo Normal com antivírus, serviço e proteção em tempo real habilitados. O Avast Update Helper ainda constava como item separado instalado; ele não tinha serviço/processo Avast ativo nesta verificação.

Vercel CLI Development conseguiu recuperar variáveis após o reboot e o shell/probe não tinha NODE_EXTRA_CA_CERTS, NODE_TLS_REJECT_UNAUTHORIZED=0 nem NODE_OPTIONS. O GET de WSDL solicitado ainda não foi executado: o probe de NF-e falhou ao abrir o A1, antes de criar uma conexão HTTPS, com `PKCS#12 MAC could not be verified. Invalid password?`. A mensagem contém somente o erro técnico; nenhum valor do certificado ou senha foi registrado.

A comparação booleana, sem expor valores, indicou que a variável Development do PFX coincide com a cópia local, mas a senha Development difere da cópia local. A combinação que o probe recebeu do ambiente Development não abriu esse PFX. Isso não permite concluir se a senha armazenada em Development ou o próprio certificado está desatualizado; exige correção/verificação do par de segredos de Development no Vercel. Não foi executado pull persistente nem modificada variável remota. Nenhum GET foi feito para a SEFAZ, nenhum documento/reserva foi criado e nenhuma emissão foi tentada. O teste de NFC-e também não foi executado após esse bloqueio compartilhado de preparação.

O CLI Vercel Development agora completou a recuperação das variáveis sem erro TLS; essa comunicação confirma somente acesso ao Vercel, não o transporte da SEFAZ. O WSDL permanece sem validação após remover Avast. Necessário corrigir o A1/senha do ambiente Development pelo fluxo seguro e retomar o probe para ambos os hosts. A emissão HML permanece suspensa até sucesso direto dos dois WSDLs com certificado oficial e transporte sem timeout.
