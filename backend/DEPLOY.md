# Deploying Edge Functions

## The Problem
The original code used `ai.gateway.lovable.dev` which only works when hosted on Lovable.
This project has been updated to use the **Anthropic API directly**.

## Setup Steps

### 1. Get an Anthropic API Key
Go to https://console.anthropic.com/ → API Keys → Create Key

### 2. Set the secret in Supabase
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Deploy the edge functions
```bash
supabase functions deploy summarize
supabase functions deploy chat
supabase functions deploy quiz
supabase functions deploy revision
supabase functions deploy generate-flowchart
supabase functions deploy medical-report
```

Or deploy all at once:
```bash
supabase functions deploy
```

### 4. Verify
Check the Supabase dashboard → Edge Functions → each function should show as "Active".

## Models Used
- Most functions: `claude-haiku-4-5` (fast, cheap)
- Medical report with image: `claude-sonnet-4-6` (better vision)

## Per-User API Keys
Users can optionally supply their own Anthropic API key via Settings in the app.
This is sent as the `x-user-api-key` header and takes priority over the server key.
