# StudyMate

AI-powered study assistant: upload notes → get summaries, flowcharts, quizzes, revision flashcards, and a chat tutor.

## Structure

```
studymate/
├── frontend/          # React + Vite + Tailwind (deploy to Vercel)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── vercel.json
│   ├── .env.example
│   └── package.json
├── backend/           # Supabase Edge Functions (Deno) — deployed on Lovable Cloud
│   ├── supabase/
│   │   ├── config.toml
│   │   └── functions/
│   │       ├── chat/
│   │       ├── summarize/
│   │       ├── generate-flowchart/
│   │       ├── quiz/
│   │       ├── revision/
│   │       └── medical-report/
│   ├── .env.example
│   └── README.md
├── package.json       # root scripts
└── README.md
```

## Quick start

```bash
# Install frontend deps
npm install --prefix frontend

# Copy env template and fill in values
cp frontend/.env.example frontend/.env

# Run dev server
npm run dev
```

Visit http://localhost:8080

## Environment variables

### Frontend (`frontend/.env`)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Lovable Cloud / Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon (publishable) key — safe in client |
| `VITE_SUPABASE_PROJECT_ID` | Project ref, used to build edge function URLs |

### Backend (Supabase secrets — set in Lovable Cloud dashboard, not committed)
| Variable | Purpose |
|---|---|
| `LOVABLE_API_KEY` | AI Gateway key (auto-provisioned by Lovable Cloud) |
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |

## Deployment

### Frontend → Vercel
1. Push the `studymate/` repo to GitHub.
2. On https://vercel.com/new → **Import** your repo.
3. Set **Root Directory** to `frontend`.
4. Framework preset auto-detects as **Vite**. Build command: `npm run build`. Output: `dist`.
5. Add environment variables (the three `VITE_*` from above).
6. Deploy. Vercel will give you a `*.vercel.app` URL.

### Backend → Lovable Cloud (already done)
The Edge Functions in `backend/supabase/functions/` are already deployed on Lovable Cloud.
- **No Render / no Express server needed.** Lovable Cloud hosts the Deno functions, handles TLS, CORS (configured per function), and auto-scaling.
- To redeploy after edits, push through Lovable, or run `supabase functions deploy <name>` with the Supabase CLI.

### CORS
Each function in `backend/supabase/functions/*/index.ts` already sets:
```ts
"Access-Control-Allow-Origin": "*"
```
To restrict to your Vercel domain in production, replace `"*"` with `"https://your-app.vercel.app"` in each function's `corsHeaders`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run backend:serve` | Run Edge Functions locally (requires Supabase CLI) |
| `npm run backend:deploy` | Deploy all Edge Functions (requires `SUPABASE_PROJECT_REF`) |

## Scalability & maintainability suggestions

1. **Persist study sessions** — currently in `localStorage`. Add a `notes` table in Lovable Cloud + RLS so users can access notes across devices.
2. **Add authentication** — gate the app behind email/Google sign-in to enable per-user history and prevent quota abuse.
3. **Rate-limit edge functions** — add a simple per-IP / per-user counter using a Supabase table to prevent runaway AI spend.
4. **Cache AI responses** — hash the input content + endpoint and cache the response in a `ai_cache` table; saves repeat calls.
5. **Lock down CORS** in production to your Vercel domain only.
6. **Monitoring** — use Lovable Cloud's edge function logs (`supabase functions logs <name>`) to track latency and errors.
7. **Split large components** — `QuizPlayer.tsx` and similar files can be broken into smaller hooks/subcomponents as features grow.
8. **Add E2E tests** — Playwright tests for the upload → summary → quiz flow.

## Tech
- React 18, Vite 5, TypeScript 5, Tailwind v3, shadcn/ui
- Supabase Edge Functions (Deno), Lovable Cloud, Lovable AI Gateway (Gemini / GPT models)
