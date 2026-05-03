// Generate quiz questions from a topic or pasted study text, with difficulty levels.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy: "Easy: focus on recall — definitions, names, simple facts. Plain language. Distractors should be obviously different. Explanations are 1 sentence.",
  medium: "Medium: focus on understanding — applying concepts, simple comparisons, cause-and-effect. Distractors should be plausible. Explanations are 1-2 sentences.",
  hard: "Hard: focus on analysis and synthesis — multi-step reasoning, edge cases, subtle distinctions, scenario application. Distractors should be tempting and similar. Explanations are 2-3 sentences and include the underlying principle.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, difficulty = "medium", numQuestions = 5 } = await req.json();
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Please provide a topic or some study text (at least 3 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const diffKey = String(difficulty).toLowerCase();
    if (!DIFFICULTY_GUIDE[diffKey]) {
      return new Response(JSON.stringify({ error: "difficulty must be easy | medium | hard" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const n = Math.max(3, Math.min(20, Number(numQuestions) || 5));

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const trimmed = topic.length > 14000 ? topic.slice(0, 14000) : topic;

    const systemPrompt = `You are an expert quiz writer for students. Generate exactly ${n} multiple-choice questions about the user's topic or text.

Difficulty rules:
${DIFFICULTY_GUIDE[diffKey]}

Hard requirements:
- Each question has EXACTLY 4 options.
- Exactly ONE correct option. Set "correctIndex" to the 0-based index of the correct option.
- Options must be distinct and not contain the letters A) B) C) D) — they're plain strings.
- Provide a brief "explanation" describing why the correct option is right.
- Stay accurate. Don't invent facts about a specific text — only ask about what's in it.
- Return ONLY valid JSON in this exact shape, no markdown fences:
{"title":"...","questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: `Topic / source text:\n\n${trimmed}` }],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ ...parsed, difficulty: diffKey }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
