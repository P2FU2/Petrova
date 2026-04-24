# Diagnostico da Arquitetura Atual

## Estado inicial encontrado

- Repositorio vazio (sem commits e sem base de codigo).
- Nao havia stack definida, nem estrutura de pastas.
- Nao havia schema de banco, endpoints ou componentes.

## Decisao arquitetural para primeira entrega

Para entregar MVP funcional rapidamente com base escalavel:

- **Frontend + API no mesmo runtime:** Next.js App Router (web + mobile responsivo + PWA).
- **Dominio separado por modulos:** onboarding, upload, parser, transacoes, dashboard, alertas e chat IA.
- **Persistencia de producao definida:** Prisma + PostgreSQL via `prisma/schema.prisma`.
- **Execucao imediata do MVP:** armazenamento em memoria no dominio para validar fluxo sem bloquear por infra.
- **Seguranca inicial:** mascaramento de dados sensiveis antes de entrada no orquestrador.

## Riscos e mitigacoes

- **Risco:** armazenamento em memoria nao e persistente.
  - **Mitigacao:** models Prisma completos para migracao imediata para banco.
- **Risco:** parser PDF/OCR nao entrou no MVP 1.
  - **Mitigacao:** pipeline e estados de arquivo ja preparados para parser-service dedicado.
- **Risco:** IA ainda baseada em regras + consultas estruturadas.
  - **Mitigacao:** `ai_orchestrator` desenhado para plugar modelo local/privado e RAG depois.
