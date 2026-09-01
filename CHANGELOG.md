# Changelog

Este projeto segue o formato de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e [Conventional Commits](https://www.conventionalcommits.org/pt-br/) para
o histórico do git.

## [1.0.0] — Versão inicial enterprise

### Adicionado
- Backend Node.js/Express com PostgreSQL, JWT (access + refresh
  rotativo), RBAC de 4 papéis, rate limiting, log de auditoria completo.
- Regras de negócio críticas: transaction + row lock em movimentações,
  correção via movimentação de ajuste (nunca edição/exclusão), soft
  delete em produtos e usuários.
- Endpoints REST completos: auth, users, products (+ import CSV),
  vehicles, assets, movements, reports (+ export CSV), dashboard,
  audit-log.
- Frontend React 18 + Context API + React Router + Axios com
  interceptors (refresh automático de token, fila de requisições
  durante renovação, logout automático em falha de refresh).
- Formulários com React Hook Form + Yup, replicando no cliente as
  mesmas validações do backend para feedback imediato.
- Docker Compose unificado (Postgres, Redis, API, frontend, Nginx
  como reverse proxy único — mesma origem em produção).
- Cache Redis conectado (padrão cache-aside resiliente — se o Redis
  cair, a API segue funcionando sem cache): dashboard 5 min, listas de
  produtos/veículos 10 min com invalidação por versão a cada mutação.
- Suíte inicial de testes automatizados: backend (Jest + Supertest —
  unitários dos utilitários críticos e da regra de transaction+lock em
  movimentações, integração de auth/RBAC) e frontend (Vitest + React
  Testing Library — utilitários puros e dois componentes de UI).
- CI atualizado para rodar os testes a cada PR
  (`.github/workflows/ci.yml`).
- Pipeline de CD (`.github/workflows/deploy.yml`): build e push das
  imagens para o GitHub Container Registry, com deploy via SSH
  opcional atrás de secrets do repositório (gatilho manual).
- Template completo de SSL/TLS (`docker-compose.prod.yml`,
  `nginx.prod.conf`, `scripts/init-letsencrypt.sh`) — Nginx +
  Certbot com renovação automática, pronto para ativar assim que
  houver um domínio real.
- Compressão gzip nas respostas da API (`compression` middleware) —
  relevante para listagens grandes e exportação CSV, dado o volume de
  ~1.500 produtos previsto.
- Manual do Usuário (`docs/manual-usuario-almox-ctrl.docx` e `.pdf`) —
  documento não-técnico para quem usa o sistema no dia a dia
  (almoxarifado), separado da documentação de desenvolvedor.
- Documentação: OpenAPI/Swagger dos endpoints principais, coleção
  Postman, guia de migração da planilha Excel (~1.500 itens) e do
  protótipo em localStorage, checklist de deploy.

### Limites conhecidos desta versão
- **Testes automatizados** não são "80% de cobertura" — cobrem o
  essencial (regra de estoque, auth, RBAC), não todos os endpoints, e
  não incluem E2E (Cypress/Playwright) nem carga (k6/Artillery). Além
  disso, foram validados apenas por sintaxe neste ambiente (sem
  `npm install`/execução real) — rodar `npm test` antes de confiar.
- **CD automático a cada push** não está ativo — o job de deploy via
  SSH exige secrets de um servidor real (host, chave, caminho) e por
  isso só roda manualmente até alguém configurar isso.
- **SSL/TLS** exige um domínio real apontando para o servidor — o
  template está pronto, mas não emite certificado sozinho sem isso.
