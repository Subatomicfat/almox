# ALMOX//CTRL

Sistema de controle de estoque para almoxarifado industrial — Frota de
Veículos (FR), Ativos em Comodato (CO), Insumos de Produção (IP) e
Manutenção Industrial (MI). Substitui o protótipo original em
HTML/localStorage por uma arquitetura enterprise real.

## Monorepo

```
almox-ctrl/
├── backend/                → API Node.js/Express + PostgreSQL (ver backend/README.md)
├── frontend/               → React 18 + Context API + Vite (ver frontend/README.md)
├── docker-compose.yml      → desenvolvimento: builda tudo local (db, redis, api, frontend, nginx)
├── docker-compose.prod.yml → produção: puxa imagens do GHCR + Certbot (ver DEPLOY_CHECKLIST.md)
├── nginx.conf              → reverse proxy de desenvolvimento
├── nginx.prod.conf         → reverse proxy de produção (HTTPS + redirect)
├── scripts/init-letsencrypt.sh → bootstrap do primeiro certificado SSL
├── docs/
│   ├── manual-usuario-almox-ctrl.docx → manual para quem usa o sistema no dia a dia (não-técnico)
│   └── manual-usuario-almox-ctrl.pdf  → mesmo manual, pronto para imprimir/enviar
├── ARCHITECTURE.md         → diagramas ER, componentes e fluxos (Mermaid)
├── CHANGELOG.md
├── CONTRIBUTING.md
└── .github/workflows/
    ├── ci.yml               → lint + testes + build a cada PR
    └── deploy.yml           → build+push GHCR (manual) + deploy SSH opcional
```

## Rodando tudo com um comando

```bash
cp .env.example .env
cp backend/.env.example backend/.env
# edite os dois .env — principalmente JWT_*_SECRET e as senhas

docker compose up -d --build
docker compose exec api npm run migrate
docker compose exec api npm run seed
```

Acesse `http://localhost`. Login inicial: o e-mail/senha definidos em
`backend/.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Rodando cada parte separadamente (desenvolvimento)

Mais rápido para iterar no dia a dia — ver instruções detalhadas em
`backend/README.md` e `frontend/README.md`. Resumo:

```bash
# Terminal 1 — banco (só o Postgres via Docker, resto local)
docker compose up -d db

# Terminal 2 — backend
cd backend && cp .env.example .env && npm install && npm run migrate && npm run seed && npm run dev

# Terminal 3 — frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

Frontend em `http://localhost:5173`, API em `http://localhost:3000`.

## Documentos que valem a leitura antes de tocar em produção

- **`ARCHITECTURE.md`** — diagramas de arquitetura, modelo ER e os dois
  fluxos mais importantes do sistema (login com refresh automático, e
  registro de movimentação com transaction+lock).
- **`backend/MIGRATION_GUIDE.md`** — como importar a planilha Excel de
  ~1.500 itens e como recuperar dados já digitados no protótipo antigo.
- **`backend/DEPLOY_CHECKLIST.md`** — o que revisar antes do primeiro
  deploy em produção (segredos, backup, HTTPS, firewall).
- **`docs/manual-usuario-almox-ctrl.docx`** (ou o `.pdf` ao lado) — para
  quem vai usar o sistema no dia a dia (almoxarifado), não para quem
  desenvolve. Em português simples, sem termos técnicos.
- **`CONTRIBUTING.md`** — convenções de commit e checklist de PR.

## Estado do projeto — o que está pronto e o que não está

| Área | Status |
|---|---|
| Backend: API, segurança (JWT/RBAC/auditoria), regras de negócio, transaction+lock | ✅ Completo |
| Frontend: React com todas as telas, interceptors de auth, RBAC de UI | ✅ Completo |
| Docker Compose unificado, Nginx reverse proxy | ✅ Completo |
| Documentação (README, OpenAPI, Postman, migração, deploy checklist, arquitetura, **manual do usuário**) | ✅ Completo |
| CI (lint + testes + build a cada PR) | ✅ Completo (`.github/workflows/ci.yml`) |
| Cache Redis (dashboard 5min, listas 10min, invalidação por versão) | ✅ Completo (`backend/src/utils/cache.js`) |
| Performance: paginação, índices, compressão gzip das respostas da API | ✅ Completo |
| Testes automatizados — unitário e integração dos fluxos críticos | ✅ Escopo inicial (ver "Limite honesto" abaixo) |
| CD — build+push de imagens no GHCR | ✅ Completo (`.github/workflows/deploy.yml`) |
| SSL/TLS — template Nginx+Certbot pronto | ✅ Completo (falta só um domínio real para ativar) |
| CD — deploy automático via SSH a cada push | ⚠️ Manual por enquanto (requer secrets do servidor) |
| Testes E2E (Cypress/Playwright) e de carga (k6) | ❌ Não feito |
| CDN para assets estáticos | ❌ Não feito — depende do provedor de hospedagem escolhido |

### Limite honesto do que "testes automatizados" significa aqui

A suíte cobre o essencial, não "80% de cobertura": no backend, a regra
de negócio mais sensível (transaction+lock impedindo estoque negativo,
correção via movimentação de ajuste) e os fluxos de auth/RBAC; no
frontend, os utilitários puros e dois componentes de UI. **Não há
testes E2E nem de carga**, e os testes que existem foram validados só
por sintaxe (`node --check` / parser do TypeScript) — não roda
`npm install` neste ambiente para confirmar que passam de fato. Rode
`npm test` em `backend/` e `frontend/` antes de confiar neles.
