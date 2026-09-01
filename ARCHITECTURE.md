# Arquitetura — ALMOX//CTRL

## Visão geral de componentes

```mermaid
graph TB
    subgraph Cliente
        Browser["Navegador"]
    end

    subgraph "Reverse Proxy (Nginx)"
        NGX["nginx :80<br/>/api/* → api<br/>/* → frontend"]
    end

    subgraph "Frontend (React SPA, estático)"
        FE["React + Context API<br/>servido pelo Nginx do container frontend"]
    end

    subgraph "Backend (Node.js/Express)"
        API["API REST<br/>routes → controllers → repositories"]
        MW["Middlewares:<br/>auth (JWT) · rbac · rate-limit · validate"]
    end

    subgraph "Dados"
        PG[("PostgreSQL<br/>products, movements,<br/>users, audit_log...")]
        REDIS[("Redis<br/>(reservado — não conectado ainda)")]
    end

    Browser -->|HTTPS| NGX
    NGX -->|"/ "| FE
    NGX -->|"/api/*"| API
    API --> MW
    API -->|SQL parametrizado| PG
    API -.->|"futuro: cache dashboard/listagens"| REDIS
```

## Modelo de dados (ER)

```mermaid
erDiagram
    USERS ||--o{ MOVEMENTS : "registra"
    USERS ||--o{ AUDIT_LOG : "gera"
    USERS ||--o{ REFRESH_TOKENS : "possui"
    PRODUCTS ||--o{ MOVEMENTS : "movimenta"
    VEHICLES ||--o{ MOVEMENTS : "referencia (FR)"
    MOVEMENTS ||--o| MOVEMENTS : "adjustment_of (ajuste corrige original)"

    USERS {
        int id PK
        string nome
        string email
        string senha_hash
        string role "admin|gestor|operador|visualizador"
        string departamento
        bool ativo
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        int id PK
        string codigo UK
        string nome
        string categoria "FR|CO|IP|MI"
        string unidade
        numeric estoque_minimo
        numeric estoque_atual
        bool ativo
        timestamp created_at
        timestamp updated_at
    }

    VEHICLES {
        int id PK
        string placa UK
        string modelo
        string marca
        bool ativo
    }

    ASSETS {
        int id PK
        string codigo UK
        string nome
        string tipo
        string localizacao
        string status "disponivel|instalado|manutencao"
        bool ativo
    }

    MOVEMENTS {
        int id PK
        int product_id FK
        string type "entrada|saida"
        numeric quantidade
        int user_id FK
        int vehicle_id FK
        string referencia
        string observacao
        int adjustment_of FK
        timestamp data_movimentacao
    }

    AUDIT_LOG {
        int id PK
        int user_id FK
        string action
        string table_affected
        int record_id
        jsonb old_values
        jsonb new_values
        string ip_address
        timestamp timestamp
    }

    REFRESH_TOKENS {
        int id PK
        int user_id FK
        string token_hash
        bool revoked
        timestamp expires_at
    }
```

## Fluxo de autenticação (sequência)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant FE as Frontend (React)
    participant API as Backend
    participant DB as PostgreSQL

    U->>FE: e-mail + senha
    FE->>API: POST /auth/login
    API->>DB: busca usuário, compara hash (bcrypt)
    DB-->>API: usuário válido
    API-->>FE: accessToken (corpo) + refreshToken (cookie httpOnly)
    FE->>FE: guarda accessToken em memória (nunca em localStorage)

    Note over FE,API: 15 minutos depois — accessToken expira

    FE->>API: GET /api/products (com accessToken expirado)
    API-->>FE: 401
    FE->>API: POST /auth/refresh-token (cookie enviado automaticamente)
    API->>DB: valida hash do refresh token, não revogado, não expirado
    API->>DB: revoga o token usado, grava um novo (rotação)
    API-->>FE: novo accessToken + novo cookie de refresh
    FE->>API: repete GET /api/products (token novo)
    API-->>FE: 200 OK
```

## Fluxo de uma movimentação (transaction + lock)

```mermaid
sequenceDiagram
    participant C as Controller
    participant R as movement.repository
    participant DB as PostgreSQL

    C->>R: create({productId, type: 'saida', quantidade})
    R->>DB: BEGIN
    R->>DB: SELECT * FROM products WHERE id=$1 FOR UPDATE
    Note over DB: linha travada — outra transaction<br/>concorrente espera aqui
    DB-->>R: produto (estoque_atual travado)
    R->>R: valida quantidade <= estoque_atual
    alt inválido
        R->>DB: ROLLBACK
        R-->>C: ApiError 400 (estoque insuficiente)
    else válido
        R->>DB: INSERT INTO movements (...)
        DB->>DB: TRIGGER atualiza products.estoque_atual
        R->>DB: INSERT INTO audit_log (...)
        R->>DB: COMMIT
        R-->>C: movimentação criada
    end
```

## Por que estas escolhas (resumo — detalhes nos READMEs de cada pasta)

| Decisão | Alternativa considerada | Motivo da escolha |
|---|---|---|
| SQL direto (`pg`) em vez de ORM | Prisma/Sequelize | Volume pequeno de dados, auditabilidade de query, menos dependência |
| Context API em vez de Redux | Redux Toolkit | App de ~12 telas sem estado cross-página complexo |
| Access token em memória, refresh em cookie httpOnly | Ambos em localStorage | Reduz superfície de roubo via XSS |
| Nginx único como reverse proxy | Frontend e API em domínios/portas separados | Mesma origem em produção → sem CORS, cookie `SameSite=strict` funciona sem exceções |
| Movimentação nunca editada/excluída | UPDATE/DELETE direto | Rastreabilidade total do estoque — auditoria exige saber o que aconteceu, não só o estado final |
