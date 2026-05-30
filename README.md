# AI-Powered Finance Tracker — Project Documentation

**Version:** 1.0  
**Author:** MJ Kim  
**Last Updated:** May 2026  
**Status:** Completed

---

## 1. Project Overview

### Problem Statement

Most budgeting apps (Mint, YNAB) only show *past* spending data. Users see what they already spent but receive no actionable signal about whether they are on track to overspend *this month*. The gap between historical data and forward-looking guidance leads to reactive rather than preventive financial behavior.

### Solution

A full-stack expense tracking web application that analyzes a user's last 30 days of transaction history to predict end-of-month total spending, flag goals at risk, and surface one specific saving suggestion — all computed locally with zero external API cost.

### Goals

- Provide a working full-stack portfolio project demonstrating end-to-end development capability
- Demonstrate test automation skills across unit, integration, and E2E layers
- Demonstrate CI/CD pipeline implementation using GitHub Actions
- Keep infrastructure cost under $5/month (Vercel + Supabase free tiers)

---

## 2. Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | User can sign up and log in with email and password |
| FR-02 | User can create, read, update, and delete income and expense transactions |
| FR-03 | Transactions are categorized (Payroll, Food, Rent, etc.) with subcategories |
| FR-04 | User can view transactions grouped by year and month with monthly subtotals |
| FR-05 | User can create, update, and delete savings goals with a target amount and deadline |
| FR-06 | System congratulates user and marks goal achieved when current savings reach target |
| FR-07 | Dashboard displays AI-generated prediction of end-of-month total spending |
| FR-08 | Prediction includes confidence level, goal-at-risk flag, and one saving suggestion |
| FR-09 | Charts display spending by daily, weekly, monthly, and yearly periods |
| FR-10 | User can export transaction data as a CSV file |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Prediction must run locally with no external API calls (cost = $0) |
| NFR-02 | All user data is isolated — users cannot access other users' data |
| NFR-03 | CI pipeline must pass before any deployment to production |
| NFR-04 | Application must run on Node.js 20+ |
| NFR-05 | Page load time under 3 seconds on standard broadband |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│         Next.js 15 App Router + React 19         │
│         Tailwind CSS + Recharts                  │
└────────────────────┬────────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────────┐
│              Next.js API Routes                  │
│   /api/transactions  /api/goals  /api/predict    │
│         Zod validation + Error handling          │
└──────────┬──────────────────────┬───────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼──────────────┐
│   Supabase (Cloud)  │  │  Prediction Engine     │
│   PostgreSQL DB     │  │  lib/ai/prediction     │
│   Auth (JWT)        │  │  Engine.ts             │
│   Row Level Security│  │  Pure TypeScript       │
│                     │  │  No external API       │
└─────────────────────┘  └───────────────────────┘
```

### Tech Stack

| Layer | Technology | Reason for Choice |
|-------|-----------|-------------------|
| Frontend | Next.js 15, React 19 | App Router for server components, industry standard |
| Language | TypeScript (strict) | Type safety, better maintainability, industry expectation |
| Styling | Tailwind CSS | Rapid UI development, no context switching |
| Charts | Recharts | React-native, lightweight, good TypeScript support |
| Backend | Next.js API Routes | Co-located with frontend, no separate server needed |
| Database | Supabase (PostgreSQL) | Free tier, built-in Auth, Row Level Security |
| Validation | Zod | Runtime type safety on API inputs |
| AI/Prediction | Local TypeScript engine | Zero cost, fully testable pure functions |
| Deployment | Vercel | GitHub integration, automatic preview deployments |
| CI/CD | GitHub Actions | Native GitHub integration, free for public repos |

---

## 4. Database Design

### Tables

**transactions**
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
amount          DECIMAL(10,2)
type            VARCHAR  -- 'income' | 'expense'
category        VARCHAR  -- e.g. 'Food', 'Payroll'
subcategory     VARCHAR  -- e.g. 'Groceries', 'Dining Out'
description     TEXT
date            DATE
mood            VARCHAR  -- 'happy' | 'stressed' | 'bored' | 'celebratory'
created_at      TIMESTAMPTZ
```

