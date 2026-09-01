# Guia de migração — localStorage / Excel → PostgreSQL

Este guia cobre os dois cenários reais deste projeto: (1) migrar o que já
foi cadastrado no protótipo HTML (localStorage) e (2) importar a planilha
Excel com ~1.500 itens do almoxarifado.

## Cenário 1 — Planilha Excel (~1.500 itens) → banco novo

Este é o caminho principal, já que o protótipo em HTML foi só uma
demonstração e a planilha é a fonte de dados real.

### Passo 1 — Preparar a planilha

No Excel, garanta que existe uma coluna para cada um destes campos, na
ordem abaixo (o cabeçalho pode ter qualquer nome — só a ordem importa):

| codigo      | nome                  | categoria | unidade | minimo | atual |
|-------------|-----------------------|-----------|---------|--------|-------|
| PNEU-295    | Pneu 295/80 R22.5     | FR        | un      | 8      | 5     |

- `categoria` precisa ser exatamente `FR`, `CO`, `IP` ou `MI`.
- `minimo` e `atual` precisam ser números (sem "un", sem separador de
  milhar — ex: `1200`, não `1.200`).
- Se a planilha tiver os itens divididos por aba (uma aba por categoria),
  exporte uma aba por vez — é mais simples que consolidar antes.

### Passo 2 — Exportar como CSV

No Excel: **Arquivo → Salvar Como → CSV (separado por vírgulas) (.csv)**.
Se o Excel estiver em português, ele provavelmente vai gerar um CSV com
`;` como separador — a API aceita os dois formatos automaticamente.

### Passo 3 — Criar um usuário com permissão de importar

A rota de import exige `admin` ou `gestor`. Use o usuário criado pelo
`npm run seed` ou crie um específico para essa tarefa.

### Passo 4 — Importar via API

```bash
# 1. Fazer login e guardar o accessToken
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com.br","senha":"SUA_SENHA"}'

# 2. Importar o CSV (repita para cada arquivo/categoria, se separados)
curl -X POST http://localhost:3000/api/products/import-csv \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -F "file=@./planilha_FR.csv"
```

A resposta traz um resumo:

```json
{
  "importados": 412,
  "ignorados": 3,
  "erros": 2,
  "detalhesErros": [
    { "linha": 87, "motivo": "Dados inválidos ou categoria fora de FR/CO/IP/MI" }
  ]
}
```

- **Ignorados** = código já existia no banco (não sobrescreve — evita
  duplicar ou apagar dado sem querer numa segunda tentativa de import).
- **Erros** = linha malformada; corrija na planilha e reimporte só essas
  linhas depois (o import é seguro para rodar várias vezes).

### Passo 5 — Conferir

```bash
curl http://localhost:3000/api/products?limit=5 \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

## Cenário 2 — Dados do protótipo (localStorage do navegador) → banco

Se já existirem dados de teste digitados no protótipo HTML (produtos,
veículos, ativos, movimentações), eles vivem no `localStorage` do
navegador onde o protótipo foi aberto — não em um arquivo. Para
recuperá-los:

1. Abra o protótipo no mesmo navegador/computador onde os dados foram
   digitados.
2. Abra o DevTools (F12) → aba **Console** → cole e execute:

   ```js
   console.log(JSON.stringify({
     produtos: JSON.parse(localStorage.getItem('produtos') || '[]'),
     veiculos: JSON.parse(localStorage.getItem('veiculos') || '[]'),
     ativos: JSON.parse(localStorage.getItem('ativos') || '[]'),
     movimentacoes: JSON.parse(localStorage.getItem('movimentacoes') || '[]')
   }));
   ```
3. Copie o JSON impresso e salve em um arquivo, ex: `dump_prototipo.json`.
4. Use o script abaixo (crie em `db/import-prototipo.js`) para carregar
   esse JSON no banco novo — ele usa o mesmo usuário admin como
   responsável por todas as movimentações históricas, já que o protótipo
   não tinha login:

   ```js
   // db/import-prototipo.js — rode com: node db/import-prototipo.js dump_prototipo.json
   require('dotenv').config();
   const fs = require('fs');
   const { Pool } = require('pg');

   async function main() {
     const dump = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
     const pool = new Pool({ /* mesmas variáveis do .env */
       host: process.env.DB_HOST, port: process.env.DB_PORT,
       database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD
     });
     const client = await pool.connect();
     const admin = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
     const adminId = admin.rows[0].id;

     for (const p of dump.produtos) {
       await client.query(
         `INSERT INTO products (codigo, nome, categoria, unidade, estoque_minimo, estoque_atual)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (codigo) DO NOTHING`,
         [p.codigo, p.nome, p.categoria, p.unidade, p.minimo, p.atual]
       );
     }
     for (const v of dump.veiculos) {
       await client.query(
         `INSERT INTO vehicles (placa, modelo, marca) VALUES ($1,$2,$3) ON CONFLICT (placa) DO NOTHING`,
         [v.placa, v.modelo, v.marca]
       );
     }
     for (const a of dump.ativos) {
       await client.query(
         `INSERT INTO assets (codigo, nome, tipo, localizacao, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (codigo) DO NOTHING`,
         [a.codigo, a.nome, a.tipo, a.localizacao, a.status]
       );
     }
     // Movimentações antigas: inserimos direto (não via API) porque
     // queremos preservar a data original, não a data de hoje.
     for (const m of dump.movimentacoes) {
       const prod = await client.query('SELECT id FROM products WHERE codigo = $1', [m.produtoCodigo]);
       if (!prod.rows[0]) continue;
       await client.query(
         `INSERT INTO movements (product_id, type, quantidade, user_id, referencia, observacao, data_movimentacao)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
         [prod.rows[0].id, m.tipo, m.quantidade, adminId, m.referencia, m.observacao, m.data]
       );
     }
     console.log('Importação do protótipo concluída.');
     await pool.end();
   }
   main();
   ```

   > Atenção: como a inserção acima é direta (não passa por
   > `movement.repository.js`), o trigger do banco ainda soma/subtrai
   > `estoque_atual` automaticamente — mas a validação de "saída maior
   > que o estoque" da API **não** é aplicada aqui, propositalmente,
   > porque esses dados já são fatos históricos que já aconteceram no
   > protótipo. Revise o resultado com o relatório de estoque baixo
   > depois de importar.

## Checklist pós-migração

- [ ] Contagem de produtos importados bate com a planilha original
- [ ] Nenhum produto com categoria fora de FR/CO/IP/MI
- [ ] Rodar `GET /api/products/estoque-baixo` e validar contra a
      expectativa de quem cadastrou a planilha
- [ ] Confirmar com o time do almoxarifado que os códigos batem com o
      que eles usam no dia a dia (evita divergência silenciosa)
- [ ] Guardar o CSV original usado na importação (auditoria futura)
