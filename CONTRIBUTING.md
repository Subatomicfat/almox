# Contribuindo com o ALMOX//CTRL

## Estrutura do monorepo

```
almox-ctrl/
├── backend/     # API Node.js/Express + PostgreSQL
├── frontend/    # React + Vite
├── docker-compose.yml   # orquestra tudo (raiz)
├── nginx.conf            # reverse proxy raiz
└── ARCHITECTURE.md, CHANGELOG.md, este arquivo
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat: adiciona filtro de status na listagem de ativos
fix: corrige cálculo de estoque faltante no relatório de reposição
docs: atualiza guia de migração com exemplo de planilha com aba única
refactor: extrai validação de placa para utils/masks
chore: atualiza dependências do frontend
```

Prefixos usados: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`perf`, `style`. Escopo opcional entre parênteses (`feat(products): ...`)
quando a mudança é claramente de uma área só.

## Antes de abrir um PR

- [ ] O código roda localmente (`npm run dev` no backend e no frontend,
      com o Postgres de pé) sem erros no console.
- [ ] Se a mudança toca uma regra de negócio (estoque, movimentação,
      RBAC), o comportamento foi testado manualmente nos casos de borda
      relevantes (ex: saída maior que o estoque, usuário sem permissão).
- [ ] Se a mudança adiciona uma tabela ou coluna, o `db/schema.sql` foi
      atualizado e o motivo está explicado num comentário, do mesmo jeito
      que o restante do arquivo já faz.
- [ ] Se a mudança adiciona um endpoint, ele foi adicionado também em
      `backend/src/docs/openapi.yaml` e em
      `backend/postman_collection.json` — a documentação que não
      acompanha o código apodrece rápido.
- [ ] Rodou `node --check` (ou o equivalente do seu editor) nos arquivos
      alterados — não existe pipeline de CI ainda bloqueando isso
      automaticamente (ver `.github/workflows/ci.yml`).

## Convenções de código

- **Backend**: sem ORM, SQL direto com `pg` e parâmetros posicionados
  (`$1, $2...`) — nunca concatenar valor de usuário na string da query.
  Cada tabela tem um `*.repository.js`; regra de negócio fica no
  `*.controller.js`, nunca no repository.
- **Frontend**: um arquivo por página em `src/pages/`; chamadas HTTP
  isoladas em `src/api/*.js` (a página nunca importa `axios` direto).
  Validação de formulário sempre via schema Yup em
  `src/utils/validationSchemas.js`, não inline no componente.
- **Erros**: no backend, lance `ApiError.badRequest(...)` (ou
  `.notFound`, `.conflict` etc.) em vez de `throw new Error(...)` — é
  isso que faz o `errorHandler` devolver o status HTTP certo.

## Reportando bugs

Inclua: o que você esperava, o que aconteceu, e — se envolver estoque —
o `id` do produto e da movimentação envolvidos. Isso poupa uma rodada
inteira de perguntas.
