# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 1: Criação de produto simples e geração automática da Variação 1 padrão
- Location: tests\e2e\products\products-variations-e2e.spec.ts:60:5

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
  7 × retrying click action
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
                - text:                                                                                                      
                - generic [ref=e22]:
                  - button " Variações (1) 004030 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin Cozinhas Moduladas e Compactas •  Multiloja Salvados" [ref=e23] [cursor=pointer]:
                    - generic [ref=e24]:
                      - generic [ref=e25]:
                        - button " Variações (1)" [ref=e26]:
                          - generic [ref=e27]: 
                          - generic [ref=e28]: Variações (1)
                        - generic [ref=e29]: "004030"
                      - generic [ref=e30]:
                        - generic "Status ERP derivado das variações" [ref=e32]:
                          - generic [ref=e33]:
                            - generic [ref=e34]: ERP
                            - generic [ref=e35]: Desativado
                        - generic [ref=e38]:
                          - generic [ref=e39]: 
                          - text: Rascunho
                        - generic [ref=e40]:
                          - generic [ref=e41]: 
                          - text: Queima dos Salvados
                        - generic [ref=e42]:
                          - button "Continuar Cadastramento" [ref=e43]:
                            - generic [ref=e44]: 
                          - button "Opções do produto" [ref=e45]:
                            - generic [ref=e46]: 
                    - generic [ref=e48]:
                      - heading "Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin" [level=3] [ref=e49]
                      - generic [ref=e50]:
                        - generic [ref=e51]: Cozinhas Moduladas e Compactas
                        - generic [ref=e52]: •
                        - generic [ref=e53]:
                          - generic [ref=e54]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad Status ERP derivado das variações Editar Produto Opções do produto Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml -" [ref=e55] [cursor=pointer]:
                    - generic [ref=e56]:
                      - generic [ref=e57]:
                        - button " Variações (1)" [ref=e58]:
                          - generic [ref=e59]: 
                          - generic [ref=e60]: Variações (1)
                        - generic [ref=e61]: TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad
                      - generic [ref=e62]:
                        - generic "Status ERP derivado das variações" [ref=e64]:
                          - generic [ref=e65]:
                            - generic [ref=e66]: ERP
                            - generic [ref=e67]: Ativo
                        - generic [ref=e70]:
                          - button "Editar Produto" [ref=e71]:
                            - generic [ref=e72]: 
                          - button "Opções do produto" [ref=e73]:
                            - generic [ref=e74]: 
                    - generic [ref=e76]:
                      - heading "Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml" [level=3] [ref=e77]
                      - generic [ref=e78]: "-"
                  - button " Variações (1) TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml -" [ref=e80] [cursor=pointer]:
                    - generic [ref=e81]:
                      - generic [ref=e82]:
                        - button " Variações (1)" [ref=e83]:
                          - generic [ref=e84]: 
                          - generic [ref=e85]: Variações (1)
                        - generic [ref=e86]: TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6
                      - generic [ref=e87]:
                        - generic "Status ERP derivado das variações" [ref=e89]:
                          - generic [ref=e90]:
                            - generic [ref=e91]: ERP
                            - generic [ref=e92]: Ativo
                        - generic [ref=e95]:
                          - button "Editar Produto" [ref=e96]:
                            - generic [ref=e97]: 
                          - button "Opções do produto" [ref=e98]:
                            - generic [ref=e99]: 
                    - generic [ref=e101]:
                      - heading "Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml" [level=3] [ref=e102]
                      - generic [ref=e103]: "-"
                  - button " Variações (1) TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml -" [ref=e105] [cursor=pointer]:
                    - generic [ref=e106]:
                      - generic [ref=e107]:
                        - button " Variações (1)" [ref=e108]:
                          - generic [ref=e109]: 
                          - generic [ref=e110]: Variações (1)
                        - generic [ref=e111]: TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4
                      - generic [ref=e112]:
                        - generic "Status ERP derivado das variações" [ref=e114]:
                          - generic [ref=e115]:
                            - generic [ref=e116]: ERP
                            - generic [ref=e117]: Ativo
                        - generic [ref=e120]:
                          - button "Editar Produto" [ref=e121]:
                            - generic [ref=e122]: 
                          - button "Opções do produto" [ref=e123]:
                            - generic [ref=e124]: 
                    - generic [ref=e126]:
                      - heading "Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml" [level=3] [ref=e127]
                      - generic [ref=e128]: "-"
                  - button " Variações (1) TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml -" [ref=e130] [cursor=pointer]:
                    - generic [ref=e131]:
                      - generic [ref=e132]:
                        - button " Variações (1)" [ref=e133]:
                          - generic [ref=e134]: 
                          - generic [ref=e135]: Variações (1)
                        - generic [ref=e136]: TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8
                      - generic [ref=e137]:
                        - generic "Status ERP derivado das variações" [ref=e139]:
                          - generic [ref=e140]:
                            - generic [ref=e141]: ERP
                            - generic [ref=e142]: Ativo
                        - generic [ref=e145]:
                          - button "Editar Produto" [ref=e146]:
                            - generic [ref=e147]: 
                          - button "Opções do produto" [ref=e148]:
                            - generic [ref=e149]: 
                    - generic [ref=e151]:
                      - heading "Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml" [level=3] [ref=e152]
                      - generic [ref=e153]: "-"
                  - button " Variações (1) CRI-000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7 -" [ref=e155] [cursor=pointer]:
                    - generic [ref=e156]:
                      - generic [ref=e157]:
                        - button " Variações (1)" [ref=e158]:
                          - generic [ref=e159]: 
                          - generic [ref=e160]: Variações (1)
                        - generic [ref=e161]: CRI-000001
                      - generic [ref=e162]:
                        - generic "Status ERP derivado das variações" [ref=e164]:
                          - generic [ref=e165]:
                            - generic [ref=e166]: ERP
                            - generic [ref=e167]: Desativado
                        - generic [ref=e170]:
                          - generic [ref=e171]: 
                          - text: Rascunho
                        - generic [ref=e172]:
                          - button "Continuar Cadastramento" [ref=e173]:
                            - generic [ref=e174]: 
                          - button "Opções do produto" [ref=e175]:
                            - generic [ref=e176]: 
                    - generic [ref=e178]:
                      - heading "[HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7" [level=3] [ref=e179]
                      - generic [ref=e180]: "-"
                  - button " Variações (1) 004029 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados Sofás •  Multiloja Salvados" [ref=e182] [cursor=pointer]:
                    - generic [ref=e183]:
                      - generic [ref=e184]:
                        - button " Variações (1)" [ref=e185]:
                          - generic [ref=e186]: 
                          - generic [ref=e187]: Variações (1)
                        - generic [ref=e188]: "004029"
                      - generic [ref=e189]:
                        - generic "Status ERP derivado das variações" [ref=e191]:
                          - generic [ref=e192]:
                            - generic [ref=e193]: ERP
                            - generic [ref=e194]: Desativado
                        - generic [ref=e197]:
                          - generic [ref=e198]: 
                          - text: Rascunho
                        - generic [ref=e199]:
                          - generic [ref=e200]: 
                          - text: Queima dos Salvados
                        - generic [ref=e201]:
                          - button "Continuar Cadastramento" [ref=e202]:
                            - generic [ref=e203]: 
                          - button "Opções do produto" [ref=e204]:
                            - generic [ref=e205]: 
                    - generic [ref=e207]:
                      - heading "Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados" [level=3] [ref=e208]
                      - generic [ref=e209]:
                        - generic [ref=e210]: Sofás
                        - generic [ref=e211]: •
                        - generic [ref=e212]:
                          - generic [ref=e213]: 
                          - text: Multiloja Salvados
                  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe" [ref=e214] [cursor=pointer]:
                    - generic [ref=e215]:
                      - generic [ref=e216]:
                        - button " Variações (2)" [ref=e217]:
                          - generic [ref=e218]: 
                          - generic [ref=e219]: Variações (2)
                        - generic [ref=e220]: "004004"
                      - generic [ref=e221]:
                        - generic "Status ERP derivado das variações" [ref=e223]:
                          - generic [ref=e224]:
                            - generic [ref=e225]: ERP
                            - generic [ref=e226]: Ativo
                        - generic [ref=e229]:
                          - button "Editar Produto" [ref=e230]:
                            - generic [ref=e231]: 
                          - button "Opções do produto" [ref=e232]:
                            - generic [ref=e233]: 
                    - generic [ref=e235]:
                      - heading "Estante Multiuso Open 56cm" [level=3] [ref=e236]
                      - generic [ref=e237]:
                        - generic [ref=e238]: Estantes | Armários Multiuso
                        - generic [ref=e239]: •
                        - generic [ref=e240]:
                          - generic [ref=e241]: 
                          - text: Movelipe
                  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados" [ref=e242] [cursor=pointer]:
                    - generic [ref=e243]:
                      - generic [ref=e244]:
                        - button " Variações (1)" [ref=e245]:
                          - generic [ref=e246]: 
                          - generic [ref=e247]: Variações (1)
                        - generic [ref=e248]: "004002"
                      - generic [ref=e249]:
                        - generic "Status ERP derivado das variações" [ref=e251]:
                          - generic [ref=e252]:
                            - generic [ref=e253]: ERP
                            - generic [ref=e254]: Desativado
                        - generic [ref=e257]:
                          - generic [ref=e258]: 
                          - text: Queima dos Salvados
                        - generic [ref=e259]:
                          - button "Editar Produto" [ref=e260]:
                            - generic [ref=e261]: 
                          - button "Opções do produto" [ref=e262]:
                            - generic [ref=e263]: 
                    - generic [ref=e265]:
                      - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3] [ref=e266]
                      - generic [ref=e267]:
                        - generic [ref=e268]: Sapateiras | Guarda-Roupas | Armários Multiuso
                        - generic [ref=e269]: •
                        - generic [ref=e270]:
                          - generic [ref=e271]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e272] [cursor=pointer]:
                    - generic [ref=e273]:
                      - generic [ref=e274]:
                        - button " Variações (1)" [ref=e275]:
                          - generic [ref=e276]: 
                          - generic [ref=e277]: Variações (1)
                        - generic [ref=e278]: "004001"
                      - generic [ref=e279]:
                        - generic "Status ERP derivado das variações" [ref=e281]:
                          - generic [ref=e282]:
                            - generic [ref=e283]: ERP
                            - generic [ref=e284]: Desativado
                        - generic [ref=e287]:
                          - generic [ref=e288]: 
                          - text: Queima dos Salvados
                        - generic [ref=e289]:
                          - button "Editar Produto" [ref=e290]:
                            - generic [ref=e291]: 
                          - button "Opções do produto" [ref=e292]:
                            - generic [ref=e293]: 
                    - generic [ref=e295]:
                      - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3] [ref=e296]
                      - generic [ref=e297]:
                        - generic [ref=e298]: Conjunto para Sala de Jantar
                        - generic [ref=e299]: •
                        - generic [ref=e300]:
                          - generic [ref=e301]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e302] [cursor=pointer]:
                    - generic [ref=e303]:
                      - generic [ref=e304]:
                        - button " Variações (1)" [ref=e305]:
                          - generic [ref=e306]: 
                          - generic [ref=e307]: Variações (1)
                        - generic [ref=e308]: "004000"
                      - generic [ref=e309]:
                        - generic "Status ERP derivado das variações" [ref=e311]:
                          - generic [ref=e312]:
                            - generic [ref=e313]: ERP
                            - generic [ref=e314]: Desativado
                        - generic [ref=e317]:
                          - generic [ref=e318]: 
                          - text: Queima dos Salvados
                        - generic [ref=e319]:
                          - button "Editar Produto" [ref=e320]:
                            - generic [ref=e321]: 
                          - button "Opções do produto" [ref=e322]:
                            - generic [ref=e323]: 
                    - generic [ref=e325]:
                      - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3] [ref=e326]
                      - generic [ref=e327]:
                        - generic [ref=e328]: Conjunto para Sala de Jantar
                        - generic [ref=e329]: •
                        - generic [ref=e330]:
                          - generic [ref=e331]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados" [ref=e332] [cursor=pointer]:
                    - generic [ref=e333]:
                      - generic [ref=e334]:
                        - button " Variações (1)" [ref=e335]:
                          - generic [ref=e336]: 
                          - generic [ref=e337]: Variações (1)
                        - generic [ref=e338]: "003999"
                      - generic [ref=e339]:
                        - generic "Status ERP derivado das variações" [ref=e341]:
                          - generic [ref=e342]:
                            - generic [ref=e343]: ERP
                            - generic [ref=e344]: Desativado
                        - generic [ref=e347]:
                          - generic [ref=e348]: 
                          - text: Queima dos Salvados
                        - generic [ref=e349]:
                          - button "Editar Produto" [ref=e350]:
                            - generic [ref=e351]: 
                          - button "Opções do produto" [ref=e352]:
                            - generic [ref=e353]: 
                    - generic [ref=e355]:
                      - heading "Base Bau Casal 1,38 Damulti Premium" [level=3] [ref=e356]
                      - generic [ref=e357]:
                        - generic [ref=e358]: Camas/Bases Box
                        - generic [ref=e359]: •
                        - generic [ref=e360]:
                          - generic [ref=e361]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados" [ref=e362] [cursor=pointer]:
                    - generic [ref=e363]:
                      - generic [ref=e364]:
                        - button " Variações (1)" [ref=e365]:
                          - generic [ref=e366]: 
                          - generic [ref=e367]: Variações (1)
                        - generic [ref=e368]: "003998"
                      - generic [ref=e369]:
                        - generic "Status ERP derivado das variações" [ref=e371]:
                          - generic [ref=e372]:
                            - generic [ref=e373]: ERP
                            - generic [ref=e374]: Desativado
                        - generic [ref=e377]:
                          - generic [ref=e378]: 
                          - text: Queima dos Salvados
                        - generic [ref=e379]:
                          - button "Editar Produto" [ref=e380]:
                            - generic [ref=e381]: 
                          - button "Opções do produto" [ref=e382]:
                            - generic [ref=e383]: 
                    - generic [ref=e385]:
                      - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3] [ref=e386]
                      - generic [ref=e387]:
                        - generic [ref=e388]: Guarda-Roupas
                        - generic [ref=e389]: •
                        - generic [ref=e390]:
                          - generic [ref=e391]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003997 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Colchão Queen 158 Castor Sleep Max D45 Colchões •  Multiloja Salvados" [ref=e392] [cursor=pointer]:
                    - generic [ref=e393]:
                      - generic [ref=e394]:
                        - button " Variações (1)" [ref=e395]:
                          - generic [ref=e396]: 
                          - generic [ref=e397]: Variações (1)
                        - generic [ref=e398]: "003997"
                      - generic [ref=e399]:
                        - generic "Status ERP derivado das variações" [ref=e401]:
                          - generic [ref=e402]:
                            - generic [ref=e403]: ERP
                            - generic [ref=e404]: Desativado
                        - generic [ref=e407]:
                          - generic [ref=e408]: 
                          - text: Queima dos Salvados
                        - generic [ref=e409]:
                          - button "Editar Produto" [ref=e410]:
                            - generic [ref=e411]: 
                          - button "Opções do produto" [ref=e412]:
                            - generic [ref=e413]: 
                    - generic [ref=e415]:
                      - heading "Colchão Queen 158 Castor Sleep Max D45" [level=3] [ref=e416]
                      - generic [ref=e417]:
                        - generic [ref=e418]: Colchões
                        - generic [ref=e419]: •
                        - generic [ref=e420]:
                          - generic [ref=e421]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003996 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e422] [cursor=pointer]:
                    - generic [ref=e423]:
                      - generic [ref=e424]:
                        - button " Variações (1)" [ref=e425]:
                          - generic [ref=e426]: 
                          - generic [ref=e427]: Variações (1)
                        - generic [ref=e428]: "003996"
                      - generic [ref=e429]:
                        - generic "Status ERP derivado das variações" [ref=e431]:
                          - generic [ref=e432]:
                            - generic [ref=e433]: ERP
                            - generic [ref=e434]: Desativado
                        - generic [ref=e437]:
                          - generic [ref=e438]: 
                          - text: Queima dos Salvados
                        - generic [ref=e439]:
                          - button "Editar Produto" [ref=e440]:
                            - generic [ref=e441]: 
                          - button "Opções do produto" [ref=e442]:
                            - generic [ref=e443]: 
                    - generic [ref=e445]:
                      - heading "Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia" [level=3] [ref=e446]
                      - generic [ref=e447]:
                        - generic [ref=e448]: Conjunto para Sala de Jantar
                        - generic [ref=e449]: •
                        - generic [ref=e450]:
                          - generic [ref=e451]: 
                          - text: Multiloja Salvados
              - generic [ref=e452]:
                - generic [ref=e453]:
                  - generic [ref=e454]: Página 1 · 273 itens no catálogo
                  - combobox [ref=e456]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=e457]:
                  - button "" [disabled] [ref=e458]
                  - button "1" [disabled] [ref=e462]
                  - button "2" [ref=e464] [cursor=pointer]
                  - button "" [ref=e465] [cursor=pointer]
            - generic [ref=e467]:
              - generic [ref=e468]:
                - button " Resumo dos Produtos " [ref=e469] [cursor=pointer]:
                  - generic [ref=e470]:
                    - generic [ref=e471]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=e473]
                  - generic [ref=e474]: 
                - generic [ref=e475]:
                  - tablist "Canal do resumo" [ref=e476]:
                    - tab "ERP" [selected] [ref=e477] [cursor=pointer]
                    - tab "Catálogo" [ref=e478] [cursor=pointer]
                  - button " Total de Cadastrados 297" [ref=e479] [cursor=pointer]:
                    - generic [ref=e480]:
                      - generic [ref=e481]: 
                      - generic [ref=e482]: Total de Cadastrados
                    - generic [ref=e483]: "297"
                  - generic [ref=e484]:
                    - button "Ativos 142" [ref=e485] [cursor=pointer]:
                      - generic [ref=e486]: Ativos
                      - generic [ref=e487]: "142"
                    - button "Desativados 155" [ref=e488] [cursor=pointer]:
                      - generic [ref=e489]: Desativados
                      - generic [ref=e490]: "155"
                    - button " Rascunhos (Em Cadastro) 2" [ref=e491] [cursor=pointer]:
                      - generic [ref=e492]:
                        - generic [ref=e493]: 
                        - generic [ref=e494]: Rascunhos (Em Cadastro)
                      - generic [ref=e495]: "2"
              - generic [ref=e496]:
                - button " Filtros " [ref=e497] [cursor=pointer]:
                  - generic [ref=e498]:
                    - generic [ref=e499]: 
                    - heading "Filtros" [level=4] [ref=e501]
                  - generic [ref=e502]: 
                - complementary "Filtros de produtos" [ref=e504]:
                  - generic [ref=e505]:
                    - generic [ref=e506]: Parâmetros
                    - generic [ref=e508]:
                      - generic [ref=e509]:
                        - generic [ref=e510]: Categoria
                        - combobox "Categoria" [ref=e511] [cursor=pointer]:
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
                      - generic [ref=e512]:
                        - generic [ref=e513]: Situação no ERP
                        - combobox "Situação no ERP" [ref=e514] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=e515]:
                        - generic [ref=e516]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=e517] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=e519] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e520]: 
                    - text: Limpar Filtros
      - generic [ref=e522]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e523] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=e525]
    - region "Notifications Alt+T"
  - dialog [ref=e528]:
    - button "Fechar formulário de produto" [ref=e529]
    - generic [ref=e530]:
      - generic [ref=e531]:
        - generic [ref=e532]:
          - heading "Cadastro de Produto" [level=2] [ref=e533]
          - generic [ref=e534]:
            - generic [ref=e535]: "ERP: Pendente"
            - generic [ref=e538]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=e541] [cursor=pointer]:
          - generic [aria-hidden] [ref=e542]: 
      - tablist "Abas do formulário de produto" [ref=e544]:
        - tab "Cadastro Geral" [selected] [ref=e545] [cursor=pointer]
        - tab "Fotos" [ref=e547] [cursor=pointer]:
          - generic [aria-hidden] [ref=e548]: 
        - tab "Características" [disabled] [ref=e550]:
          - generic [aria-hidden] [ref=e551]: 
          - generic [aria-hidden] [ref=e553]: 
        - tab "Descrição" [disabled] [ref=e554]:
          - generic [aria-hidden] [ref=e555]: 
          - generic [aria-hidden] [ref=e557]: 
        - tab "Estoque e Precificação" [ref=e558] [cursor=pointer]:
          - generic [aria-hidden] [ref=e559]: 
        - tab "Variações" [ref=e561] [cursor=pointer]:
          - generic [aria-hidden] [ref=e562]: 
        - tab "Tributário / NF" [ref=e564] [cursor=pointer]:
          - generic [aria-hidden] [ref=e565]: 
      - generic [ref=e568]:
        - generic [ref=e569]:
          - generic [ref=e570]:
            - generic [ref=e571]: Origem do estoque *
            - combobox "Origem do estoque *" [ref=e572]:
              - option "Selecione" [selected]
              - option "Convencional"
              - option "Salvados"
              - option "Usados"
          - generic [ref=e573]:
            - generic [ref=e574]:
              - generic [ref=e575]:
                - generic [ref=e576]: Nome
                - generic [ref=e577]: "*"
              - button "Diferenciar Título no Catálogo" [ref=e578] [cursor=pointer]
            - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=e579]'
        - generic [ref=e581]:
          - generic [ref=e583]:
            - generic [ref=e584]:
              - generic [ref=e585]: Categoria(s)
              - generic [ref=e586]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=e587] [cursor=pointer]:
              - generic [ref=e588]: GERENCIAR
              - generic [ref=e589]: 
          - generic [ref=e591]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=e592]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=e594]:
          - generic [ref=e595]: Oportunidade
          - combobox [ref=e597]:
            - option "Nenhuma (Produto Convencional)" [selected]
            - option "Mega Liquidação"
            - option "Última Unidade - Mostruário"
        - generic [ref=e599]:
          - generic [ref=e600]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=e602]
      - generic [ref=e603]:
        - status [ref=e605]:
          - generic [aria-hidden] [ref=e606]: 
          - generic [ref=e607]: Rascunho salvo
        - generic [ref=e608]:
          - button "Cancelar" [ref=e609] [cursor=pointer]
          - button "Próxima etapa " [ref=e610] [cursor=pointer]:
            - generic [ref=e611]: Próxima etapa
            - generic [ref=e612]: 
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
> 79  |         await variationsTabBtn.click();
      |                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
```