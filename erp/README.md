# MoranteHub ERP

Aplicação web do ERP MoranteHub, construída com React, TypeScript e Vite. As funções de API usadas pelo ERP são executadas pelo ambiente de desenvolvimento Vercel configurado na raiz do repositório.

## Desenvolvimento

Na raiz do repositório, inicie a pilha completa com:

```powershell
npm run dev
```

O ERP fica disponível em `http://localhost:5173` e a API em `http://localhost:3000`. O Vite usa `strictPort`; se a porta 5173 estiver ocupada, o servidor falha em vez de escolher outra porta.

## Build e verificações

```powershell
npm run build --prefix erp
npm run lint --prefix erp
```

O build gera os bundles das rotas fiscais e de atendimento antes de compilar o frontend. Não edite diretamente os arquivos gerados em `erp/server/`; altere a fonte em `api/` e gere os bundles com os scripts de build.

## Organização do código

- `erp/src/pages/App/`: módulos e telas do ERP.
- `erp/src/pages/utils/`: serviços, regras e componentes compartilhados pelo frontend.
- `api/`: handlers server-side das APIs.
- `erp/server/`: bundles gerados para execução local e implantação.
