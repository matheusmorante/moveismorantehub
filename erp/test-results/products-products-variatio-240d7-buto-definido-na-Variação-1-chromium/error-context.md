# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1
- Location: tests\e2e\products\products-variations-e2e.spec.ts:87:5

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
  8 × retrying click action
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
  2 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label for="product-kind" class="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">…</label> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
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
                - text:                                                                                                    
                - generic [ref=e22]:
                  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador -" [ref=e23] [cursor=pointer]:
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
                      - heading "[teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador" [level=3] [ref=e47]
                      - generic [ref=e48]: "-"
                  - button " Variações (1) 004030 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin Cozinhas Moduladas e Compactas •  Multiloja Salvados" [ref=e50] [cursor=pointer]:
                    - generic [ref=e51]:
                      - generic [ref=e52]:
                        - button " Variações (1)" [ref=e53]:
                          - generic [ref=e54]: 
                          - generic [ref=e55]: Variações (1)
                        - generic [ref=e56]: "004030"
                      - generic [ref=e57]:
                        - generic "Status ERP derivado das variações" [ref=e59]:
                          - generic [ref=e60]:
                            - generic [ref=e61]: ERP
                            - generic [ref=e62]: Desativado
                        - generic [ref=e65]:
                          - generic [ref=e66]: 
                          - text: Rascunho
                        - generic [ref=e67]:
                          - generic [ref=e68]: 
                          - text: Queima dos Salvados
                        - generic [ref=e69]:
                          - button "Continuar Cadastramento" [ref=e70]:
                            - generic [ref=e71]: 
                          - button "Opções do produto" [ref=e72]:
                            - generic [ref=e73]: 
                    - generic [ref=e75]:
                      - heading "Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin" [level=3] [ref=e76]
                      - generic [ref=e77]:
                        - generic [ref=e78]: Cozinhas Moduladas e Compactas
                        - generic [ref=e79]: •
                        - generic [ref=e80]:
                          - generic [ref=e81]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad Status ERP derivado das variações Editar Produto Opções do produto Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml -" [ref=e82] [cursor=pointer]:
                    - generic [ref=e83]:
                      - generic [ref=e84]:
                        - button " Variações (1)" [ref=e85]:
                          - generic [ref=e86]: 
                          - generic [ref=e87]: Variações (1)
                        - generic [ref=e88]: TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad
                      - generic [ref=e89]:
                        - generic "Status ERP derivado das variações" [ref=e91]:
                          - generic [ref=e92]:
                            - generic [ref=e93]: ERP
                            - generic [ref=e94]: Ativo
                        - generic [ref=e97]:
                          - button "Editar Produto" [ref=e98]:
                            - generic [ref=e99]: 
                          - button "Opções do produto" [ref=e100]:
                            - generic [ref=e101]: 
                    - generic [ref=e103]:
                      - heading "Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml" [level=3] [ref=e104]
                      - generic [ref=e105]: "-"
                  - button " Variações (1) TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml -" [ref=e107] [cursor=pointer]:
                    - generic [ref=e108]:
                      - generic [ref=e109]:
                        - button " Variações (1)" [ref=e110]:
                          - generic [ref=e111]: 
                          - generic [ref=e112]: Variações (1)
                        - generic [ref=e113]: TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6
                      - generic [ref=e114]:
                        - generic "Status ERP derivado das variações" [ref=e116]:
                          - generic [ref=e117]:
                            - generic [ref=e118]: ERP
                            - generic [ref=e119]: Ativo
                        - generic [ref=e122]:
                          - button "Editar Produto" [ref=e123]:
                            - generic [ref=e124]: 
                          - button "Opções do produto" [ref=e125]:
                            - generic [ref=e126]: 
                    - generic [ref=e128]:
                      - heading "Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml" [level=3] [ref=e129]
                      - generic [ref=e130]: "-"
                  - button " Variações (1) TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml -" [ref=e132] [cursor=pointer]:
                    - generic [ref=e133]:
                      - generic [ref=e134]:
                        - button " Variações (1)" [ref=e135]:
                          - generic [ref=e136]: 
                          - generic [ref=e137]: Variações (1)
                        - generic [ref=e138]: TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4
                      - generic [ref=e139]:
                        - generic "Status ERP derivado das variações" [ref=e141]:
                          - generic [ref=e142]:
                            - generic [ref=e143]: ERP
                            - generic [ref=e144]: Ativo
                        - generic [ref=e147]:
                          - button "Editar Produto" [ref=e148]:
                            - generic [ref=e149]: 
                          - button "Opções do produto" [ref=e150]:
                            - generic [ref=e151]: 
                    - generic [ref=e153]:
                      - heading "Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml" [level=3] [ref=e154]
                      - generic [ref=e155]: "-"
                  - button " Variações (1) TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml -" [ref=e157] [cursor=pointer]:
                    - generic [ref=e158]:
                      - generic [ref=e159]:
                        - button " Variações (1)" [ref=e160]:
                          - generic [ref=e161]: 
                          - generic [ref=e162]: Variações (1)
                        - generic [ref=e163]: TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8
                      - generic [ref=e164]:
                        - generic "Status ERP derivado das variações" [ref=e166]:
                          - generic [ref=e167]:
                            - generic [ref=e168]: ERP
                            - generic [ref=e169]: Ativo
                        - generic [ref=e172]:
                          - button "Editar Produto" [ref=e173]:
                            - generic [ref=e174]: 
                          - button "Opções do produto" [ref=e175]:
                            - generic [ref=e176]: 
                    - generic [ref=e178]:
                      - heading "Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml" [level=3] [ref=e179]
                      - generic [ref=e180]: "-"
                  - button " Variações (1) CRI-000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7 -" [ref=e182] [cursor=pointer]:
                    - generic [ref=e183]:
                      - generic [ref=e184]:
                        - button " Variações (1)" [ref=e185]:
                          - generic [ref=e186]: 
                          - generic [ref=e187]: Variações (1)
                        - generic [ref=e188]: CRI-000001
                      - generic [ref=e189]:
                        - generic "Status ERP derivado das variações" [ref=e191]:
                          - generic [ref=e192]:
                            - generic [ref=e193]: ERP
                            - generic [ref=e194]: Desativado
                        - generic [ref=e197]:
                          - generic [ref=e198]: 
                          - text: Rascunho
                        - generic [ref=e199]:
                          - button "Continuar Cadastramento" [ref=e200]:
                            - generic [ref=e201]: 
                          - button "Opções do produto" [ref=e202]:
                            - generic [ref=e203]: 
                    - generic [ref=e205]:
                      - heading "[HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7" [level=3] [ref=e206]
                      - generic [ref=e207]: "-"
                  - button " Variações (1) 004029 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados Sofás •  Multiloja Salvados" [ref=e209] [cursor=pointer]:
                    - generic [ref=e210]:
                      - generic [ref=e211]:
                        - button " Variações (1)" [ref=e212]:
                          - generic [ref=e213]: 
                          - generic [ref=e214]: Variações (1)
                        - generic [ref=e215]: "004029"
                      - generic [ref=e216]:
                        - generic "Status ERP derivado das variações" [ref=e218]:
                          - generic [ref=e219]:
                            - generic [ref=e220]: ERP
                            - generic [ref=e221]: Desativado
                        - generic [ref=e224]:
                          - generic [ref=e225]: 
                          - text: Rascunho
                        - generic [ref=e226]:
                          - generic [ref=e227]: 
                          - text: Queima dos Salvados
                        - generic [ref=e228]:
                          - button "Continuar Cadastramento" [ref=e229]:
                            - generic [ref=e230]: 
                          - button "Opções do produto" [ref=e231]:
                            - generic [ref=e232]: 
                    - generic [ref=e234]:
                      - heading "Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados" [level=3] [ref=e235]
                      - generic [ref=e236]:
                        - generic [ref=e237]: Sofás
                        - generic [ref=e238]: •
                        - generic [ref=e239]:
                          - generic [ref=e240]: 
                          - text: Multiloja Salvados
                  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe" [ref=e241] [cursor=pointer]:
                    - generic [ref=e242]:
                      - generic [ref=e243]:
                        - button " Variações (2)" [ref=e244]:
                          - generic [ref=e245]: 
                          - generic [ref=e246]: Variações (2)
                        - generic [ref=e247]: "004004"
                      - generic [ref=e248]:
                        - generic "Status ERP derivado das variações" [ref=e250]:
                          - generic [ref=e251]:
                            - generic [ref=e252]: ERP
                            - generic [ref=e253]: Ativo
                        - generic [ref=e256]:
                          - button "Editar Produto" [ref=e257]:
                            - generic [ref=e258]: 
                          - button "Opções do produto" [ref=e259]:
                            - generic [ref=e260]: 
                    - generic [ref=e262]:
                      - heading "Estante Multiuso Open 56cm" [level=3] [ref=e263]
                      - generic [ref=e264]:
                        - generic [ref=e265]: Estantes | Armários Multiuso
                        - generic [ref=e266]: •
                        - generic [ref=e267]:
                          - generic [ref=e268]: 
                          - text: Movelipe
                  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados" [ref=e269] [cursor=pointer]:
                    - generic [ref=e270]:
                      - generic [ref=e271]:
                        - button " Variações (1)" [ref=e272]:
                          - generic [ref=e273]: 
                          - generic [ref=e274]: Variações (1)
                        - generic [ref=e275]: "004002"
                      - generic [ref=e276]:
                        - generic "Status ERP derivado das variações" [ref=e278]:
                          - generic [ref=e279]:
                            - generic [ref=e280]: ERP
                            - generic [ref=e281]: Desativado
                        - generic [ref=e284]:
                          - generic [ref=e285]: 
                          - text: Queima dos Salvados
                        - generic [ref=e286]:
                          - button "Editar Produto" [ref=e287]:
                            - generic [ref=e288]: 
                          - button "Opções do produto" [ref=e289]:
                            - generic [ref=e290]: 
                    - generic [ref=e292]:
                      - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3] [ref=e293]
                      - generic [ref=e294]:
                        - generic [ref=e295]: Sapateiras | Guarda-Roupas | Armários Multiuso
                        - generic [ref=e296]: •
                        - generic [ref=e297]:
                          - generic [ref=e298]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e299] [cursor=pointer]:
                    - generic [ref=e300]:
                      - generic [ref=e301]:
                        - button " Variações (1)" [ref=e302]:
                          - generic [ref=e303]: 
                          - generic [ref=e304]: Variações (1)
                        - generic [ref=e305]: "004001"
                      - generic [ref=e306]:
                        - generic "Status ERP derivado das variações" [ref=e308]:
                          - generic [ref=e309]:
                            - generic [ref=e310]: ERP
                            - generic [ref=e311]: Desativado
                        - generic [ref=e314]:
                          - generic [ref=e315]: 
                          - text: Queima dos Salvados
                        - generic [ref=e316]:
                          - button "Editar Produto" [ref=e317]:
                            - generic [ref=e318]: 
                          - button "Opções do produto" [ref=e319]:
                            - generic [ref=e320]: 
                    - generic [ref=e322]:
                      - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3] [ref=e323]
                      - generic [ref=e324]:
                        - generic [ref=e325]: Conjunto para Sala de Jantar
                        - generic [ref=e326]: •
                        - generic [ref=e327]:
                          - generic [ref=e328]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e329] [cursor=pointer]:
                    - generic [ref=e330]:
                      - generic [ref=e331]:
                        - button " Variações (1)" [ref=e332]:
                          - generic [ref=e333]: 
                          - generic [ref=e334]: Variações (1)
                        - generic [ref=e335]: "004000"
                      - generic [ref=e336]:
                        - generic "Status ERP derivado das variações" [ref=e338]:
                          - generic [ref=e339]:
                            - generic [ref=e340]: ERP
                            - generic [ref=e341]: Desativado
                        - generic [ref=e344]:
                          - generic [ref=e345]: 
                          - text: Queima dos Salvados
                        - generic [ref=e346]:
                          - button "Editar Produto" [ref=e347]:
                            - generic [ref=e348]: 
                          - button "Opções do produto" [ref=e349]:
                            - generic [ref=e350]: 
                    - generic [ref=e352]:
                      - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3] [ref=e353]
                      - generic [ref=e354]:
                        - generic [ref=e355]: Conjunto para Sala de Jantar
                        - generic [ref=e356]: •
                        - generic [ref=e357]:
                          - generic [ref=e358]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados" [ref=e359] [cursor=pointer]:
                    - generic [ref=e360]:
                      - generic [ref=e361]:
                        - button " Variações (1)" [ref=e362]:
                          - generic [ref=e363]: 
                          - generic [ref=e364]: Variações (1)
                        - generic [ref=e365]: "003999"
                      - generic [ref=e366]:
                        - generic "Status ERP derivado das variações" [ref=e368]:
                          - generic [ref=e369]:
                            - generic [ref=e370]: ERP
                            - generic [ref=e371]: Desativado
                        - generic [ref=e374]:
                          - generic [ref=e375]: 
                          - text: Queima dos Salvados
                        - generic [ref=e376]:
                          - button "Editar Produto" [ref=e377]:
                            - generic [ref=e378]: 
                          - button "Opções do produto" [ref=e379]:
                            - generic [ref=e380]: 
                    - generic [ref=e382]:
                      - heading "Base Bau Casal 1,38 Damulti Premium" [level=3] [ref=e383]
                      - generic [ref=e384]:
                        - generic [ref=e385]: Camas/Bases Box
                        - generic [ref=e386]: •
                        - generic [ref=e387]:
                          - generic [ref=e388]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados" [ref=e389] [cursor=pointer]:
                    - generic [ref=e390]:
                      - generic [ref=e391]:
                        - button " Variações (1)" [ref=e392]:
                          - generic [ref=e393]: 
                          - generic [ref=e394]: Variações (1)
                        - generic [ref=e395]: "003998"
                      - generic [ref=e396]:
                        - generic "Status ERP derivado das variações" [ref=e398]:
                          - generic [ref=e399]:
                            - generic [ref=e400]: ERP
                            - generic [ref=e401]: Desativado
                        - generic [ref=e404]:
                          - generic [ref=e405]: 
                          - text: Queima dos Salvados
                        - generic [ref=e406]:
                          - button "Editar Produto" [ref=e407]:
                            - generic [ref=e408]: 
                          - button "Opções do produto" [ref=e409]:
                            - generic [ref=e410]: 
                    - generic [ref=e412]:
                      - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3] [ref=e413]
                      - generic [ref=e414]:
                        - generic [ref=e415]: Guarda-Roupas
                        - generic [ref=e416]: •
                        - generic [ref=e417]:
                          - generic [ref=e418]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003997 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Colchão Queen 158 Castor Sleep Max D45 Colchões •  Multiloja Salvados" [ref=e419] [cursor=pointer]:
                    - generic [ref=e420]:
                      - generic [ref=e421]:
                        - button " Variações (1)" [ref=e422]:
                          - generic [ref=e423]: 
                          - generic [ref=e424]: Variações (1)
                        - generic [ref=e425]: "003997"
                      - generic [ref=e426]:
                        - generic "Status ERP derivado das variações" [ref=e428]:
                          - generic [ref=e429]:
                            - generic [ref=e430]: ERP
                            - generic [ref=e431]: Desativado
                        - generic [ref=e434]:
                          - generic [ref=e435]: 
                          - text: Queima dos Salvados
                        - generic [ref=e436]:
                          - button "Editar Produto" [ref=e437]:
                            - generic [ref=e438]: 
                          - button "Opções do produto" [ref=e439]:
                            - generic [ref=e440]: 
                    - generic [ref=e442]:
                      - heading "Colchão Queen 158 Castor Sleep Max D45" [level=3] [ref=e443]
                      - generic [ref=e444]:
                        - generic [ref=e445]: Colchões
                        - generic [ref=e446]: •
                        - generic [ref=e447]:
                          - generic [ref=e448]: 
                          - text: Multiloja Salvados
              - generic [ref=e449]:
                - generic [ref=e450]:
                  - generic [ref=e451]: Página 1 · 274 itens no catálogo
                  - combobox [ref=e453]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=e454]:
                  - button "" [disabled] [ref=e455]
                  - button "1" [disabled] [ref=e459]
                  - button "2" [ref=e461] [cursor=pointer]
                  - button "" [ref=e462] [cursor=pointer]
            - generic [ref=e464]:
              - generic [ref=e465]:
                - button " Resumo dos Produtos " [ref=e466] [cursor=pointer]:
                  - generic [ref=e467]:
                    - generic [ref=e468]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=e470]
                  - generic [ref=e471]: 
                - generic [ref=e472]:
                  - tablist "Canal do resumo" [ref=e473]:
                    - tab "ERP" [selected] [ref=e474] [cursor=pointer]
                    - tab "Catálogo" [ref=e475] [cursor=pointer]
                  - button " Total de Cadastrados 297" [ref=e476] [cursor=pointer]:
                    - generic [ref=e477]:
                      - generic [ref=e478]: 
                      - generic [ref=e479]: Total de Cadastrados
                    - generic [ref=e480]: "297"
                  - generic [ref=e481]:
                    - button "Ativos 142" [ref=e482] [cursor=pointer]:
                      - generic [ref=e483]: Ativos
                      - generic [ref=e484]: "142"
                    - button "Desativados 155" [ref=e485] [cursor=pointer]:
                      - generic [ref=e486]: Desativados
                      - generic [ref=e487]: "155"
                    - button " Rascunhos (Em Cadastro) 2" [ref=e488] [cursor=pointer]:
                      - generic [ref=e489]:
                        - generic [ref=e490]: 
                        - generic [ref=e491]: Rascunhos (Em Cadastro)
                      - generic [ref=e492]: "2"
              - generic [ref=e493]:
                - button " Filtros " [ref=e494] [cursor=pointer]:
                  - generic [ref=e495]:
                    - generic [ref=e496]: 
                    - heading "Filtros" [level=4] [ref=e498]
                  - generic [ref=e499]: 
                - complementary "Filtros de produtos" [ref=e501]:
                  - generic [ref=e502]:
                    - generic [ref=e503]: Parâmetros
                    - generic [ref=e505]:
                      - generic [ref=e506]:
                        - generic [ref=e507]: Categoria
                        - combobox "Categoria" [ref=e508] [cursor=pointer]:
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
                      - generic [ref=e509]:
                        - generic [ref=e510]: Situação no ERP
                        - combobox "Situação no ERP" [ref=e511] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=e512]:
                        - generic [ref=e513]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=e514] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=e516] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e517]: 
                    - text: Limpar Filtros
      - generic [ref=e519]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e520] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=e522]
    - region "Notifications Alt+T"
  - dialog [ref=e525]:
    - button "Fechar formulário de produto" [ref=e526]
    - generic [ref=e527]:
      - generic [ref=e528]:
        - generic [ref=e529]:
          - heading "Cadastro de Produto" [level=2] [ref=e530]
          - generic [ref=e531]:
            - generic [ref=e532]: "ERP: Pendente"
            - generic [ref=e535]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=e538] [cursor=pointer]:
          - generic [aria-hidden] [ref=e539]: 
      - tablist "Abas do formulário de produto" [ref=e541]:
        - tab "Cadastro Geral" [selected] [ref=e542] [cursor=pointer]
        - tab "Fotos" [ref=e544] [cursor=pointer]:
          - generic [aria-hidden] [ref=e545]: 
        - tab "Características" [disabled] [ref=e547]:
          - generic [aria-hidden] [ref=e548]: 
          - generic [aria-hidden] [ref=e550]: 
        - tab "Descrição" [disabled] [ref=e551]:
          - generic [aria-hidden] [ref=e552]: 
          - generic [aria-hidden] [ref=e554]: 
        - tab "Estoque e Precificação" [ref=e555] [cursor=pointer]:
          - generic [aria-hidden] [ref=e556]: 
        - tab "Variações" [ref=e558] [cursor=pointer]:
          - generic [aria-hidden] [ref=e559]: 
        - tab "Tributário / NF" [ref=e561] [cursor=pointer]:
          - generic [aria-hidden] [ref=e562]: 
      - generic [ref=e565]:
        - generic [ref=e566]:
          - generic [ref=e567]:
            - generic [ref=e568]: Origem do estoque *
            - combobox "Origem do estoque *" [ref=e569]:
              - option "Selecione" [selected]
              - option "Convencional"
              - option "Salvados"
              - option "Usados"
          - generic [ref=e570]:
            - generic [ref=e571]:
              - generic [ref=e572]:
                - generic [ref=e573]: Nome
                - generic [ref=e574]: "*"
              - button "Diferenciar Título no Catálogo" [ref=e575] [cursor=pointer]
            - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=e576]'
        - generic [ref=e578]:
          - generic [ref=e580]:
            - generic [ref=e581]:
              - generic [ref=e582]: Categoria(s)
              - generic [ref=e583]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=e584] [cursor=pointer]:
              - generic [ref=e585]: GERENCIAR
              - generic [ref=e586]: 
          - generic [ref=e588]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=e589]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=e591]:
          - generic [ref=e592]: Oportunidade
          - combobox [ref=e594]:
            - option "Nenhuma (Produto Convencional)" [selected]
            - option "Mega Liquidação"
            - option "Última Unidade - Mostruário"
        - generic [ref=e596]:
          - generic [ref=e597]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=e599]
      - generic [ref=e600]:
        - status [ref=e602]:
          - generic [aria-hidden] [ref=e603]: 
          - generic [ref=e604]: Salvamento automático
        - generic [ref=e605]:
          - button "Cancelar" [ref=e606] [cursor=pointer]
          - button "Próxima etapa " [ref=e607] [cursor=pointer]:
            - generic [ref=e608]: Próxima etapa
            - generic [ref=e609]: 
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
  4   |     const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
  5   |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  6   |     let consoleErrors: string[] = [];
  7   |     let pageErrors: string[] = [];
  8   | 
  9   |     async function openNewProduct(page: Page) {
  10  |         const optionsButton = page.locator('button[title="Opções"]').first();
  11  |         await expect(optionsButton).toBeVisible({ timeout: 15000 });
  12  |         await optionsButton.click();
  13  |         const newProductButton = page.getByRole('button', { name: 'Novo Produto' }).first();
  14  |         await expect(newProductButton).toBeVisible({ timeout: 5000 });
  15  |         await newProductButton.click();
  16  |     }
  17  | 
  18  |     test.beforeEach(async ({ page }) => {
  19  |         consoleErrors = [];
  20  |         pageErrors = [];
  21  | 
  22  |         page.on('console', msg => {
  23  |             if (msg.type() === 'error') {
  24  |                 consoleErrors.push(msg.text());
  25  |             }
  26  |         });
  27  | 
  28  |         page.on('pageerror', err => {
  29  |             pageErrors.push(err.message);
  30  |         });
  31  | 
  32  |         await page.goto(`/products?${AUTH_QUERY}`);
  33  |         await page.waitForLoadState('domcontentloaded');
  34  |     });
  35  | 
  36  |     test.afterEach(async ({ page }) => {
  37  |         const realErrors = consoleErrors.filter(e => 
  38  |             !e.includes('favicon') && 
  39  |             !e.includes('Download the React DevTools') &&
  40  |             !e.includes('net::ERR_CONNECTION_REFUSED') && !e.includes('404') && !e.includes('Not Found')
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
> 92  |         await variationsTabBtn.click();
      |                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  141 |         await page.locator('button:has-text("Variações")').first().click();
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
```