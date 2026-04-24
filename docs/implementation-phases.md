# Fluxos, Componentes e Plano de Implementacao

## 1) Rotas principais implementadas no MVP

- `GET /api/onboarding/status`
- `POST /api/onboarding/answer`
- `POST /api/onboarding/complete`
- `GET /api/files`
- `POST /api/files/upload`
- `GET /api/files/:id`
- `POST /api/files/:id/process`
- `POST /api/files/:id/approve`
- `GET /api/transactions`
- `PATCH /api/transactions/:id`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/categories`
- `GET /api/alerts`
- `PATCH /api/alerts`
- `POST /api/ai/chat`

## 2) Fluxo de upload implementado

1. Usuario envia arquivo CSV/XLSX no Upload Center.
2. API cria registro com status `uploaded`.
3. Processamento muda para `processing`.
4. Parser extrai transacoes e classifica automaticamente.
5. Sistema salva em staging e marca arquivo como `parsed` ou `needs_review`.
6. Gera alertas de periodo incompleto e assinaturas detectadas.
7. Endpoint de aprovacao promove transacoes para ledger oficial (`approved`).

## 3) Fluxo do chat implementado

1. Usuario envia pergunta no copiloto.
2. Mensagem passa por mascaramento de dados sensiveis.
3. `ai_orchestrator` identifica intencao.
4. Sistema consulta dados estruturados (ledger em memoria no MVP).
5. IA responde com texto objetivo e, quando aplicavel, retorna grafico.
6. Frontend renderiza mensagem + componente visual.

## 4) Componentes principais implementados

- Layout responsivo com UX chat-first.
- Card de onboarding com 4 perguntas essenciais.
- Upload Center com envio de arquivo e processamento.
- Dashboard de metricas principais.
- Grafico de categorias (pie).
- Chat com renderizacao de insights e grafico dinamico.
- Lista de alertas inteligentes.

## 5) Fases de evolucao

### MVP 1 (concluido neste projeto)
- Onboarding conversacional.
- Upload CSV/XLSX.
- Parsing e classificacao inicial.
- Ledger com aprovacao de staging.
- Dashboard financeiro basico.
- Chat com dados estruturados.
- Alertas iniciais.
- PWA base.

### MVP 2
- Parser PDF (basico) implementado.
- OCR inicial para imagens/prints implementado.
- Modulo inicial de assinaturas implementado.
- Modulo inicial de boletos implementado.
- Relatorio mensal em CSV e PDF implementado.
- Autenticacao (register/login/me) e RBAC por membership de workspace implementados.
- Persistencia principal no PostgreSQL via Prisma implementada.
- Fila assincorna com BullMQ/Redis implementada (com fallback local sem Redis).

### MVP 3
- Patrimonio completo (ativos/passivos/investimentos).
- Multiworkspace (PF/PJ/familia/holding).
- Integracao Open Finance.
- Worker + fila (BullMQ + Redis).

### MVP 4
- AI privada/local.
- Insights preditivos.
- Canal WhatsApp.
- Governanca empresarial (politicas, aprovacoes, auditoria avancada).
