# Movu — CLAUDE.md

## Project Overview
Movu is a web-based fitness intelligence platform for boutique fitness users in CDMX. It aggregates workout activity, sleep, and body composition data and uses AI to generate personalized weekly training plans and recovery recommendations.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Database: TBD (Supabase preferred for Phase 1)
- Auth: TBD (Supabase Auth preferred)

## App Structure
- `/app` — Next.js App Router pages
- `/components` — Reusable UI components
- `/lib` — Utilities, API clients, helpers
- `/types` — TypeScript type definitions

## Key Screens (Phase 1)
1. Dashboard — weekly training view, today's metrics (sleep, calories, minutes), AI insight card
2. Activity Log — form to register workout (type, class name, studio, duration, calories, distance)
3. My Plan — weekly training table by day and muscle group, AI-generated plan explanation
4. Profile — user goals, InBody data (muscle mass, body fat %)

## AI Integration
- Uses Claude API to generate weekly training plans based on user data
- Prompt inputs: goals, weekly activity log, sleep data, InBody metrics
- Output: structured weekly plan + insight/recommendation text

## Design Principles
- Dark background, vibrant accent color (green neon or electric blue)
- Dashboard SaaS layout: fixed sidebar + main content area
- Cards for metrics, clean forms, modern sans-serif typography
- Mobile-responsive but desktop-first

## Development Notes
- All API keys go in `.env.local` (never commit)
- Run `npm run dev` to start local server
- Prioritize shipping over perfection in Phase 1
