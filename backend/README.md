# ALMOX//CTRL — Backend

API do sistema de controle de estoque (Frota, Comodato, Insumos de Produção
e Manutenção Industrial). Substitui o `localStorage` do frontend de
demonstração por um backend real com PostgreSQL, autenticação JWT, RBAC
e log de auditoria.

## Stack

- **Node.js 18+** com **Express** (arquitetura em camadas: routes → controllers → repositories → banco)
- **PostgreSQL 16** com queries parametrizadas via `pg` (sem ORM — ver "Por que sem ORM" abaixo)
- **JWT** (access token de curta duração + refresh token rotativo em cookie httpOnly)
- **bcryptjs** para hash de senha (10 rounds)
- **Docker Compose** (API + banco + Redis + Nginx)
- **Redis** para cache de dashboard (5 min) e listagens de produtos/veículos (10 min, invalidado por versão a cada mutação) — opcional: se cair ou não estiver configurado, a API funciona normalmente sem cache (ver `src/utils/cache.js`)

### Por que sem ORM
O prompt original sugeria Prisma/Sequelize/TypeORM. Optei por SQL direto
com `pg` porque: (1) o volume de dados é pequeno (~1.500 itens + histórico
de movimentações), não há ganho de performance relevante de um ORM aqui;
(2) fica mais fácil auditar exatamente o que cada query faz — importante
num sistema onde manter o saldo do estoque correto é a prioridade #1; e
(3) remove uma camada de dependência a menos para o time manter. Se o
projeto crescer (múltiplas equipes, muitas entidades novas), migrar para
Prisma é uma refatoração incremental, não um reescrever do zero — os
repositories já isolam todo o acesso a dados.

## Estrutura de pastas

```
backend/                      (dentro do monorepo almox-ctrl/)
├── db/
│   ├── schema.sql          # DDL completo (tabelas, triggers, view)
│   ├── migrate.js          # aplica schema.sql no banco
│   └── seed.js             # cria usuário admin inicial + dados de exemplo
├── src/
│   ├── config/
│   │   ├── env.js          # variáveis de ambiente centralizadas e validadas
│   │   └── database.js     # pool do PostgreSQL + helper withTransaction()
│   ├── middlewares/
│   │   ├── auth.middleware.js        # exige JWT válido
│   │   ├── rbac.middleware.js        # authorize('admin', 'gestor', ...)
│   │   ├── errorHandler.middleware.js
│   │   ├── rateLimiter.middleware.js # geral + login (anti brute-force)
│   │   └── validate.middleware.js    # processa express-validator
│   ├── utils/
│   │   ├── ApiError.js, asyncHandler.js, jwt.js, password.js, logger.js
│   ├── repositories/        # única camada que fala SQL
│   ├── controllers/         # regra de negócio e orquestração
│   ├── validators/          # regras de validação por entidade (express-validator)
│   ├── routes/               # define método HTTP + middlewares + controller
│   ├── docs/openapi.yaml    # Swagger (endpoints principais como referência)
│   ├── app.js                # monta o Express (helmet, cors, rotas, etc.)
│   └── server.js             # entry point + shutdown gracioso
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .env.example
├── MIGRATION_GUIDE.md
├── DEPLOY_CHECKLIST.md
└── postman_collection.json
```

## Setup local (sem Docker)

Pré-requisitos: Node.js 18+, PostgreSQL 14+ rodando localmente.

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env: defina DB_*, JWT_*_SECRET (gere com o comando abaixo) e
# SEED_ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Criar o banco (se ainda não existir)
createdb almox_ctrl

# 4. Aplicar o schema
npm run migrate

# 5. Criar o usuário admin inicial + dados de exemplo
npm run seed

# 6. Rodar em modo desenvolvimento (reinicia sozinho a cada alteração)
npm run dev
```

A API sobe em `http://localhost:3000`. Teste rapidamente:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

Documentação interativa (Swagger): `http://localhost:3000/api/docs`

## Setup com Docker Compose

Este backend faz parte do monorepo `almox-ctrl/` — o `docker-compose.yml`
que orquestra banco, cache, API, frontend e reverse proxy vive na **raiz**
do monorepo, não aqui dentro. Ver `../README.md` e `../docker-compose.yml`.

```bash
cd ..   # volta para a raiz do monorepo (almox-ctrl/)
cp backend/.env.example backend/.env
# edite backend/.env normalmente

docker compose up -d --build

docker compose exec api npm run migrate
docker compose exec api npm run seed
```

A aplicação completa fica acessível em `http://localhost` (porta 80,
via Nginx) — a API sozinha também responde em `http://localhost:3000`
para depuração direta.

## Autenticação — fluxo resumido

1. `POST /api/auth/login` com `{ email, senha }` → retorna `accessToken`
   no corpo da resposta e grava o `refreshToken` num cookie `httpOnly`.
2. Envie o `accessToken` em todas as chamadas protegidas:
   `Authorization: Bearer <accessToken>`.
3. Quando o access token expirar (15 min por padrão), chame
   `POST /api/auth/refresh-token` (o cookie é enviado automaticamente
   pelo navegador) para obter um novo `accessToken`. O refresh token
   é **rotacionado** a cada uso — o antigo é revogado.
4. `POST /api/auth/logout` revoga o refresh token atual.

## RBAC — quem pode o quê

