# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 4: Regra de Imutabilidade da Variação 1
- Location: tests\e2e\products\products-variations-e2e.spec.ts:138:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 401 ()",
+ ]
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Variações")').first()
    - locator resolved to <button type="button" title="Mostrar Variações" class="px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-slate-300/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label for="product-kind" class="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">…</label> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <label for="product-kind" class="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">…</label> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">…</div> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  6 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label for="product-kind" class="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">…</label> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label for="product-kind" class="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">…</label> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">…</div> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">…</div> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - region "Notifications Alt+T"
      - main [ref=e4]:
        - generic [ref=e7]:
          - generic [ref=e9]:
            - generic [ref=e10]:
              - generic [ref=e11]: 
              - textbox "Pesquisar produtos..." [ref=e12]
            - button "" [ref=e15] [cursor=pointer]
          - generic [ref=e17]:
            - generic [ref=e20]:
              - generic [ref=e21]:
                - text:                                                                                                  
                - generic [ref=e22]:
                  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_var_1791056068148 Guarda-Roupa de Casal com Espelho -" [ref=e23] [cursor=pointer]:
                    - generic [ref=e24]:
                      - generic [ref=e25]:
                        - button " Variações (1)" [ref=e26]:
                          - generic [ref=e27]: 
                          - generic [ref=e28]: Variações (1)
                        - generic [ref=e29]: "000001"
                      - generic [ref=e30]:
                        - generic "Status ERP derivado das variações" [ref=e32]:
                          - generic [ref=e33]:
                            - generic [ref=e34]: ERP
                            - generic [ref=e35]: Desativado
                        - generic [ref=e38]:
                          - generic [ref=e39]: 
                          - text: Rascunho
                        - generic [ref=e40]:
                          - button "Continuar Cadastramento" [ref=e41]:
                            - generic [ref=e42]: 
                          - button "Opções do produto" [ref=e43]:
                            - generic [ref=e44]: 
                    - generic [ref=e46]:
                      - heading "[teste_aut]_var_1791056068148 Guarda-Roupa de Casal com Espelho" [level=3] [ref=e47]
                      - generic [ref=e48]: "-"
                  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador -" [ref=e50] [cursor=pointer]:
                    - generic [ref=e51]:
                      - generic [ref=e52]:
                        - button " Variações (1)" [ref=e53]:
                          - generic [ref=e54]: 
                          - generic [ref=e55]: Variações (1)
                        - generic [ref=e56]: "000001"
                      - generic [ref=e57]:
                        - generic "Status ERP derivado das variações" [ref=e59]:
                          - generic [ref=e60]:
                            - generic [ref=e61]: ERP
                            - generic [ref=e62]: Desativado
                        - generic [ref=e65]:
                          - generic [ref=e66]: 
                          - text: Rascunho
                        - generic [ref=e67]:
                          - button "Continuar Cadastramento" [ref=e68]:
                            - generic [ref=e69]: 
                          - button "Opções do produto" [ref=e70]:
                            - generic [ref=e71]: 
                    - generic [ref=e73]:
                      - heading "[teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador" [level=3] [ref=e74]
                      - generic [ref=e75]: "-"
                  - button " Variações (1) 004030 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin Cozinhas Moduladas e Compactas •  Multiloja Salvados" [ref=e77] [cursor=pointer]:
                    - generic [ref=e78]:
                      - generic [ref=e79]:
                        - button " Variações (1)" [ref=e80]:
                          - generic [ref=e81]: 
                          - generic [ref=e82]: Variações (1)
                        - generic [ref=e83]: "004030"
                      - generic [ref=e84]:
                        - generic "Status ERP derivado das variações" [ref=e86]:
                          - generic [ref=e87]:
                            - generic [ref=e88]: ERP
                            - generic [ref=e89]: Desativado
                        - generic [ref=e92]:
                          - generic [ref=e93]: 
                          - text: Rascunho
                        - generic [ref=e94]:
                          - generic [ref=e95]: 
                          - text: Queima dos Salvados
                        - generic [ref=e96]:
                          - button "Continuar Cadastramento" [ref=e97]:
                            - generic [ref=e98]: 
                          - button "Opções do produto" [ref=e99]:
                            - generic [ref=e100]: 
                    - generic [ref=e102]:
                      - heading "Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin" [level=3] [ref=e103]
                      - generic [ref=e104]:
                        - generic [ref=e105]: Cozinhas Moduladas e Compactas
                        - generic [ref=e106]: •
                        - generic [ref=e107]:
                          - generic [ref=e108]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad Status ERP derivado das variações Editar Produto Opções do produto Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml -" [ref=e109] [cursor=pointer]:
                    - generic [ref=e110]:
                      - generic [ref=e111]:
                        - button " Variações (1)" [ref=e112]:
                          - generic [ref=e113]: 
                          - generic [ref=e114]: Variações (1)
                        - generic [ref=e115]: TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad
                      - generic [ref=e116]:
                        - generic "Status ERP derivado das variações" [ref=e118]:
                          - generic [ref=e119]:
                            - generic [ref=e120]: ERP
                            - generic [ref=e121]: Ativo
                        - generic [ref=e124]:
                          - button "Editar Produto" [ref=e125]:
                            - generic [ref=e126]: 
                          - button "Opções do produto" [ref=e127]:
                            - generic [ref=e128]: 
                    - generic [ref=e130]:
                      - heading "Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml" [level=3] [ref=e131]
                      - generic [ref=e132]: "-"
                  - button " Variações (1) TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml -" [ref=e134] [cursor=pointer]:
                    - generic [ref=e135]:
                      - generic [ref=e136]:
                        - button " Variações (1)" [ref=e137]:
                          - generic [ref=e138]: 
                          - generic [ref=e139]: Variações (1)
                        - generic [ref=e140]: TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6
                      - generic [ref=e141]:
                        - generic "Status ERP derivado das variações" [ref=e143]:
                          - generic [ref=e144]:
                            - generic [ref=e145]: ERP
                            - generic [ref=e146]: Ativo
                        - generic [ref=e149]:
                          - button "Editar Produto" [ref=e150]:
                            - generic [ref=e151]: 
                          - button "Opções do produto" [ref=e152]:
                            - generic [ref=e153]: 
                    - generic [ref=e155]:
                      - heading "Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml" [level=3] [ref=e156]
                      - generic [ref=e157]: "-"
                  - button " Variações (1) TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml -" [ref=e159] [cursor=pointer]:
                    - generic [ref=e160]:
                      - generic [ref=e161]:
                        - button " Variações (1)" [ref=e162]:
                          - generic [ref=e163]: 
                          - generic [ref=e164]: Variações (1)
                        - generic [ref=e165]: TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4
                      - generic [ref=e166]:
                        - generic "Status ERP derivado das variações" [ref=e168]:
                          - generic [ref=e169]:
                            - generic [ref=e170]: ERP
                            - generic [ref=e171]: Ativo
                        - generic [ref=e174]:
                          - button "Editar Produto" [ref=e175]:
                            - generic [ref=e176]: 
                          - button "Opções do produto" [ref=e177]:
                            - generic [ref=e178]: 
                    - generic [ref=e180]:
                      - heading "Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml" [level=3] [ref=e181]
                      - generic [ref=e182]: "-"
                  - button " Variações (1) TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml -" [ref=e184] [cursor=pointer]:
                    - generic [ref=e185]:
                      - generic [ref=e186]:
                        - button " Variações (1)" [ref=e187]:
                          - generic [ref=e188]: 
                          - generic [ref=e189]: Variações (1)
                        - generic [ref=e190]: TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8
                      - generic [ref=e191]:
                        - generic "Status ERP derivado das variações" [ref=e193]:
                          - generic [ref=e194]:
                            - generic [ref=e195]: ERP
                            - generic [ref=e196]: Ativo
                        - generic [ref=e199]:
                          - button "Editar Produto" [ref=e200]:
                            - generic [ref=e201]: 
                          - button "Opções do produto" [ref=e202]:
                            - generic [ref=e203]: 
                    - generic [ref=e205]:
                      - heading "Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml" [level=3] [ref=e206]
                      - generic [ref=e207]: "-"
                  - button " Variações (1) CRI-000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7 -" [ref=e209] [cursor=pointer]:
                    - generic [ref=e210]:
                      - generic [ref=e211]:
                        - button " Variações (1)" [ref=e212]:
                          - generic [ref=e213]: 
                          - generic [ref=e214]: Variações (1)
                        - generic [ref=e215]: CRI-000001
                      - generic [ref=e216]:
                        - generic "Status ERP derivado das variações" [ref=e218]:
                          - generic [ref=e219]:
                            - generic [ref=e220]: ERP
                            - generic [ref=e221]: Desativado
                        - generic [ref=e224]:
                          - generic [ref=e225]: 
                          - text: Rascunho
                        - generic [ref=e226]:
                          - button "Continuar Cadastramento" [ref=e227]:
                            - generic [ref=e228]: 
                          - button "Opções do produto" [ref=e229]:
                            - generic [ref=e230]: 
                    - generic [ref=e232]:
                      - heading "[HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7" [level=3] [ref=e233]
                      - generic [ref=e234]: "-"
                  - button " Variações (1) 004029 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados Sofás •  Multiloja Salvados" [ref=e236] [cursor=pointer]:
                    - generic [ref=e237]:
                      - generic [ref=e238]:
                        - button " Variações (1)" [ref=e239]:
                          - generic [ref=e240]: 
                          - generic [ref=e241]: Variações (1)
                        - generic [ref=e242]: "004029"
                      - generic [ref=e243]:
                        - generic "Status ERP derivado das variações" [ref=e245]:
                          - generic [ref=e246]:
                            - generic [ref=e247]: ERP
                            - generic [ref=e248]: Desativado
                        - generic [ref=e251]:
                          - generic [ref=e252]: 
                          - text: Rascunho
                        - generic [ref=e253]:
                          - generic [ref=e254]: 
                          - text: Queima dos Salvados
                        - generic [ref=e255]:
                          - button "Continuar Cadastramento" [ref=e256]:
                            - generic [ref=e257]: 
                          - button "Opções do produto" [ref=e258]:
                            - generic [ref=e259]: 
                    - generic [ref=e261]:
                      - heading "Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados" [level=3] [ref=e262]
                      - generic [ref=e263]:
                        - generic [ref=e264]: Sofás
                        - generic [ref=e265]: •
                        - generic [ref=e266]:
                          - generic [ref=e267]: 
                          - text: Multiloja Salvados
                  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe" [ref=e268] [cursor=pointer]:
                    - generic [ref=e269]:
                      - generic [ref=e270]:
                        - button " Variações (2)" [ref=e271]:
                          - generic [ref=e272]: 
                          - generic [ref=e273]: Variações (2)
                        - generic [ref=e274]: "004004"
                      - generic [ref=e275]:
                        - generic "Status ERP derivado das variações" [ref=e277]:
                          - generic [ref=e278]:
                            - generic [ref=e279]: ERP
                            - generic [ref=e280]: Ativo
                        - generic [ref=e283]:
                          - button "Editar Produto" [ref=e284]:
                            - generic [ref=e285]: 
                          - button "Opções do produto" [ref=e286]:
                            - generic [ref=e287]: 
                    - generic [ref=e289]:
                      - heading "Estante Multiuso Open 56cm" [level=3] [ref=e290]
                      - generic [ref=e291]:
                        - generic [ref=e292]: Estantes | Armários Multiuso
                        - generic [ref=e293]: •
                        - generic [ref=e294]:
                          - generic [ref=e295]: 
                          - text: Movelipe
                  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados" [ref=e296] [cursor=pointer]:
                    - generic [ref=e297]:
                      - generic [ref=e298]:
                        - button " Variações (1)" [ref=e299]:
                          - generic [ref=e300]: 
                          - generic [ref=e301]: Variações (1)
                        - generic [ref=e302]: "004002"
                      - generic [ref=e303]:
                        - generic "Status ERP derivado das variações" [ref=e305]:
                          - generic [ref=e306]:
                            - generic [ref=e307]: ERP
                            - generic [ref=e308]: Desativado
                        - generic [ref=e311]:
                          - generic [ref=e312]: 
                          - text: Queima dos Salvados
                        - generic [ref=e313]:
                          - button "Editar Produto" [ref=e314]:
                            - generic [ref=e315]: 
                          - button "Opções do produto" [ref=e316]:
                            - generic [ref=e317]: 
                    - generic [ref=e319]:
                      - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3] [ref=e320]
                      - generic [ref=e321]:
                        - generic [ref=e322]: Sapateiras | Guarda-Roupas | Armários Multiuso
                        - generic [ref=e323]: •
                        - generic [ref=e324]:
                          - generic [ref=e325]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e326] [cursor=pointer]:
                    - generic [ref=e327]:
                      - generic [ref=e328]:
                        - button " Variações (1)" [ref=e329]:
                          - generic [ref=e330]: 
                          - generic [ref=e331]: Variações (1)
                        - generic [ref=e332]: "004001"
                      - generic [ref=e333]:
                        - generic "Status ERP derivado das variações" [ref=e335]:
                          - generic [ref=e336]:
                            - generic [ref=e337]: ERP
                            - generic [ref=e338]: Desativado
                        - generic [ref=e341]:
                          - generic [ref=e342]: 
                          - text: Queima dos Salvados
                        - generic [ref=e343]:
                          - button "Editar Produto" [ref=e344]:
                            - generic [ref=e345]: 
                          - button "Opções do produto" [ref=e346]:
                            - generic [ref=e347]: 
                    - generic [ref=e349]:
                      - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3] [ref=e350]
                      - generic [ref=e351]:
                        - generic [ref=e352]: Conjunto para Sala de Jantar
                        - generic [ref=e353]: •
                        - generic [ref=e354]:
                          - generic [ref=e355]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e356] [cursor=pointer]:
                    - generic [ref=e357]:
                      - generic [ref=e358]:
                        - button " Variações (1)" [ref=e359]:
                          - generic [ref=e360]: 
                          - generic [ref=e361]: Variações (1)
                        - generic [ref=e362]: "004000"
                      - generic [ref=e363]:
                        - generic "Status ERP derivado das variações" [ref=e365]:
                          - generic [ref=e366]:
                            - generic [ref=e367]: ERP
                            - generic [ref=e368]: Desativado
                        - generic [ref=e371]:
                          - generic [ref=e372]: 
                          - text: Queima dos Salvados
                        - generic [ref=e373]:
                          - button "Editar Produto" [ref=e374]:
                            - generic [ref=e375]: 
                          - button "Opções do produto" [ref=e376]:
                            - generic [ref=e377]: 
                    - generic [ref=e379]:
                      - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3] [ref=e380]
                      - generic [ref=e381]:
                        - generic [ref=e382]: Conjunto para Sala de Jantar
                        - generic [ref=e383]: •
                        - generic [ref=e384]:
                          - generic [ref=e385]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados" [ref=e386] [cursor=pointer]:
                    - generic [ref=e387]:
                      - generic [ref=e388]:
                        - button " Variações (1)" [ref=e389]:
                          - generic [ref=e390]: 
                          - generic [ref=e391]: Variações (1)
                        - generic [ref=e392]: "003999"
                      - generic [ref=e393]:
                        - generic "Status ERP derivado das variações" [ref=e395]:
                          - generic [ref=e396]:
                            - generic [ref=e397]: ERP
                            - generic [ref=e398]: Desativado
                        - generic [ref=e401]:
                          - generic [ref=e402]: 
                          - text: Queima dos Salvados
                        - generic [ref=e403]:
                          - button "Editar Produto" [ref=e404]:
                            - generic [ref=e405]: 
                          - button "Opções do produto" [ref=e406]:
                            - generic [ref=e407]: 
                    - generic [ref=e409]:
                      - heading "Base Bau Casal 1,38 Damulti Premium" [level=3] [ref=e410]
                      - generic [ref=e411]:
                        - generic [ref=e412]: Camas/Bases Box
                        - generic [ref=e413]: •
                        - generic [ref=e414]:
                          - generic [ref=e415]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados" [ref=e416] [cursor=pointer]:
                    - generic [ref=e417]:
                      - generic [ref=e418]:
                        - button " Variações (1)" [ref=e419]:
                          - generic [ref=e420]: 
                          - generic [ref=e421]: Variações (1)
                        - generic [ref=e422]: "003998"
                      - generic [ref=e423]:
                        - generic "Status ERP derivado das variações" [ref=e425]:
                          - generic [ref=e426]:
                            - generic [ref=e427]: ERP
                            - generic [ref=e428]: Desativado
                        - generic [ref=e431]:
                          - generic [ref=e432]: 
                          - text: Queima dos Salvados
                        - generic [ref=e433]:
                          - button "Editar Produto" [ref=e434]:
                            - generic [ref=e435]: 
                          - button "Opções do produto" [ref=e436]:
                            - generic [ref=e437]: 
                    - generic [ref=e439]:
                      - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3] [ref=e440]
                      - generic [ref=e441]:
                        - generic [ref=e442]: Guarda-Roupas
                        - generic [ref=e443]: •
                        - generic [ref=e444]:
                          - generic [ref=e445]: 
                          - text: Multiloja Salvados
              - generic [ref=e446]:
                - generic [ref=e447]:
                  - generic [ref=e448]: Página 1 · 275 itens no catálogo
                  - combobox [ref=e450]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=e451]:
                  - button "" [disabled] [ref=e452]
                  - button "1" [disabled] [ref=e456]
                  - button "2" [ref=e458] [cursor=pointer]
                  - button "" [ref=e459] [cursor=pointer]
            - generic [ref=e461]:
              - generic [ref=e462]:
                - button " Resumo dos Produtos " [ref=e463] [cursor=pointer]:
                  - generic [ref=e464]:
                    - generic [ref=e465]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=e467]
                  - generic [ref=e468]: 
                - generic [ref=e469]:
                  - tablist "Canal do resumo" [ref=e470]:
                    - tab "ERP" [selected] [ref=e471] [cursor=pointer]
                    - tab "Catálogo" [ref=e472] [cursor=pointer]
                  - button " Total de Cadastrados 297" [ref=e473] [cursor=pointer]:
                    - generic [ref=e474]:
                      - generic [ref=e475]: 
                      - generic [ref=e476]: Total de Cadastrados
                    - generic [ref=e477]: "297"
                  - generic [ref=e478]:
                    - button "Ativos 142" [ref=e479] [cursor=pointer]:
                      - generic [ref=e480]: Ativos
                      - generic [ref=e481]: "142"
                    - button "Desativados 155" [ref=e482] [cursor=pointer]:
                      - generic [ref=e483]: Desativados
                      - generic [ref=e484]: "155"
                    - button " Rascunhos (Em Cadastro) 2" [ref=e485] [cursor=pointer]:
                      - generic [ref=e486]:
                        - generic [ref=e487]: 
                        - generic [ref=e488]: Rascunhos (Em Cadastro)
                      - generic [ref=e489]: "2"
              - generic [ref=e490]:
                - button " Filtros " [ref=e491] [cursor=pointer]:
                  - generic [ref=e492]:
                    - generic [ref=e493]: 
                    - heading "Filtros" [level=4] [ref=e495]
                  - generic [ref=e496]: 
                - complementary "Filtros de produtos" [ref=e498]:
                  - generic [ref=e499]:
                    - generic [ref=e500]: Parâmetros
                    - generic [ref=e502]:
                      - generic [ref=e503]:
                        - generic [ref=e504]: Categoria
                        - combobox "Categoria" [ref=e505] [cursor=pointer]:
                          - option "Todas as Categorias" [selected]
                          - option "Somente Produtos"
                          - option "Somente Serviços"
                          - option "Aparadores Buffets"
                          - option "Armários Aéreos"
                          - option "Armários Multiuso"
                          - option "Armários para Fornos"
                          - option "Balcões com Fruteiras"
                          - option "Balcões com Tampo"
                          - option "Balcões para Cooktop"
                          - option "Balcões para Filtro de Àgua"
                          - option "Balcões para Pia"
                          - option "Banheiro"
                          - option "Beliches"
                          - option "Berços"
                          - option "Cabeceiras"
                          - option "Cadeiras para Escritório"
                          - option "Cadeiras para Sala de Jantar"
                          - option "Camas/Bases Box"
                          - option "Colchões"
                          - option "Cômodas"
                          - option "Conjunto para Sala de Jantar"
                          - option "Conjuntos para Banheiro"
                          - option "Cozinha"
                          - option "Cozinhas Moduladas e Compactas"
                          - option "Cristaleiras"
                          - option "Escritório"
                          - option "Espelheira para Banheiro"
                          - option "Estantes"
                          - option "Guarda-Roupas"
                          - option "Homes"
                          - option "Lavanderia"
                          - option "Mesa para Sala de Jantar"
                          - option "Mesas de Cabeceira"
                          - option "Mesas para Escritório"
                          - option "Painéis"
                          - option "Paneleiros"
                          - option "Penteadeiras"
                          - option "Pias"
                          - option "Poltronas"
                          - option "Quarto"
                          - option "Racks"
                          - option "Sala de Estar"
                          - option "Sala de Jantar"
                          - option "Sapateiras"
                          - option "Sofás"
                          - option "Tampos"
                          - option "Treliches"
                      - generic [ref=e506]:
                        - generic [ref=e507]: Situação no ERP
                        - combobox "Situação no ERP" [ref=e508] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=e509]:
                        - generic [ref=e510]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=e511] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=e513] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e514]: 
                    - text: Limpar Filtros
      - generic [ref=e516]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e517] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=e519]
    - region "Notifications Alt+T"
  - dialog [ref=e522]:
    - button "Fechar formulário de produto" [ref=e523]
    - generic [ref=e524]:
      - generic [ref=e525]:
        - generic [ref=e526]:
          - heading "Cadastro de Produto" [level=2] [ref=e527]
          - generic [ref=e528]:
            - generic [ref=e529]: "ERP: Pendente"
            - generic [ref=e532]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=e535] [cursor=pointer]:
          - generic [aria-hidden] [ref=e536]: 
      - tablist "Abas do formulário de produto" [ref=e538]:
        - tab "Cadastro Geral" [selected] [ref=e539] [cursor=pointer]
        - tab "Fotos" [ref=e541] [cursor=pointer]:
          - generic [aria-hidden] [ref=e542]: 
        - tab "Características" [disabled] [ref=e544]:
          - generic [aria-hidden] [ref=e545]: 
          - generic [aria-hidden] [ref=e547]: 
        - tab "Descrição" [disabled] [ref=e548]:
          - generic [aria-hidden] [ref=e549]: 
          - generic [aria-hidden] [ref=e551]: 
        - tab "Estoque e Precificação" [ref=e552] [cursor=pointer]:
          - generic [aria-hidden] [ref=e553]: 
        - tab "Variações" [ref=e555] [cursor=pointer]:
          - generic [aria-hidden] [ref=e556]: 
        - tab "Tributário / NF" [ref=e558] [cursor=pointer]:
          - generic [aria-hidden] [ref=e559]: 
      - generic [ref=e562]:
        - generic [ref=e563]:
          - generic [ref=e564]:
            - generic [ref=e565]: Origem do estoque *
            - combobox "Origem do estoque *" [ref=e566]:
              - option "Selecione" [selected]
              - option "Convencional"
              - option "Salvados"
              - option "Usados"
          - generic [ref=e567]:
            - generic [ref=e568]:
              - generic [ref=e569]:
                - generic [ref=e570]: Nome
                - generic [ref=e571]: "*"
              - button "Diferenciar Título no Catálogo" [ref=e572] [cursor=pointer]
            - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=e573]'
        - generic [ref=e575]:
          - generic [ref=e577]:
            - generic [ref=e578]:
              - generic [ref=e579]: Categoria(s)
              - generic [ref=e580]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=e581] [cursor=pointer]:
              - generic [ref=e582]: GERENCIAR
              - generic [ref=e583]: 
          - generic [ref=e585]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=e586]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=e588]:
          - generic [ref=e589]: Oportunidade
          - combobox [ref=e591]:
            - option "Nenhuma (Produto Convencional)" [selected]
            - option "Mega Liquidação"
            - option "Última Unidade - Mostruário"
        - generic [ref=e593]:
          - generic [ref=e594]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=e596]
      - generic [ref=e597]:
        - status [ref=e599]:
          - generic [aria-hidden] [ref=e600]: 
          - generic [ref=e601]: Salvamento automático
        - generic [ref=e602]:
          - button "Cancelar" [ref=e603] [cursor=pointer]
          - button "Próxima etapa " [ref=e604] [cursor=pointer]:
            - generic [ref=e605]: Próxima etapa
            - generic [ref=e606]: 
