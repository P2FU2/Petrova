# Finance OS (MVP)

Plataforma financeira chat-first para organizacao de gastos, fluxo de caixa e inicio de consolidacao patrimonial com IA.

## Stack

- Next.js + React + TypeScript
- TailwindCSS
- Recharts
- Prisma (schema PostgreSQL pronto)
- PWA (`next-pwa`)

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Configure ambiente:

```bash
cp .env.example .env
```

3. Gere o client do Prisma:

```bash
npm run prisma:generate
```

4. Rode em desenvolvimento:

```bash
npm run dev
```

Opcional (para processamento em fila real):

```bash
npm run worker
```

## Deploy no Railway (Web + API + Worker + Postgres + Redis)

Arquitetura no Railway:

- **Service 1 (webapp):** Next.js (`frontend + backend API` no mesmo deploy)
- **Service 2 (worker):** BullMQ worker para processamento assíncrono
- **Database:** PostgreSQL do Railway
- **Cache/queue:** Redis do Railway

### 1) Criar projeto e conectar repositório

1. No Railway, clique em **New Project**.
2. Conecte este repositório GitHub.
3. Mantenha deploy por Dockerfile (ja incluido no projeto).

### 2) Adicionar banco e Redis

1. No projeto Railway, clique em **New** -> **Database** -> **PostgreSQL**.
2. Clique em **New** -> **Database** -> **Redis**.

### 3) Criar service web

1. Crie o serviço principal com este repo.
2. Start command (se quiser sobrescrever): `npm run railway:start:web`
3. Healthcheck: `/api/health`

Variáveis obrigatórias no service web:

- `DATABASE_URL` (referência do plugin PostgreSQL)
- `REDIS_URL` (referência do plugin Redis)
- `JWT_SECRET` (string forte gerada por voce)
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_NAME=Finance OS`

### 4) Criar service worker

1. Duplique o service web (ou crie novo apontando para o mesmo repo).
2. Troque apenas o Start command para:

```bash
npm run railway:start:worker
```

3. Use as mesmas variáveis:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`

### 5) Domínio e PWA

1. No service web, clique em **Generate Domain**.
2. Acesse o domínio gerado.
3. A PWA fica disponível automaticamente (manifest + service worker em produção).

### 6) Migrações Prisma em produção

O comando `railway:start:web` e `railway:start:worker` já roda:

- `prisma migrate deploy`

Ou seja, ao subir nova versão com migração pendente, o deploy aplica o schema automaticamente antes de iniciar.

## Entrega desta fase

- Onboarding com 3-4 perguntas essenciais.
- Upload inteligente de CSV/XLSX.
- Parsing + classificacao inicial de transacoes.
- Pipeline staging -> aprovacao.
- Dashboard mensal.
- Chat com dados (sem inventar numeros).
- Alertas de periodo incompleto e assinaturas.
- Base PWA.
- Persistencia em PostgreSQL via Prisma.
- Auth com JWT + RBAC por workspace.
- Fila BullMQ/Redis com fallback local.
- OCR inicial de imagens e relatorio PDF.

## Seguranca e privacidade

- Mascaramento inicial de dados sensiveis antes do orquestrador de IA.
- Schema de auditoria e consentimento preparado no Prisma.
- Separacao entre camada de IA e camada de dados estruturados prevista na evolucao.