**goals**
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
title           VARCHAR(100)
target_amount   DECIMAL(10,2)
current_amount  DECIMAL(10,2) DEFAULT 0
deadline        DATE
category        VARCHAR
is_achieved     BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ
```

**predictions** *(cache table)*
```sql
id                    UUID PRIMARY KEY
user_id               UUID REFERENCES auth.users
prediction_date       DATE
predicted_month_total DECIMAL(10,2)
goal_at_risk          BOOLEAN
confidence_level      VARCHAR  -- 'high' | 'medium' | 'low'
suggestion            TEXT
created_at            TIMESTAMPTZ
```

### Security: Row Level Security (RLS)

All three tables have RLS policies enforcing:
```sql
-- Users can only SELECT, INSERT, UPDATE, DELETE their own rows
USING (auth.uid() = user_id)
```

This means even if an API route had a bug and forgot to filter by user, the database itself rejects unauthorized access.

---

## 5. Authentication Design

### Approach: Supabase Auth (JWT-based)

**Why Supabase Auth instead of building custom auth:**
- No password hashing logic to write or audit
- JWT tokens issued and verified by Supabase's auth server
- Session stored in browser cookies, automatically refreshed
- `auth.users` table managed internally by Supabase — developers never touch raw passwords

**Login Flow:**
```
1. User submits email + password
2. Supabase Auth server verifies credentials against auth.users
3. JWT access token + refresh token issued
4. Tokens stored in browser cookies via @supabase/ssr
5. Every API route calls supabase.auth.getUser() to extract user.id
6. user.id used in all DB queries to scope data
7. RLS provides a second layer of enforcement at DB level
```

**Why @supabase/ssr package:**
- Handles cookie management in Next.js server components and API routes
- Separates browser client (components) from server client (API routes)
- Prevents token leakage between server and client contexts

---

## 6. AI Prediction Engine

### Design Decision: Local Engine vs External API

| Option | Cost | Testability | Reliability |
|--------|------|-------------|-------------|
| Claude API | ~$1-3/month | Requires mocking | Depends on network |
| Local TypeScript engine | $0 | Pure functions, no mocks needed | Always available |

**Chose local engine** for portfolio context: zero cost, fully deterministic, easier to unit test.

### Algorithm

```typescript
// Inputs: transactions[], goals[]
// Output: PredictionResult

1. Filter transactions to current month
2. Calculate: spentThisMonth = sum of expense transactions
3. Calculate: dailyAverage = spentThisMonth / currentDayOfMonth
4. Project: predictedMonthTotal = dailyAverage * daysInMonth
5. Find: topCategory = category with highest total spend
6. Determine: goalAtRisk = predictedMonthTotal > any active goal target
7. Set confidenceLevel:
   - day >= 20 → 'high'   (most of month elapsed, reliable data)
   - day >= 10 → 'medium'
   - day < 10  → 'low'    (too early, few data points)
8. Generate suggestion:
   "Your highest spending is [topCategory] at $[amount].
    Reducing it by 20% saves ~$[estimatedSavings] this month."
```

### Caching Strategy

Prediction is computed once per day and cached in the `predictions` table. On subsequent requests the same day, the cached result is returned immediately. This pattern was designed to support a future Claude API integration where each call costs money.

---

## 7. Test Strategy

### Test Pyramid

```
        /\
       /E2E\        Playwright + Cypress
      /------\      (fewer, slower, full browser)
     /  Integ  \    Jest + Supertest
    /------------\  (API routes with mocked DB)
   /     Unit     \ Jest
  /----------------\(pure functions, components)
```

### Unit Tests — Jest

**What is tested:**
- `predictionEngine.ts` — all calculation functions in isolation
- `groupTransactions.ts` — date grouping and sorting logic
- `TransactionForm` component — rendering, validation, type toggle
- `GoalCard` component — progress percentage, congratulations trigger

**Example test cases:**
```
calculateDailyAverage()
  ✓ returns 0 when no transactions exist
  ✓ calculates correctly with single transaction
  ✓ ignores income transactions, counts only expenses
  ✓ divides by correct number of elapsed days

GoalCard
  ✓ shows congratulations alert when current >= target
  ✓ progress bar shows 50% when current is half of target
  ✓ shows "0 days remaining" when deadline is today
