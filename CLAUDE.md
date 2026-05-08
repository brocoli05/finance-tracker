@AGENTS.md

## Project: AI Finance Tracker
## Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase, Claude API
## Goal: Spending prediction web app - predict how much user will spend by end of month
## Key Features: Transaction CRUD, AI spending prediction, goal tracking, charts
## DB tables: transactions, goals, predictions
## Rules: 
- Always use TypeScript strict mode
- Never hardcode API keys
- Use Supabase server client in API routes, browser client in components
- Cache AI predictions (once per day per user) to minimize API costs
