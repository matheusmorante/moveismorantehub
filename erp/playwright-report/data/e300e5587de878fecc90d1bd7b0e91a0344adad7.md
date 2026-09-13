# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quick-register.spec.ts >> Cadastro Rápido de Produtos via NF-e (Modo A & Modo B) e Abas do Modal >> Modo B: Cadastro Rápido de Variação em Produto Pai Existente com Cor extraída
- Location: tests\e2e\assistant\cases\quick-register.spec.ts:54:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator
Call log:
  - navigating to "http://localhost:5174/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator", waiting until "load"

```

```
Error: page.evaluate: SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```