```

**Why unit tests here:**  
Prediction logic and date math are pure functions with no side effects — ideal candidates for unit testing. Fast feedback, no DB or network needed.

### Integration Tests — Jest + node-mocks-http

**What is tested:**
- `GET /api/transactions` — returns 200 with array
- `POST /api/transactions` — validates input, returns 201
- `POST /api/transactions` — missing amount returns 400
- `DELETE /api/transactions/[id]` — wrong user returns 403
- `GET /api/predict` — returns cached result if today's exists
- `GET /api/predict` — generates new prediction when no cache
- Full CRUD cycle for goals API

**Mocking strategy:**
```typescript
// Supabase is mocked at the module level
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }}) },
    from: jest.fn().mockReturnValue({ select: ..., insert: ..., delete: ... })
  })
}))
```

**Why integration tests here:**  
API routes involve multiple layers (auth check → validation → DB query → response formatting). Unit testing each layer separately would miss interaction bugs. Integration tests verify the full route behavior without a real database.

### E2E Tests — Playwright

**What is tested:**
- User sign up and login flow
- Adding an expense transaction and seeing it appear in the list
- Editing and deleting a transaction
- Creating a goal and adding progress
- Congratulations alert when goal is reached
- AI prediction card loads on dashboard
- Navigation between all pages

**Configuration:**
- Runs against `localhost:3000` (dev server started in CI)
- Tests run on Chromium, Firefox, and WebKit
- Screenshots captured on failure
- Video recorded on retry

### E2E Tests — Cypress

**What is tested:**
- Dashboard layout and section visibility
- Chart tab switching (Daily / Weekly / Monthly / Yearly)
- CSV export downloads a file
- Sign out flow

**Why both Playwright and Cypress:**  
Demonstrates familiarity with both tools. In practice, one would be chosen — Playwright for its multi-browser support and speed, Cypress for its developer experience and time-travel debugging.

### Test Coverage Target

| Layer | Target Coverage |
|-------|----------------|
| Unit (prediction engine) | 90%+ |
| Unit (components) | 70%+ |
| Integration (API routes) | 80%+ |
| E2E (critical paths) | 100% of happy paths |

---

## 8. CI/CD Pipeline

### GitHub Actions Workflow

```
Trigger: push to main, pull_request to main

Job 1: unit-tests
  → actions/setup-node@v4 (Node 20)
  → npm ci
  → npm run test:unit
  → upload coverage report

Job 2: integration-tests (needs: unit-tests)
  → npm ci
  → inject GitHub Secrets as environment variables
  → npm run test:integration

Job 3: e2e-playwright (needs: integration-tests)
  → npm ci
  → npx playwright install --with-deps
  → start Next.js dev server (background)
  → wait-on http://localhost:3000
  → npm run test:e2e
  → upload Playwright HTML report on failure

Job 4: deploy (needs: e2e-playwright)
  → trigger Vercel deployment
  → only runs if all previous jobs pass
```

### Key CI/CD Decisions

**Why `npm ci` instead of `npm install` in CI:**  
`npm ci` requires `package-lock.json` to be in sync with `package.json`. This prevents "works on my machine" bugs caused by different dependency versions being installed in CI vs locally.

**Why secrets instead of hardcoded values:**  
Environment variables like `SUPABASE_URL` and API keys are stored in GitHub repository Secrets, never in code. The `.env.local` file is in `.gitignore` and never committed.

**Lesson learned during development:**  
Running `npm audit fix --force` automatically downgraded Next.js from 15 to 9 — a breaking change. This rule is now documented in `CLAUDE.md` to prevent recurrence. Moderate severity audit warnings for internal Next.js dependencies (postcss) are explicitly acknowledged and ignored.

### Jenkins Pipeline (Jenkinsfile)

Declarative pipeline with stages:
1. Checkout
2. Install (`npm ci`)
3. Lint (`npm run lint`)
4. Unit Tests (publishes JUnit XML results)
5. Integration Tests
6. Build (`npm run build`)
7. E2E Tests (publishes HTML report)
8. Security Scan (`npm audit` — fails on high severity only)

---

## 9. Key Technical Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Supabase URL had `/rest/v1` appended, causing auth 404 | Fixed `.env.local` to use base project URL only |
| `testPathPattern` deprecated in latest Jest | Updated to `testPathPatterns` (plural) in all scripts |
| `jest.config.ts` requires `ts-node` in CI | Converted to `jest.config.js` (CommonJS) |
| CI used Node 18, Next.js 15 requires Node 20 | Updated all `setup-node` steps to `node-version: 20` |
| `npm audit fix --force` broke Next.js version | Documented in CLAUDE.md; restored with `--legacy-peer-deps` |
| `package-lock.json` not committed after adding `jest-junit` | Rule added to CLAUDE.md: always commit lock file with package changes |

---

## 10. Project Structure

```
finance-tracker/
├── app/
│   ├── api/
│   │   ├── transactions/route.ts     # GET, POST
│   │   ├── transactions/[id]/route.ts # PUT, DELETE
│   │   ├── goals/route.ts
│   │   ├── goals/[id]/route.ts
│   │   └── predict/route.ts          # Prediction with caching
│   ├── dashboard/page.tsx
│   ├── transactions/page.tsx
│   ├── goals/page.tsx
│   ├── charts/page.tsx
│   └── login/page.tsx
├── components/
│   ├── TransactionForm.tsx
│   ├── GoalCard.tsx
│   ├── GoalForm.tsx
│   ├── PredictionCard.tsx
│   └── SpendingChart.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── ai/predictionEngine.ts
├── __tests__/
│   ├── unit/
│   └── integration/
├── e2e/
│   ├── playwright/
│   └── cypress/
├── .github/workflows/ci.yml
├── Jenkinsfile
├── CLAUDE.md
└── supabase/schema.sql
```
