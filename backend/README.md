# StudyMate Backend — Supabase Edge Functions

This backend uses **Supabase Edge Functions** (Deno runtime), deployed on **Lovable Cloud**.
There is **no separate Node/Express or Render server** — the functions auto-deploy when you push changes through Lovable, or via the Supabase CLI.

## Functions
- `chat` — streamed Q&A over uploaded study material
- `summarize` — generates summary + key points
- `generate-flowchart` — Mermaid.js diagram from key points
- `quiz` — multiple-choice quiz generator
- `revision` — flashcard / revision content
- `medical-report` — structured medical report extraction

All functions call the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev`) using `LOVABLE_API_KEY`.

## Local development (optional)
```bash
npm i -g supabase
supabase login
supabase functions serve --env-file ./.env
```

## Deploy
Functions deploy automatically when changes are pushed via Lovable. Manual deploy:
```bash
supabase functions deploy chat
supabase functions deploy summarize
supabase functions deploy generate-flowchart
supabase functions deploy quiz
supabase functions deploy revision
supabase functions deploy medical-report
```

## Secrets
Set via Lovable Cloud dashboard or:
```bash
supabase secrets set LOVABLE_API_KEY=sk-...
```

## Why no Render / Express?
Edge Functions on Lovable Cloud handle scaling, CORS (already configured per function), and TLS automatically. Porting them to Express on Render would require rewriting from Deno → Node and managing a separate deployment, which has no benefit for this app.
