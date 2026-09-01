# ALMOX//CTRL — Frontend

Frontend profissional em **React 18 + Context API + React Router + Axios**,
substituindo o protótipo HTML/localStorage. Consome a API do
`almox-ctrl-backend`.

## Stack e decisões

- **Vite** como build tool (dev server rápido, build de produção otimizado).
- **Context API** para estado global (autenticação + toasts) — Redux foi
  avaliado, mas para o tamanho deste app (uma dúzia de páginas, sem estado
  compartilhado complexo entre elas) adicionaria boilerplate sem
  benefício real. Ver conversa que definiu essa escolha.
- **React Hook Form + Yup** para formulários e validação — mesma
  validação de "obrigatório", "mínimo", "categoria válida" etc. que já
  existe no backend, replicada no frontend para feedback imediato (o
  backend segue sendo a fonte da verdade e revalida tudo de novo).
- **Axios com interceptors** (`src/api/axiosClient.js`) — a peça mais
  importante do frontend:
  - Anexa o `accessToken` (guardado só em memória, nunca em
    localStorage) em toda requisição.
  - Se uma requisição volta `401`, tenta renovar o token automaticamente
    via `/auth/refresh-token` (cookie httpOnly) e repete a requisição
    original — o usuário não percebe nada.
  - Requisições simultâneas durante uma renovação são enfileiradas em
    vez de disparar múltiplos refreshes em paralelo.
  - Se o refresh também falhar, desloga e manda para `/login`.
  - Em `403` (sem permissão), não desloga — deixa o componente mostrar
    o erro, porque o problema é de autorização, não de sessão expirada.
- **RBAC no frontend é só UX** — esconde/desabilita botões que o usuário
  não pode usar (ver `src/utils/constants.js` e `ProtectedRoute.jsx`),
  mas a permissão real é sempre revalidada no backend. Nunca confie só
  no frontend para isso.

## Estrutura

```
src/
├── api/            # um arquivo por recurso, só chamadas HTTP (sem lógica de UI)
├── context/        # AuthContext (sessão) e ToastContext (notificações)
├── components/
│   ├── layout/      # Layout (sidebar+topbar), Page (wrapper de página)
│   └── ui/          # ConfirmDialog, FieldError, Common (badges, spinners, stat cards)
├── pages/           # uma página por rota
├── utils/           # constants, validationSchemas (Yup), format, masks, errors
├── App.jsx          # rotas + proteção por autenticação/papel
└── main.jsx
```

## Setup local

```bash
cp .env.example .env
# ajuste VITE_API_URL se o backend não estiver em localhost:3000

npm install
npm run dev
```

Abre em `http://localhost:5173`. **O backend precisa estar rodando** (ver
README do `almox-ctrl-backend`) — este frontend não funciona sozinho,
diferente do protótipo HTML antigo.

## Build de produção

```bash
npm run build   # gera dist/
npm run preview # serve o build localmente para testar
```

## Fluxo de autenticação (resumo)

1. Login em `/login` → `AuthContext.login()` chama `POST /auth/login`,
   guarda o `accessToken` em memória (via `axiosClient`) e os dados do
   usuário em estado do React.
2. Ao recarregar a página (F5), o `accessToken` em memória se perde —
   `AuthContext` tenta uma renovação silenciosa via
   `POST /auth/refresh-token` (o cookie ainda está lá) antes de mandar
   para `/login`. É por isso que existe uma tela de "Verificando
   sessão..." rápida no primeiro carregamento.
3. Papéis (`admin`, `gestor`, `operador`, `visualizador`) controlam o
   que aparece no menu e quais botões ficam visíveis — ver
   `utils/constants.js` (`WRITE_ROLES`, `MOVEMENT_ROLES`).

## Testes

```bash
npm test          # roda a suíte uma vez (Vitest)
npm run test:watch
```

Cobertura atual (`src/utils/__tests__/`, `src/components/ui/__tests__/`):
`format`/`errors` (funções puras) e `FieldError`/`ConfirmDialog`
(render + interação via React Testing Library + `user-event`). Ainda
não há testes das páginas inteiras nem E2E (Cypress/Playwright) — as
páginas fazem bastante chamada de API, e testá-las bem exigiria mockar
o `axiosClient` de forma mais estruturada do que deu para fazer nesta
rodada.

## O que ainda falta

- **Testes E2E** (Cypress/Playwright) e das páginas completas (só os
  utilitários e componentes de UI pequenos estão cobertos hoje).
- **Dark mode** parcial: o toggle na sidebar já funciona (variáveis CSS
  em `index.css`), mas não foi revisado pixel a pixel em todas as
  páginas — trate como uma primeira versão, não como polido.
- **Máscaras de data** no formulário: os campos de data usam o input
  nativo `type="date"` do navegador em vez de uma máscara customizada —
  decisão deliberada (acessibilidade e comportamento mobile do input
  nativo são melhores que reimplementar isso).
