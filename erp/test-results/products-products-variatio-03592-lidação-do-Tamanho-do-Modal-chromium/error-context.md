# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal
- Location: tests\e2e\products\products-variations-e2e.spec.ts:108:5

# Error details

```
Test timeout of 30000ms exceeded.
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
      - <input placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." value="[teste_aut]_var_1790441772141 Guarda-Roupa de Casal com Espelho" class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <input placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." value="[teste_aut]_var_1790441772141 Guarda-Roupa de Casal com Espelho" class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
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
    - <input placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." value="[teste_aut]_var_1790441772141 Guarda-Roupa de Casal com Espelho" class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  7 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <input value="" placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
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
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <input value="" placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <input value="" placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..." class="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400"/> from <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="product-form-title" class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden">…</div> subtree intercepts pointer events
  2 × retrying click action
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
              - button " Mostrar desativados" [ref=e22] [cursor=pointer]:
                - generic [ref=e23]: 
                - text: Mostrar desativados
              - generic [ref=e24]:
                - text:                                                                                                      
                - generic [ref=e25]:
                  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe" [ref=e26] [cursor=pointer]:
                    - generic [ref=e27]:
                      - generic [ref=e28]:
                        - button " Variações (2)" [ref=e29]:
                          - generic [ref=e30]: 
                          - generic [ref=e31]: Variações (2)
                        - generic [ref=e32]: "004004"
                      - generic [ref=e33]:
                        - generic "Status ERP derivado das variações" [ref=e35]:
                          - generic [ref=e36]:
                            - generic [ref=e37]: ERP
                            - generic [ref=e38]: Ativo
                        - generic [ref=e41]:
                          - button "Editar Produto" [ref=e42]:
                            - generic [ref=e43]: 
                          - button "Opções do produto" [ref=e44]:
                            - generic [ref=e45]: 
                    - generic [ref=e47]:
                      - heading "Estante Multiuso Open 56cm" [level=3] [ref=e48]
                      - generic [ref=e49]:
                        - generic [ref=e50]: Estantes | Armários Multiuso
                        - generic [ref=e51]: •
                        - generic [ref=e52]:
                          - generic [ref=e53]: 
                          - text: Movelipe
                  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados" [ref=e54] [cursor=pointer]:
                    - generic [ref=e55]:
                      - generic [ref=e56]:
                        - button " Variações (1)" [ref=e57]:
                          - generic [ref=e58]: 
                          - generic [ref=e59]: Variações (1)
                        - generic [ref=e60]: "004002"
                      - generic [ref=e61]:
                        - generic "Status ERP derivado das variações" [ref=e63]:
                          - generic [ref=e64]:
                            - generic [ref=e65]: ERP
                            - generic [ref=e66]: Ativo
                        - generic [ref=e69]:
                          - generic [ref=e70]: 
                          - text: Queima dos Salvados
                        - generic [ref=e71]:
                          - button "Editar Produto" [ref=e72]:
                            - generic [ref=e73]: 
                          - button "Opções do produto" [ref=e74]:
                            - generic [ref=e75]: 
                    - generic [ref=e77]:
                      - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3] [ref=e78]
                      - generic [ref=e79]:
                        - generic [ref=e80]: Sapateiras | Guarda-Roupas | Armários Multiuso
                        - generic [ref=e81]: •
                        - generic [ref=e82]:
                          - generic [ref=e83]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e84] [cursor=pointer]:
                    - generic [ref=e85]:
                      - generic [ref=e86]:
                        - button " Variações (1)" [ref=e87]:
                          - generic [ref=e88]: 
                          - generic [ref=e89]: Variações (1)
                        - generic [ref=e90]: "004001"
                      - generic [ref=e91]:
                        - generic "Status ERP derivado das variações" [ref=e93]:
                          - generic [ref=e94]:
                            - generic [ref=e95]: ERP
                            - generic [ref=e96]: Ativo
                        - generic [ref=e99]:
                          - generic [ref=e100]: 
                          - text: Queima dos Salvados
                        - generic [ref=e101]:
                          - button "Editar Produto" [ref=e102]:
                            - generic [ref=e103]: 
                          - button "Opções do produto" [ref=e104]:
                            - generic [ref=e105]: 
                    - generic [ref=e107]:
                      - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3] [ref=e108]
                      - generic [ref=e109]:
                        - generic [ref=e110]: Conjunto para Sala de Jantar
                        - generic [ref=e111]: •
                        - generic [ref=e112]:
                          - generic [ref=e113]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e114] [cursor=pointer]:
                    - generic [ref=e115]:
                      - generic [ref=e116]:
                        - button " Variações (1)" [ref=e117]:
                          - generic [ref=e118]: 
                          - generic [ref=e119]: Variações (1)
                        - generic [ref=e120]: "004000"
                      - generic [ref=e121]:
                        - generic "Status ERP derivado das variações" [ref=e123]:
                          - generic [ref=e124]:
                            - generic [ref=e125]: ERP
                            - generic [ref=e126]: Ativo
                        - generic [ref=e129]:
                          - generic [ref=e130]: 
                          - text: Queima dos Salvados
                        - generic [ref=e131]:
                          - button "Editar Produto" [ref=e132]:
                            - generic [ref=e133]: 
                          - button "Opções do produto" [ref=e134]:
                            - generic [ref=e135]: 
                    - generic [ref=e137]:
                      - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3] [ref=e138]
                      - generic [ref=e139]:
                        - generic [ref=e140]: Conjunto para Sala de Jantar
                        - generic [ref=e141]: •
                        - generic [ref=e142]:
                          - generic [ref=e143]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados" [ref=e144] [cursor=pointer]:
                    - generic [ref=e145]:
                      - generic [ref=e146]:
                        - button " Variações (1)" [ref=e147]:
                          - generic [ref=e148]: 
                          - generic [ref=e149]: Variações (1)
                        - generic [ref=e150]: "003999"
                      - generic [ref=e151]:
                        - generic "Status ERP derivado das variações" [ref=e153]:
                          - generic [ref=e154]:
                            - generic [ref=e155]: ERP
                            - generic [ref=e156]: Ativo
                        - generic [ref=e159]:
                          - generic [ref=e160]: 
                          - text: Queima dos Salvados
                        - generic [ref=e161]:
                          - button "Editar Produto" [ref=e162]:
                            - generic [ref=e163]: 
                          - button "Opções do produto" [ref=e164]:
                            - generic [ref=e165]: 
                    - generic [ref=e167]:
                      - heading "Base Bau Casal 1,38 Damulti Premium" [level=3] [ref=e168]
                      - generic [ref=e169]:
                        - generic [ref=e170]: Camas/Bases Box
                        - generic [ref=e171]: •
                        - generic [ref=e172]:
                          - generic [ref=e173]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados" [ref=e174] [cursor=pointer]:
                    - generic [ref=e175]:
                      - generic [ref=e176]:
                        - button " Variações (1)" [ref=e177]:
                          - generic [ref=e178]: 
                          - generic [ref=e179]: Variações (1)
                        - generic [ref=e180]: "003998"
                      - generic [ref=e181]:
                        - generic "Status ERP derivado das variações" [ref=e183]:
                          - generic [ref=e184]:
                            - generic [ref=e185]: ERP
                            - generic [ref=e186]: Ativo
                        - generic [ref=e189]:
                          - generic [ref=e190]: 
                          - text: Queima dos Salvados
                        - generic [ref=e191]:
                          - button "Editar Produto" [ref=e192]:
                            - generic [ref=e193]: 
                          - button "Opções do produto" [ref=e194]:
                            - generic [ref=e195]: 
                    - generic [ref=e197]:
                      - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3] [ref=e198]
                      - generic [ref=e199]:
                        - generic [ref=e200]: Guarda-Roupas
                        - generic [ref=e201]: •
                        - generic [ref=e202]:
                          - generic [ref=e203]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003997 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Colchão Queen 158 Castor Sleep Max D45 Colchões •  Multiloja Salvados" [ref=e204] [cursor=pointer]:
                    - generic [ref=e205]:
                      - generic [ref=e206]:
                        - button " Variações (1)" [ref=e207]:
                          - generic [ref=e208]: 
                          - generic [ref=e209]: Variações (1)
                        - generic [ref=e210]: "003997"
                      - generic [ref=e211]:
                        - generic "Status ERP derivado das variações" [ref=e213]:
                          - generic [ref=e214]:
                            - generic [ref=e215]: ERP
                            - generic [ref=e216]: Ativo
                        - generic [ref=e219]:
                          - generic [ref=e220]: 
                          - text: Queima dos Salvados
                        - generic [ref=e221]:
                          - button "Editar Produto" [ref=e222]:
                            - generic [ref=e223]: 
                          - button "Opções do produto" [ref=e224]:
                            - generic [ref=e225]: 
                    - generic [ref=e227]:
                      - heading "Colchão Queen 158 Castor Sleep Max D45" [level=3] [ref=e228]
                      - generic [ref=e229]:
                        - generic [ref=e230]: Colchões
                        - generic [ref=e231]: •
                        - generic [ref=e232]:
                          - generic [ref=e233]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003996 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia Conjunto para Sala de Jantar •  Multiloja Salvados" [ref=e234] [cursor=pointer]:
                    - generic [ref=e235]:
                      - generic [ref=e236]:
                        - button " Variações (1)" [ref=e237]:
                          - generic [ref=e238]: 
                          - generic [ref=e239]: Variações (1)
                        - generic [ref=e240]: "003996"
                      - generic [ref=e241]:
                        - generic "Status ERP derivado das variações" [ref=e243]:
                          - generic [ref=e244]:
                            - generic [ref=e245]: ERP
                            - generic [ref=e246]: Ativo
                        - generic [ref=e249]:
                          - generic [ref=e250]: 
                          - text: Queima dos Salvados
                        - generic [ref=e251]:
                          - button "Editar Produto" [ref=e252]:
                            - generic [ref=e253]: 
                          - button "Opções do produto" [ref=e254]:
                            - generic [ref=e255]: 
                    - generic [ref=e257]:
                      - heading "Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia" [level=3] [ref=e258]
                      - generic [ref=e259]:
                        - generic [ref=e260]: Conjunto para Sala de Jantar
                        - generic [ref=e261]: •
                        - generic [ref=e262]:
                          - generic [ref=e263]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003995 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Jaffar 3 Lugares 2,00 M Sofás •  Multiloja Salvados" [ref=e264] [cursor=pointer]:
                    - generic [ref=e265]:
                      - generic [ref=e266]:
                        - button " Variações (1)" [ref=e267]:
                          - generic [ref=e268]: 
                          - generic [ref=e269]: Variações (1)
                        - generic [ref=e270]: "003995"
                      - generic [ref=e271]:
                        - generic "Status ERP derivado das variações" [ref=e273]:
                          - generic [ref=e274]:
                            - generic [ref=e275]: ERP
                            - generic [ref=e276]: Ativo
                        - generic [ref=e279]:
                          - generic [ref=e280]: 
                          - text: Queima dos Salvados
                        - generic [ref=e281]:
                          - button "Editar Produto" [ref=e282]:
                            - generic [ref=e283]: 
                          - button "Opções do produto" [ref=e284]:
                            - generic [ref=e285]: 
                    - generic [ref=e287]:
                      - heading "Sofá Woodx Jaffar 3 Lugares 2,00 M" [level=3] [ref=e288]
                      - generic [ref=e289]:
                        - generic [ref=e290]: Sofás
                        - generic [ref=e291]: •
                        - generic [ref=e292]:
                          - generic [ref=e293]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003994 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec Guarda-Roupas •  Multiloja Salvados" [ref=e294] [cursor=pointer]:
                    - generic [ref=e295]:
                      - generic [ref=e296]:
                        - button " Variações (1)" [ref=e297]:
                          - generic [ref=e298]: 
                          - generic [ref=e299]: Variações (1)
                        - generic [ref=e300]: "003994"
                      - generic [ref=e301]:
                        - generic "Status ERP derivado das variações" [ref=e303]:
                          - generic [ref=e304]:
                            - generic [ref=e305]: ERP
                            - generic [ref=e306]: Ativo
                        - generic [ref=e309]:
                          - generic [ref=e310]: 
                          - text: Queima dos Salvados
                        - generic [ref=e311]:
                          - button "Editar Produto" [ref=e312]:
                            - generic [ref=e313]: 
                          - button "Opções do produto" [ref=e314]:
                            - generic [ref=e315]: 
                    - generic [ref=e317]:
                      - heading "Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec" [level=3] [ref=e318]
                      - generic [ref=e319]:
                        - generic [ref=e320]: Guarda-Roupas
                        - generic [ref=e321]: •
                        - generic [ref=e322]:
                          - generic [ref=e323]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003993 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Faimec Portugal 2 Portas Guarda-Roupas •  Multiloja Salvados" [ref=e324] [cursor=pointer]:
                    - generic [ref=e325]:
                      - generic [ref=e326]:
                        - button " Variações (1)" [ref=e327]:
                          - generic [ref=e328]: 
                          - generic [ref=e329]: Variações (1)
                        - generic [ref=e330]: "003993"
                      - generic [ref=e331]:
                        - generic "Status ERP derivado das variações" [ref=e333]:
                          - generic [ref=e334]:
                            - generic [ref=e335]: ERP
                            - generic [ref=e336]: Ativo
                        - generic [ref=e339]:
                          - generic [ref=e340]: 
                          - text: Queima dos Salvados
                        - generic [ref=e341]:
                          - button "Editar Produto" [ref=e342]:
                            - generic [ref=e343]: 
                          - button "Opções do produto" [ref=e344]:
                            - generic [ref=e345]: 
                    - generic [ref=e347]:
                      - heading "Guarda Roupa Faimec Portugal 2 Portas" [level=3] [ref=e348]
                      - generic [ref=e349]:
                        - generic [ref=e350]: Guarda-Roupas
                        - generic [ref=e351]: •
                        - generic [ref=e352]:
                          - generic [ref=e353]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003992 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Star New 4pt 80cm Paneleiros •  Multiloja Salvados" [ref=e354] [cursor=pointer]:
                    - generic [ref=e355]:
                      - generic [ref=e356]:
                        - button " Variações (1)" [ref=e357]:
                          - generic [ref=e358]: 
                          - generic [ref=e359]: Variações (1)
                        - generic [ref=e360]: "003992"
                      - generic [ref=e361]:
                        - generic "Status ERP derivado das variações" [ref=e363]:
                          - generic [ref=e364]:
                            - generic [ref=e365]: ERP
                            - generic [ref=e366]: Ativo
                        - generic [ref=e369]:
                          - generic [ref=e370]: 
                          - text: Queima dos Salvados
                        - generic [ref=e371]:
                          - button "Editar Produto" [ref=e372]:
                            - generic [ref=e373]: 
                          - button "Opções do produto" [ref=e374]:
                            - generic [ref=e375]: 
                    - generic [ref=e377]:
                      - heading "Paneleiro Telasul Star New 4pt 80cm" [level=3] [ref=e378]
                      - generic [ref=e379]:
                        - generic [ref=e380]: Paneleiros
                        - generic [ref=e381]: •
                        - generic [ref=e382]:
                          - generic [ref=e383]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003991 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cabeceira Jsw Amanda 1,58 M Cabeceiras •  Multiloja Salvados" [ref=e384] [cursor=pointer]:
                    - generic [ref=e385]:
                      - generic [ref=e386]:
                        - button " Variações (1)" [ref=e387]:
                          - generic [ref=e388]: 
                          - generic [ref=e389]: Variações (1)
                        - generic [ref=e390]: "003991"
                      - generic [ref=e391]:
                        - generic "Status ERP derivado das variações" [ref=e393]:
                          - generic [ref=e394]:
                            - generic [ref=e395]: ERP
                            - generic [ref=e396]: Ativo
                        - generic [ref=e399]:
                          - generic [ref=e400]: 
                          - text: Queima dos Salvados
                        - generic [ref=e401]:
                          - button "Editar Produto" [ref=e402]:
                            - generic [ref=e403]: 
                          - button "Opções do produto" [ref=e404]:
                            - generic [ref=e405]: 
                    - generic [ref=e407]:
                      - heading "Cabeceira Jsw Amanda 1,58 M" [level=3] [ref=e408]
                      - generic [ref=e409]:
                        - generic [ref=e410]: Cabeceiras
                        - generic [ref=e411]: •
                        - generic [ref=e412]:
                          - generic [ref=e413]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003990 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Khalifa 4lug 2,50 M Veludo Sofás •  Multiloja Salvados" [ref=e414] [cursor=pointer]:
                    - generic [ref=e415]:
                      - generic [ref=e416]:
                        - button " Variações (1)" [ref=e417]:
                          - generic [ref=e418]: 
                          - generic [ref=e419]: Variações (1)
                        - generic [ref=e420]: "003990"
                      - generic [ref=e421]:
                        - generic "Status ERP derivado das variações" [ref=e423]:
                          - generic [ref=e424]:
                            - generic [ref=e425]: ERP
                            - generic [ref=e426]: Ativo
                        - generic [ref=e429]:
                          - generic [ref=e430]: 
                          - text: Queima dos Salvados
                        - generic [ref=e431]:
                          - button "Editar Produto" [ref=e432]:
                            - generic [ref=e433]: 
                          - button "Opções do produto" [ref=e434]:
                            - generic [ref=e435]: 
                    - generic [ref=e437]:
                      - heading "Sofá Woodx Khalifa 4lug 2,50 M Veludo" [level=3] [ref=e438]
                      - generic [ref=e439]:
                        - generic [ref=e440]: Sofás
                        - generic [ref=e441]: •
                        - generic [ref=e442]:
                          - generic [ref=e443]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003989 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Lumina 2pt 50cm Paneleiros •  Multiloja Salvados" [ref=e444] [cursor=pointer]:
                    - generic [ref=e445]:
                      - generic [ref=e446]:
                        - button " Variações (1)" [ref=e447]:
                          - generic [ref=e448]: 
                          - generic [ref=e449]: Variações (1)
                        - generic [ref=e450]: "003989"
                      - generic [ref=e451]:
                        - generic "Status ERP derivado das variações" [ref=e453]:
                          - generic [ref=e454]:
                            - generic [ref=e455]: ERP
                            - generic [ref=e456]: Ativo
                        - generic [ref=e459]:
                          - generic [ref=e460]: 
                          - text: Queima dos Salvados
                        - generic [ref=e461]:
                          - button "Editar Produto" [ref=e462]:
                            - generic [ref=e463]: 
                          - button "Opções do produto" [ref=e464]:
                            - generic [ref=e465]: 
                    - generic [ref=e467]:
                      - heading "Paneleiro Telasul Lumina 2pt 50cm" [level=3] [ref=e468]
                      - generic [ref=e469]:
                        - generic [ref=e470]: Paneleiros
                        - generic [ref=e471]: •
                        - generic [ref=e472]:
                          - generic [ref=e473]: 
                          - text: Multiloja Salvados
              - generic [ref=e474]:
                - generic [ref=e475]:
                  - generic [ref=e476]: Página 1 · 150 itens no catálogo
                  - combobox [ref=e478]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=e479]:
                  - button "" [disabled] [ref=e480]
                  - button "1" [disabled] [ref=e484]
                  - button "2" [ref=e486] [cursor=pointer]
                  - button "" [ref=e487] [cursor=pointer]
            - generic [ref=e489]:
              - generic [ref=e490]:
                - button " Resumo dos Produtos " [ref=e491] [cursor=pointer]:
                  - generic [ref=e492]:
                    - generic [ref=e493]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=e495]
                  - generic [ref=e496]: 
                - generic [ref=e497]:
                  - button " Total de Cadastrados 297" [ref=e498] [cursor=pointer]:
                    - generic [ref=e499]:
                      - generic [ref=e500]: 
                      - generic [ref=e501]: Total de Cadastrados
                    - generic [ref=e502]: "297"
                  - generic [ref=e503]:
                    - button "Publicados 170" [ref=e504] [cursor=pointer]:
                      - generic [ref=e505]: Publicados
                      - generic [ref=e506]: "170"
                    - button "Desativados 22" [ref=e507] [cursor=pointer]:
                      - generic [ref=e508]: Desativados
                      - generic [ref=e509]: "22"
                    - button " Rascunhos (Em Cadastro) 0" [ref=e510] [cursor=pointer]:
                      - generic [ref=e511]:
                        - generic [ref=e512]: 
                        - generic [ref=e513]: Rascunhos (Em Cadastro)
                      - generic [ref=e514]: "0"
              - generic [ref=e515]:
                - button " Filtros " [ref=e516] [cursor=pointer]:
                  - generic [ref=e517]:
                    - generic [ref=e518]: 
                    - heading "Filtros" [level=4] [ref=e520]
                  - generic [ref=e521]: 
                - complementary "Filtros de produtos" [ref=e523]:
                  - generic [ref=e524]:
                    - generic [ref=e525]: Parâmetros
                    - generic [ref=e527]:
                      - generic [ref=e528]:
                        - generic [ref=e529]: Categoria
                        - combobox "Categoria" [ref=e530] [cursor=pointer]:
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
                      - generic [ref=e531]:
                        - generic [ref=e532]: Situação no ERP
                        - combobox "Situação no ERP" [ref=e533] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=e534]:
                        - generic [ref=e535]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=e536] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=e538] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e539]: 
                    - text: Limpar Filtros
      - generic [ref=e541]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e542] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=e544]
    - region "Notifications Alt+T"
  - dialog [ref=e547]:
    - button "Fechar formulário de produto" [ref=e548]
    - generic [ref=e549]:
      - generic [ref=e550]:
        - generic [ref=e551]:
          - heading "Cadastro de Produto" [level=2] [ref=e552]
          - generic [ref=e553]:
            - generic [ref=e554]: "ERP: Pendente"
            - generic [ref=e557]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=e560] [cursor=pointer]:
          - generic [aria-hidden] [ref=e561]: 
      - tablist "Abas do formulário de produto" [ref=e563]:
        - tab "Cadastro Geral" [selected] [ref=e564] [cursor=pointer]
        - tab "Fotos" [ref=e566] [cursor=pointer]:
          - generic [aria-hidden] [ref=e567]: 
        - tab "Características" [disabled] [ref=e569]:
          - generic [aria-hidden] [ref=e570]: 
          - generic [aria-hidden] [ref=e572]: 
        - tab "Descrição" [disabled] [ref=e573]:
          - generic [aria-hidden] [ref=e574]: 
          - generic [aria-hidden] [ref=e576]: 
        - tab "Estoque e Precificação" [ref=e577] [cursor=pointer]:
          - generic [aria-hidden] [ref=e578]: 
        - tab "Variações" [ref=e580] [cursor=pointer]:
          - generic [aria-hidden] [ref=e581]: 
        - tab "Tributário / NF" [ref=e583] [cursor=pointer]:
          - generic [aria-hidden] [ref=e584]: 
      - generic [ref=e587]:
        - generic [ref=e589]:
          - generic [ref=e590]:
            - generic [ref=e591]:
              - generic [ref=e592]: Nome
              - generic [ref=e593]: "*"
            - button "Diferenciar Título no Catálogo" [ref=e594] [cursor=pointer]
          - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=e595]'
        - generic [ref=e597]:
          - generic [ref=e599]:
            - generic [ref=e600]:
              - generic [ref=e601]: Categoria(s)
              - generic [ref=e602]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=e603] [cursor=pointer]:
              - generic [ref=e604]: GERENCIAR
              - generic [ref=e605]: 
          - generic [ref=e607]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=e608]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=e610]:
          - generic [ref=e611]: Oportunidade
          - combobox [ref=e613]:
            - option "Nenhuma (Produto Normal)" [selected]
            - option "Mega Liquidação"
            - option "Queima dos Salvados"
            - option "Última Unidade - Mostruário"
        - generic [ref=e615]:
          - generic [ref=e616]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=e618]
      - generic [ref=e619]:
        - button " Salvar rascunho" [disabled] [ref=e621]:
          - generic [ref=e622]: 
          - generic [ref=e623]: Salvar rascunho
        - generic [ref=e624]:
          - button "Cancelar" [ref=e625] [cursor=pointer]
          - button "Próxima etapa " [ref=e626] [cursor=pointer]:
            - generic [ref=e627]: Próxima etapa
            - generic [ref=e628]: 
```

# Test source

```ts
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
> 117 |         await page.locator('button:has-text("Variações")').first().click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
```