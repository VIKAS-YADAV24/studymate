// Last Minute Revision — generate 30s / 2min / 5min revisions + memory hooks + highlights
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are StudyMate's Last Minute Revision coach for students who must revise quickly before an exam.
Given study material, return a structured revision in THREE progressively detailed time-boxed formats:

1. thirtySecond: 3-5 ultra-short bullet points, each 1 line max, capturing only the absolute must-know facts.
2. twoMinute: 5-8 bullet points, each one short concept + a 1-line plain explanation. Slightly more detail than 30s.
3. fiveMinute: 4-6 mini-sections, each with a short heading and 2-4 bullets covering all major ideas.

Also return:
- memoryHooks: 4-7 punchy one-liners that act like exam shortcuts / mnemonics. Format like "Concept = catchy hook". Example: "Photosynthesis = Sunlight → Food Factory".
- keywords: 6-12 short technical terms / definitions students must recognise.
- definitions: 3-6 objects {term, definition} for the most important named concepts (definition <= 20 words).

Rules:
- Be FAITHFUL to the source material. Do not invent facts.
- Use plain student-friendly language.
- Keep every bullet short and skimmable.
- Return ONLY the tool call.`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const trimmed = content.length > 16000 ? content.slice(0, 16000) : content;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Study material:\n\n${trimmed}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "produce_last_minute_revision",
              description: "Return time-boxed revisions plus memory hooks and keywords",
              parameters: {
                type: "object",
                properties: {
                  thirtySecond: { type: "array", items: { type: "string" } },
                  twoMinute: { type: "array", items: { type: "string" } },
                  fiveMinute: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["heading", "bullets"],
                      additionalProperties: false,
                    },
                  },
                  memoryHooks: { type: "array", items: { type: "string" } },
                  keywords: { type: "array", items: { type: "string" } },
                  definitions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        definition: { type: "string" },
                      },
                      required: ["term", "definition"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "thirtySecond",
                  "twoMinute",
                  "fiveMinute",
                  "memoryHooks",
                  "keywords",
                  "definitions",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "produce_last_minute_revision" } },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
