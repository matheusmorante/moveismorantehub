# Testes E2E da interface fiscal

O Playwright dedicado fica separado da suíte E2E antiga do ERP. Ele inicia uma pilha Vite + Vercel Development própria e só aceita uma ref Supabase remota explicitamente aprovada, fora das refs operacionais conhecidas. Não use a aba autenticada do ERP para a modalidade que grava pedidos.

## Secrets de runtime

Configure na fonte Vercel Development, sem gravar em `.env*`:

- `FISCAL_E2E_SUPABASE_URL`: URL do projeto Supabase isolado para execução fiscal.
- `FISCAL_E2E_ALLOWED_SUPABASE_REF`: a ref que deve corresponder exatamente à URL acima.
- `FISCAL_E2E_SUPABASE_ANON_KEY`: chave pública desse mesmo projeto.
- `FISCAL_E2E_SUPABASE_SERVICE_ROLE_KEY`: chave de serviço desse mesmo projeto.
- `NFE_HML_TEST_OPERATOR_EMAIL` e `NFE_HML_TEST_OPERATOR_PASSWORD`: conta real autorizada do ERP. O runner confere o e-mail esperado sem imprimir nem persistir a senha.
- `FISCAL_E2E_CERTIFICATE_BASE64` e `FISCAL_E2E_CERTIFICATE_PASSWORD`: certificado exclusivo para assinar XML na modalidade simulada. O SOAP simulado não o transmite à SEFAZ.
- Para a modalidade HML real, `NFE_CERTIFICATE_BASE64` e `NFE_CERTIFICATE_PASSWORD` devem conter o certificado autorizado para Homologação.

O banco isolado precisa estar preparado com o schema, as configurações fiscais, um usuário operador autorizado e dados sintéticos mínimos, se a criação pela interface não cobrir esses pré-requisitos. A suíte não cria projeto Supabase, não roda migrations, não grava registros por SQL e não apaga fixtures por acesso direto ao banco.

## Modos

`npm run test:e2e:fiscal:simulated` roda a interface contra o Supabase isolado e substitui exclusivamente a resposta SOAP de autorização, após as validações comerciais, assinatura e XSD reais do backend. O simulador exige Vercel Development, `tpAmb=2`, produção desabilitada, ref declarada exatamente e fora das refs operacionais. Consultas, cancelamentos, produção e qualquer ação diferente de autorização não são simulados.

`npm run test:e2e:fiscal:hml` usa o mesmo banco isolado e transmite realmente apenas NF-e/NFC-e de Homologação. A UI precisa confirmar o ambiente, o pedido precisa ser novo e elegível, e a execução não tem retry automático. Em timeout ou resposta incerta, pare e reconcilie a tentativa original pela interface antes de qualquer nova emissão.

Os dois modos fazem login pelo formulário de acesso do ERP. Não utilizam `auth_email`, tokens inseridos no navegador ou `storageState` persistido. O runner não começa se faltarem secrets, se a conta for diferente da identidade exigida ou se a ref corresponder a uma base operacional.

## Evidências

O Playwright grava relatório HTML, screenshot, vídeo e trace de falha em `erp/playwright-report/fiscal-interface-e2e` e `erp/test-results/fiscal-interface-e2e`. Esses arquivos podem conter a sessão autenticada e dados sintéticos usados na tela; mantenha-os locais e não os anexe a relatórios públicos. A suíte usa um único worker e zero retries para não duplicar pedidos ou numeração fiscal.

Cada cenário registra o `testRunId` `TEST_AUT_<uuid>` e compara o XML assinado exibido pela interface com um snapshot construído dos valores confirmados. O comparador valida emitente, destinatário, endereços, operação, finalidade, modelo, ambiente, chave, número, série, referências, modalidade de frete, itens, tributação aplicável e totalizadores; verifica também a assinatura XMLDSig sobre `infNFe`. A resposta do simulador identifica explicitamente que nenhuma transmissão ocorreu.