```

# Test source

```ts
  41  |         );
  42  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
  43  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  44  | 
  45  |         // Teardown seguro de dados criados com testRunId
  46  |         await page.evaluate((runId) => {
  47  |             const raw = localStorage.getItem('erp_products');
  48  |             if (raw) {
  49  |                 try {
  50  |                     const products = JSON.parse(raw);
  51  |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  52  |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  53  |                 } catch (e) {
  54  |                     console.error(e);
  55  |                 }
  56  |             }
  57  |         }, testRunId);
  58  |     });
  59  | 
  60  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  61  |         await openNewProduct(page);
  62  | 
  63  |         // Modal de produto deve estar visível
  64  |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  65  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  66  | 
  67  |         // Preenche o nome na aba Geral
  68  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  69  |         await expect(nameInput).toBeVisible();
  70  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  71  |         await nameInput.blur();
  72  | 
  73  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  74  |         const formattedValue = await nameInput.inputValue();
  75  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  76  | 
  77  |         // Navega para a aba de variações
  78  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  79  |         await variationsTabBtn.click();
  80  | 
  81  |         // Deve existir a Variação 1 gerada automaticamente na lista
  82  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  83  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
  84  |         await expect(tableRows).toHaveCount(1);
  85  |     });
  86  | 
  87  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  88  |         await openNewProduct(page);
  89  | 
  90  |         // Navega para a aba de variações
  91  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  92  |         await variationsTabBtn.click();
  93  | 
  94  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  95  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  96  |         const isDisabled = await addVarBtn.isDisabled();
  97  | 
  98  |         if (isDisabled) {
  99  |             expect(isDisabled).toBe(true);
  100 |         } else {
  101 |             await addVarBtn.click();
  102 |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  103 |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  104 |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  105 |         }
  106 |     });
  107 | 
  108 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  109 |         await openNewProduct(page);
  110 | 
  111 |         // Preenche nome do pai
  112 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  113 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  114 |         await nameInput.blur();
  115 | 
  116 |         // Aba de Variações
  117 |         await page.locator('button:has-text("Variações")').first().click();
  118 | 
  119 |         // Clica na Variação 1 para editar
  120 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  121 |         await firstVarRow.click();
  122 | 
  123 |         // Modal de Variação deve estar aberto
  124 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  125 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  126 | 
  127 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  128 |         const modalClass = await varModal.getAttribute('class');
  129 |         expect(modalClass).toContain('max-w-5xl');
  130 |         expect(modalClass).toContain('h-[92vh]');
  131 |         expect(modalClass).toContain('rounded-3xl');
  132 | 
  133 |         // Fecha/Conclui o modal da Variação 1
  134 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  135 |         await cancelOrCloseBtn.click();
  136 |     });
  137 | 
  138 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  139 |         await openNewProduct(page);
  140 | 
