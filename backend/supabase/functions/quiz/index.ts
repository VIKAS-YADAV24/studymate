// Generate quiz questions from a topic or pasted study text, with difficulty levels.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy:
    "Easy: focus on recall — definitions, names, simple facts. Plain language. Distractors should be obviously different. Explanations are 1 sentence.",
  medium:
    "Medium: focus on understanding — applying concepts, simple comparisons, cause-and-effect. Distractors should be plausible. Explanations are 1-2 sentences.",
  hard:
    "Hard: focus on analysis and synthesis — multi-step reasoning, edge cases, subtle distinctions, scenario application. Distractors should be tempting and similar. Explanations are 2-3 sentences and include the underlying principle.",
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const trimmed = topic.length > 14000 ? topic.slice(0, 14000) : topic;

    const systemPrompt = `You are an expert quiz writer for students. Generate exactly ${n} multiple-choice questions about the user's topic or text.

Difficulty rules:
${DIFFICULTY_GUIDE[diffKey]}

Hard requirements:
- Each question has EXACTLY 4 options.
- Exactly ONE correct option. Set "correctIndex" to the 0-based index of the correct option.
- Options must be distinct and not contain the letters A) B) C) D) — they're plain strings.
- Provide a brief "explanation" describing why the correct option is right (and optionally why others are wrong).
- Stay accurate. Don't invent facts about a specific text — if the user pasted text, only ask about what's in it.
- Return ONLY the tool call.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic / source text:\n\n${trimmed}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "produce_quiz",
              description: "Return a structured quiz with multiple choice questions",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short title for the quiz" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4,
                        },
                        correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correctIndex", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "produce_quiz" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to your workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
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
