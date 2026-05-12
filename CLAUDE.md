@AGENTS.md

## Project: AI Finance Tracker
## Stack: Next.js 16.2.4 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Claude API (@anthropic-ai/sdk)
## Goal: Spending prediction web app - predict how much user will spend by end of month
## Key Features: Transaction CRUD, AI spending prediction, goal tracking, charts

## Commands
```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run lint          # ESLint
npm test              # Jest unit + integration tests
npm run test:coverage # Jest with coverage report
npm run test:e2e      # Playwright e2e tests
npm run test:cypress  # Cypress e2e tests (headless)
```

## Directory Structure
```
app/
  api/
    transactions/     # GET/POST + [id] PATCH/DELETE
    goals/            # GET/POST + [id] PATCH/DELETE
    predict/          # POST — triggers Claude prediction
    e2e/              # Test helpers (only active when E2E_TESTING=true)
  transactions/       # UI page
  goals/              # UI page
  charts/             # UI page
  login/              # Auth page
  layout.tsx          # Root layout with Navbar
  page.tsx            # Dashboard
components/           # Shared UI components (TransactionForm, GoalCard, etc.)
lib/
  supabase/
    server.ts         # Server-side Supabase client (use in API routes and Server Components)
    client.ts         # Browser Supabase client (use in Client Components)
  utils/              # Shared helpers
__tests__/
  unit/               # Jest unit tests
  integration/        # Jest integration tests (npm run test:integration)
  mocks/              # Shared mocks
e2e/                  # Playwright tests
supabase/
  schema.sql          # Full DB schema with RLS policies
```

## Environment Variables
Required in `.env.local` (never commit values):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
# E2E_TESTING=true        # Enable only for e2e test runs
# NEXT_PUBLIC_E2E_TESTING=true
```

## DB Tables: transactions, goals, predictions
- `transactions.mood` — optional emotional context field (`happy | stressed | bored | celebratory`); used by AI to detect stress-spending patterns
- `predictions` has a unique index on `(user_id, prediction_date)` — enforces the one-per-day cache at the DB level

## Rules
- Always use TypeScript strict mode
- Never hardcode API keys
- Use `lib/supabase/server.ts` in API routes and Server Components; use `lib/supabase/client.ts` in Client Components
- Cache AI predictions (once per day per user) to minimize API costs — check `predictions` table before calling Claude