> 141 |         await page.locator('button:has-text("Variações")').first().click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  142 | 
  143 |         // Tenta remover a Variação 1 se houver botão de exclusão
  144 |         const deleteBtn = page.locator('div[role="dialog"] table tbody tr button[title*="Excluir"], div[role="dialog"] table tbody tr button i.bi-trash').first();
  145 |         if (await deleteBtn.isVisible()) {
  146 |             await deleteBtn.click();
  147 |             // Deve informar que a Variação 1 é obrigatória
  148 |             const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
  149 |             await expect(warningToast).toBeVisible({ timeout: 5000 });
  150 |         }
  151 |     });
  152 | 
  153 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  154 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  155 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`);
  156 |         await page.waitForLoadState('domcontentloaded');
  157 | 
  158 |         // Garante que a tela carregou sem erros de runtime
  159 |         expect(await page.locator('body').isVisible()).toBe(true);
  160 |     });
  161 | 
  162 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  163 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  164 |         await page.waitForLoadState('domcontentloaded');
  165 | 
  166 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  167 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  168 |         await newProductBtn.click();
  169 | 
  170 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  171 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  172 |         await nameInput.blur();
  173 | 
  174 |         const formatted = await nameInput.inputValue();
  175 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  176 |     });
  177 | 
  178 |     test('Caso 7: Fusão de variação com variação de outro produto pai', async ({ page }) => {
  179 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  180 |         await page.waitForLoadState('domcontentloaded');
  181 | 
  182 |         // Cria o Produto Pai A
  183 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  184 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  185 |         await newProductBtn.click();
  186 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  187 |         await nameInputA.fill(`${testRunId} Pai Origem`);
  188 |         await nameInputA.blur();
  189 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  190 |             await page.locator('button:has-text("Próxima etapa")').click();
  191 |         }
  192 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  193 |             await page.locator('button:has-text("Próxima etapa")').click();
  194 |         }
  195 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  196 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  197 | 
  198 |         // Cria o Produto Pai B (Canônico)
  199 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  200 |         await page.waitForLoadState('domcontentloaded');
  201 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  202 |         await newProductBtn.click();
  203 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  204 |         await nameInputB.fill(`${testRunId} Pai Destino`);
  205 |         await nameInputB.blur();
  206 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  207 |             await page.locator('button:has-text("Próxima etapa")').click();
  208 |         }
  209 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  210 |             await page.locator('button:has-text("Próxima etapa")').click();
  211 |         }
  212 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  213 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  214 | 
  215 |         // Acessa a lista novamente para buscar as variações
  216 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  217 |         await page.waitForLoadState('domcontentloaded');
  218 |         
  219 |         // Clica na linha do Pai Origem para expandir variações
  220 |         await page.locator(`td:has-text("${testRunId} Pai Origem")`).first().click();
  221 | 
  222 |         // Localiza a linha da Variação do Pai Origem e abre o menu de ações
  223 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem"))`).first();
  224 |         await trVariação.locator('button[title="Mais ações"]').first().click();
  225 |         
  226 |         // Clica em "Mesclar com outra variação"
  227 |         await page.locator('button:has-text("Mesclar com outra variação")').first().click();
  228 | 
  229 |         // Modal de fusão deve estar visível
  230 |         const mergeModal = page.locator('div[role="dialog"][aria-labelledby="merge-variation-title"]').first();
  231 |         await expect(mergeModal).toBeVisible();
  232 | 
  233 |         // Digita o nome do Pai Destino para buscar a variação canônica
  234 |         const searchInput = mergeModal.locator('input[placeholder*="Pesquise por nome"]').first();
  235 |         await searchInput.fill(`${testRunId} Pai Destino`);
  236 | 
  237 |         // Seleciona a opção encontrada
  238 |         const option = mergeModal.locator('button:has-text("Pai Destino")').first();
  239 |         await expect(option).toBeVisible({ timeout: 5000 });
  240 |         await option.click();
  241 | 
```