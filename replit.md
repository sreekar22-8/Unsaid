# Unsaid

Unsaid is a private AI companion for understanding unspoken emotions through reflective conversation, journaling, and user-controlled memory.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/unsaid/src/pages/unsaid-pages.tsx` — companion, journal, insights, memory, and settings screens
- `artifacts/unsaid/src/components/unsaid-ui.tsx` — shared shell and UI primitives
- `artifacts/unsaid/src/index.css` — Unsaid theme tokens, typography, texture, and motion
- `artifacts/api-server/src/routes/companion.ts` — companion API routes and seeded first-use experience
- `lib/api-spec/openapi.yaml` — source of truth for the companion API
- `lib/db/src/schema/unsaid.ts` — persisted conversations, messages, journal, memory, and settings

## Architecture decisions

- API contracts are defined in OpenAPI and generated into the shared client before server or UI integration.
- Data is scoped to the current workspace demo user until authentication is added; records persist in PostgreSQL.
- Conversation mode is sent with each message so changing Listen, Understand, Help, or Private note affects saved behavior.
- The first request seeds a small reflective starter space, a journal entry, and two example memories.

## Product

The app offers AI-style reflective chat with four modes, private notes, emotion detection, an emotional journal, an insights dashboard, and explicit memory controls. The current environment does not have AI integration access or an OpenAI key, so the server uses a deterministic reflective responder while keeping the AI boundary ready to replace.

## User preferences

No additional user preferences recorded.

## Gotchas

- Regenerate the API client with `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Development schema changes use `pnpm --filter @workspace/db run push`; production schema changes are applied through Publish.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
