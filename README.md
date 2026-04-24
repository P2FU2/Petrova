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

3. Rode em desenvolvimento:

```bash
npm run dev
```

## Entrega desta fase

- Onboarding com 3-4 perguntas essenciais.
- Upload inteligente de CSV/XLSX.
- Parsing + classificacao inicial de transacoes.
- Pipeline staging -> aprovacao.
- Dashboard mensal.
- Chat com dados (sem inventar numeros).
- Alertas de periodo incompleto e assinaturas.
- Base PWA.

## Seguranca e privacidade

- Mascaramento inicial de dados sensiveis antes do orquestrador de IA.
- Schema de auditoria e consentimento preparado no Prisma.
- Separacao entre camada de IA e camada de dados estruturados prevista na evolucao.
