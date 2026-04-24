# Estrutura de Pastas Proposta

```text
finance-os/
  docs/
    architecture-diagnosis.md
    folder-structure.md
    implementation-phases.md
  prisma/
    schema.prisma
  public/
    manifest.json
  src/
    app/
      api/
        ai/chat/route.ts
        alerts/route.ts
        dashboard/categories/route.ts
        dashboard/summary/route.ts
        files/
          route.ts
          upload/route.ts
          [id]/route.ts
          [id]/process/route.ts
          [id]/approve/route.ts
        onboarding/
          answer/route.ts
          complete/route.ts
          status/route.ts
        transactions/route.ts
        transactions/[id]/route.ts
      globals.css
      layout.tsx
      page.tsx
    components/
      finance-os-app.tsx
    lib/
      ai-orchestrator.ts
      analytics.ts
      parser.ts
      security.ts
      store.ts
      types.ts
  package.json
```

## Evolucao recomendada (Fase 2+)

Quando escalar, mover para monorepo:

```text
apps/web
apps/api
apps/worker
apps/parser-service
apps/ai-service
packages/ui
packages/database
packages/shared
```
