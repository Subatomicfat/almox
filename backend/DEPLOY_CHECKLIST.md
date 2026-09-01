# Checklist de deploy em produção — ALMOX//CTRL

Este checklist assume o caminho "oficial" do projeto: publicar imagens
no GHCR via `.github/workflows/deploy.yml` e rodar
`docker-compose.prod.yml` num servidor com Docker. Se você for hospedar
diferente disso (Kubernetes, PaaS gerenciado, etc.), os passos de
segurança e configuração ainda valem — só os comandos de deploy mudam.

## Antes do primeiro deploy

- [ ] Gerar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` novos e fortes
      (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
      — **nunca** reutilize os valores de desenvolvimento.
- [ ] Definir `DB_PASSWORD` forte (gerenciador de senhas, não reutilizar).
- [ ] Definir `NODE_ENV=production` no `backend/.env`.
- [ ] Definir `CORS_ORIGIN` para o domínio real (com `https://`).
- [ ] Trocar a senha do usuário admin logo após o primeiro login (o
      `SEED_ADMIN_PASSWORD` do `.env` não deve ficar valendo para sempre).
- [ ] Confirmar que `.env` está no `.gitignore` e nunca foi commitado.
- [ ] Configurar os secrets do GitHub Actions se for usar o deploy via
      SSH (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH`) —
      ver comentários no topo de `.github/workflows/deploy.yml`.

## Banco de dados

- [ ] Rodar `docker compose -f docker-compose.prod.yml exec api npm run migrate`
      contra o banco de produção antes do primeiro acesso.
- [ ] Configurar backup automático diário (pg_dump agendado ou backup
      gerenciado do provedor de nuvem).
- [ ] Testar ao menos uma vez o processo de restore a partir do backup
      — um backup nunca testado é só uma esperança, não um plano.
- [ ] Revisar se o usuário `DB_USER` da aplicação tem exatamente as
      permissões necessárias (não usar o superusuário do Postgres).

## SSL/TLS (Let's Encrypt via Certbot)

- [ ] Ter um domínio real apontando (registro DNS tipo A) para o IP do
      servidor — sem isso, a validação do certificado falha.
- [ ] Substituir `SEU_DOMINIO.com.br` pelo domínio real em
      `nginx.prod.conf` (duas ocorrências).
- [ ] Definir `DOMAIN` e `GHCR_NAMESPACE` no `.env` da raiz do monorepo.
- [ ] Rodar `DOMAIN=seu-dominio.com.br EMAIL=voce@empresa.com.br
      ./scripts/init-letsencrypt.sh` **uma vez** para emitir o
      primeiro certificado (ver comentários no próprio script — ele
      resolve o problema de "nginx precisa de certificado para subir,
      certbot precisa do nginx no ar para validar o domínio").
- [ ] Confirmar que o serviço `certbot` do `docker-compose.prod.yml`
      está de pé (`docker compose -f docker-compose.prod.yml ps`) —
      ele renova automaticamente a cada 12h, sem intervenção manual.
- [ ] Confirmar que os cookies de refresh token têm `Secure: true` em
      produção (já é automático via `NODE_ENV=production`, ver
      `backend/src/controllers/auth.controller.js`).

## Rede e segurança

- [ ] Banco de dados e Redis não devem estar acessíveis publicamente
      na internet — `docker-compose.prod.yml` já não publica a porta
      do Postgres/Redis fora da rede interna do Docker (diferente do
      `docker-compose.yml` de desenvolvimento, que publica por
      conveniência local).
- [ ] Revisar as regras de firewall/security group do servidor: só as
      portas 80/443 expostas publicamente.

## Aplicação

- [ ] Rodar o workflow **Deploy** manualmente (aba Actions do GitHub)
      para publicar as imagens no GHCR — ver `.github/workflows/deploy.yml`.
- [ ] No servidor: `docker compose -f docker-compose.prod.yml pull &&
      docker compose -f docker-compose.prod.yml up -d`.
- [ ] Validar `GET /health` respondendo 200 publicamente via HTTPS.
- [ ] Validar login + uma operação protegida ponta a ponta em produção.
- [ ] Configurar um monitor externo simples de uptime (UptimeRobot,
      Better Uptime, etc.) apontando para `/health`.
- [ ] Configurar rotação/retenção de logs (os logs vão para stdout/stderr
      — capture-os com o driver de log do Docker ou um agente como
      Fluent Bit, conforme o provedor de hospedagem escolhido).

## Depois de estabilizado (não bloqueia o primeiro deploy)

- [ ] Ampliar a cobertura de testes automatizados — a suíte atual
      (`backend/tests/`, `frontend/src/**/__tests__/`) cobre os
      utilitários críticos e os fluxos de auth/RBAC, mas não é
      cobertura completa; faltam testes E2E (Cypress/Playwright) e de
      carga (k6/Artillery).
- [ ] Avaliar necessidade de réplica de leitura do banco, se o volume
      de relatórios crescer muito.
- [ ] Considerar mover o job `deploy_ssh` para um ambiente do GitHub
      (Settings > Environments) com aprovação manual antes de rodar,
      se mais de uma pessoa passar a ter acesso ao workflow.

## Rollback

- [ ] Cada imagem publicada no GHCR é taggeada com o SHA do commit
      (além de `latest`) — para reverter, defina `IMAGE_TAG=<sha
      anterior>` no `.env` e rode `docker compose -f
      docker-compose.prod.yml up -d` de novo.
- [ ] Confirmar que `backend/db/schema.sql` é versionado (git) —
      qualquer alteração futura de schema deve vir como um novo script
      de migration incremental, não como edição do schema.sql
      original, para que seja possível saber exatamente o que mudou
      entre versões.
