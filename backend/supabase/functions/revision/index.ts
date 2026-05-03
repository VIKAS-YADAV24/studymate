// Last Minute Revision — generate 30s / 2min / 5min revisions + memory hooks + highlights
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are StudyMate's Last Minute Revision coach for students who must revise quickly before an exam.
Given study material, return a structured revision in THREE progressively detailed time-boxed formats.

Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "thirtySecond": ["bullet1","bullet2",...],
  "twoMinute": ["bullet1","bullet2",...],
  "fiveMinute": [{"heading":"...","bullets":["...","..."]},...],
  "memoryHooks": ["Concept = catchy hook",...],
  "keywords": ["term1","term2",...],
  "definitions": [{"term":"...","definition":"..."},...]
}

Rules:
- thirtySecond: 3-5 ultra-short bullets, absolute must-know facts only.
- twoMinute: 5-8 bullets, each a short concept + 1-line plain explanation.
- fiveMinute: 4-6 mini-sections with heading + 2-4 bullets covering all major ideas.
- memoryHooks: 4-7 punchy exam shortcuts/mnemonics. Format like "Concept = catchy hook".
- keywords: 6-12 short technical terms students must recognise.
- definitions: 3-6 objects for the most important named concepts (definition <= 20 words).
- Be FAITHFUL to the source material. Do not invent facts.
- Use plain student-friendly language. Keep every bullet short and skimmable.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide at least 20 characters of study material." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const trimmed = content.length > 16000 ? content.slice(0, 16000) : content;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Study material:\n\n${trimmed}` }],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI API error: " + response.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("revision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