| Ação                                   | admin | gestor | operador | visualizador |
|-----------------------------------------|:-----:|:------:|:--------:|:------------:|
| Ler produtos/veículos/ativos/relatórios |  ✅   |   ✅   |    ✅    |      ✅      |
| Criar/editar produtos, veículos, ativos |  ✅   |   ✅   |    ❌    |      ❌      |
| Importar CSV de produtos                |  ✅   |   ✅   |    ❌    |      ❌      |
| Registrar movimentação (entrada/saída)  |  ✅   |   ✅   |    ✅    |      ❌      |
| Corrigir movimentação (ajuste)          |  ✅   |   ✅   |    ❌    |      ❌      |
| Gerenciar usuários                      |  ✅   |   ❌   |    ❌    |      ❌      |

## Principais endpoints

Ver `src/docs/openapi.yaml` (Swagger em `/api/docs`) e
`postman_collection.json` para o conjunto completo com exemplos.
Resumo:

```
POST   /api/auth/login
POST   /api/auth/register          (admin)
POST   /api/auth/refresh-token
POST   /api/auth/logout

GET    /api/products               ?categoria=&estoque_baixo=&busca=&page=&limit=
POST   /api/products               (admin, gestor)
POST   /api/products/import-csv    (admin, gestor) multipart/form-data, campo "file"
GET    /api/products/estoque-baixo

GET    /api/vehicles
GET    /api/vehicles/:id/consumo
POST   /api/vehicles               (admin, gestor)

GET    /api/assets                 ?status=&tipo=&localizacao=
POST   /api/assets                 (admin, gestor)

GET    /api/movements              ?data_inicio=&data_fim=&tipo=&categoria=
POST   /api/movements              (admin, gestor, operador)
PUT    /api/movements/:id          (admin, gestor) — cria movimentação de ajuste

GET    /api/reports/consumo-veiculo?placa=ABC1234
GET    /api/reports/consumo-categoria?data_inicio=&data_fim=
GET    /api/reports/estoque-baixo
GET    /api/reports/atividade-usuario
POST   /api/reports/export-csv

GET    /api/dashboard/stats
```

## Decisões de negócio importantes

- **Estoque nunca é editado diretamente.** O campo `estoque_atual` só
  muda através de uma movimentação (trigger no banco). Isso garante que
  todo aumento/redução tenha uma linha em `movements` explicando por quê.
- **Movimentações não são excluídas nem editadas.** Um erro de digitação
  é corrigido criando uma nova movimentação de ajuste
  (`PUT /api/movements/:id`), com justificativa obrigatória, referenciando
  a original via `adjustment_of`. O histórico completo fica sempre visível.
- **Concorrência**: ao registrar uma movimentação, a linha do produto é
  travada (`SELECT ... FOR UPDATE`) dentro de uma transaction antes de
  validar o saldo — evita que duas saídas simultâneas, cada uma vendo o
  saldo "antigo", deixem o estoque negativo.
- **Exclusão é sempre soft delete** (campo `ativo`), tanto em produtos
  quanto usuários — preserva a integridade referencial do histórico.

## Testes

```bash
npm test          # roda a suíte uma vez (Jest)
npm run test:watch
```

A suíte cobre `backend/tests/`:
- **Unitários**: `password`, `jwt`, `ApiError`, e — o mais importante —
  `movement.repository`, que testa a regra de negócio mais sensível do
  sistema (saída maior que o estoque é rejeitada, o limite exato passa,
  produto inexistente/inativo é rejeitado, ajuste sempre cria uma nova
  movimentação em vez de editar a original) usando um `client` de banco
  simulado, sem precisar de um Postgres real.
- **Integração**: `auth` (login válido/inválido, validação 422) e
  `rbac` (401 sem token, 403 com papel errado, token expirado) via
  Supertest contra o `app.js` real, com os repositories mockados.

**Limite honesto de escopo**: isto não é "80% de cobertura" — é o
essencial (a regra de estoque, autenticação, RBAC) testado de forma
real. Não há testes E2E (Cypress/Playwright) nem de carga (k6) ainda.
Também não testamos o cenário de rate-limit do login "estourar depois
de N tentativas", porque o limiter guarda estado em memória por IP
durante toda a execução do arquivo de teste — isso exigiria tornar a
janela/limite injetável por ambiente, o que ainda não foi feito.

## O que NÃO está implementado nesta entrega (e por quê)

O prompt original pedia um sistema enterprise completo. A maior parte
já está feita (ver `../README.md` para a tabela de status completa).
O que ainda falta depende de decisões que só quem for operar isso em
produção pode tomar:

- **Testes E2E e de carga**: Cypress/Playwright e k6 exigem um ambiente
  de staging real rodando para ter sentido — testá-los contra mocks
  seria teatro, não teste.
- **CI/CD de deploy automático em toda mudança**: o workflow
  `.github/workflows/deploy.yml` existe e publica no GHCR, mas o job
  de deploy via SSH só roda manualmente (`workflow_dispatch`) até
  alguém configurar os secrets do servidor real — ver comentário no
  topo do arquivo.
- **SSL/TLS**: o template completo (Nginx + Certbot,
  `docker-compose.prod.yml`, `scripts/init-letsencrypt.sh`) já existe
  na raiz do monorepo — só falta um domínio real apontando para o
  servidor para ativá-lo. Ver `DEPLOY_CHECKLIST.md`.
- **Monitoramento (New Relic/PM2 avançado)**: o `/health` já existe como
  base para qualquer monitor externo (UptimeRobot, etc.) usar hoje.

## Próximos passos sugeridos

1. Rodar localmente com Docker Compose e validar o fluxo de login.
2. Seguir o `MIGRATION_GUIDE.md` para importar a planilha de ~1.500 itens.
3. Trocar as chaves em `.env` por valores fortes antes de qualquer deploy.
4. Adaptar o frontend HTML existente para consumir esta API em vez do
   `localStorage` (troca direta: cada função `storageGet/storageSet` do
   frontend passa a ser uma chamada `fetch` para o endpoint equivalente).
